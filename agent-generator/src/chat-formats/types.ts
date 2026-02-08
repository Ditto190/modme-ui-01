/**
 * chat-formats/types.ts
 *
 * Type system for the Universal Chat Ingestion pipeline.
 *
 * Architecture:
 *   1. ChatFormatDescriptor — defines HOW to detect + extract a specific agent's chat format
 *   2. UniversalTurnPayload — the normalized output ALL formats converge to
 *   3. FieldMapping — declarative path mappings from agent format → universal format
 *
 * The schema-crawler pattern applies here:
 *   JSON Schema (chat format) → Zod fingerprint → detection + validation
 *   JSON Schema (field mapping) → extraction function → normalized turns
 *
 * AI builds these descriptors offline. The pipeline runs them with zero LLM calls.
 */

import { z } from 'zod';

// ============================================================================
// UNIVERSAL TURN FORMAT — the contract between n8n and the Python bridge
// ============================================================================

/**
 * A single tool invocation within a turn
 */
export const ToolCallSchema = z.object({
  name: z.string().describe('Tool/function name (e.g., "read_file", "search")'),
  input: z.string().optional().describe('Stringified input/arguments'),
  output: z.string().optional().describe('Stringified result/output'),
  round: z.number().int().optional().describe('Which round of tool calling (0-indexed)'),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

/**
 * Token usage for a single turn
 */
export const TokenUsageSchema = z.object({
  prompt: z.number().int().default(0),
  completion: z.number().int().default(0),
  total: z.number().int().optional(),
});

export type TokenUsage = z.infer<typeof TokenUsageSchema>;

/**
 * A single conversation turn in the universal format
 */
export const UniversalTurnSchema = z.object({
  index: z.number().int().describe('Turn position in conversation (0-indexed)'),
  userMessage: z.string().describe('The human input text'),
  assistantResponse: z.string().describe('The assistant output text'),
  model: z.string().default('unknown').describe('Model identifier (e.g., "claude-sonnet-4-20250514")'),
  timestampMs: z.number().int().optional().describe('Unix timestamp in milliseconds'),
  latencyMs: z.number().int().optional().describe('Total response time in ms'),
  tokens: TokenUsageSchema.optional(),
  toolCalls: z.array(ToolCallSchema).default([]),
  thinking: z.string().optional().describe('Chain-of-thought / reasoning text'),
  metadata: z.record(z.any()).default({}).describe('Agent-specific metadata preserved as-is'),
});

export type UniversalTurn = z.infer<typeof UniversalTurnSchema>;

/**
 * The complete payload sent from n8n → Python bridge /ingest
 */
export const UniversalTurnPayloadSchema = z.object({
  /** Which format was detected (registry key) */
  format: z.string().describe('Detected format ID (e.g., "copilot-chat", "claude-code")'),
  /** The AI agent that produced this chat */
  agent: z.string().describe('Agent name (e.g., "GitHub Copilot", "Claude Code")'),
  /** Phoenix project name */
  projectName: z.string().default('chat-traces'),
  /** Session identifier (if available) */
  sessionId: z.string().optional(),
  /** Responder/user identity */
  responder: z.string().optional(),
  /** The normalized conversation turns */
  turns: z.array(UniversalTurnSchema).min(1),
});

export type UniversalTurnPayload = z.infer<typeof UniversalTurnPayloadSchema>;

// ============================================================================
// FIELD MAPPING — declarative paths from agent format → universal format
// ============================================================================

/**
 * A dot-notation path into a JSON object (e.g., "result.metadata.sessionId")
 *
 * Supports:
 *   "field"               — direct property
 *   "nested.field"        — nested property
 *   "array[].field"       — map over array items
 *   null                  — field not available in this format
 */
export type FieldPath = string | null;

/**
 * Declarative mapping from an agent's chat format to the universal format.
 *
 * Each field tells the normalizer WHERE to find the data in the source JSON.
 * The normalizer walks these paths to extract values.
 */
export const FieldMappingSchema = z.object({
  /** Path to the array of conversation turns */
  turns: z.string().describe('Path to turns array (e.g., "requests")'),

  /** Paths within each turn */
  turn: z.object({
    userMessage: z.string().describe('Path to user input text'),
    assistantResponse: z.string().nullable().describe('Path to assistant text, or null if assembled from parts'),
    model: z.string().nullable().default(null),
    timestamp: z.string().nullable().default(null),
    latencyMs: z.string().nullable().default(null),
    thinking: z.string().nullable().default(null),

    tokens: z.object({
      prompt: z.string().nullable().default(null),
      completion: z.string().nullable().default(null),
    }).default({ prompt: null, completion: null }),

    toolCalls: z.object({
      /** Path to tool call rounds/array */
      path: z.string().nullable().default(null),
      /** Within each tool call, path to the name */
      name: z.string().default('name'),
      /** Within each tool call, path to arguments/input */
      input: z.string().default('arguments'),
      /** Within each tool call, path to result/output */
      output: z.string().default('result'),
    }).default({ path: null, name: 'name', input: 'arguments', output: 'result' }),
  }),

  /** Top-level metadata paths (outside individual turns) */
  global: z.object({
    sessionId: z.string().nullable().default(null),
    responder: z.string().nullable().default(null),
    agent: z.string().nullable().default(null),
  }).default({ sessionId: null, responder: null, agent: null }),
});

export type FieldMapping = z.infer<typeof FieldMappingSchema>;

// ============================================================================
// CHAT FORMAT DESCRIPTOR — the complete "how to handle this format" definition
// ============================================================================

/**
 * Fingerprint rule — a key that must exist with a specific type/value pattern.
 *
 * These are used to detect which agent produced a chat file WITHOUT parsing
 * the entire document. Just check top-level structure.
 */
export const FingerprintRuleSchema = z.object({
  /** JSONPath-like key to check (dot notation for nested) */
  path: z.string(),
  /** What to check for */
  check: z.enum([
    'exists',           // Field exists (not undefined)
    'type_string',      // typeof value === 'string'
    'type_number',      // typeof value === 'number'
    'type_array',       // Array.isArray(value)
    'type_object',      // typeof value === 'object' && !Array.isArray
    'equals',           // value === expectedValue
    'matches',          // String matches regex pattern
    'has_key',          // Object has specific key in its children
  ]),
  /** Expected value (for 'equals' check) or regex pattern (for 'matches') */
  value: z.any().optional(),
});

export type FingerprintRule = z.infer<typeof FingerprintRuleSchema>;

/**
 * Complete descriptor for one agent chat format.
 *
 * This is the artifact that schema-crawler + AI generates offline.
 * At runtime, the pipeline uses this to detect, extract, and normalize.
 */
export const ChatFormatDescriptorSchema = z.object({
  /** Unique identifier for this format */
  id: z.string().describe('Format ID (e.g., "copilot-chat", "claude-code")'),

  /** Human-readable name */
  name: z.string().describe('Display name (e.g., "VS Code Copilot Chat")'),

  /** The AI agent that produces this format */
  agent: z.string().describe('Agent name for Phoenix metadata'),

  /** Version of this descriptor (for evolution tracking) */
  version: z.string().default('1.0.0'),

  /** Structural fingerprint rules — ALL must pass to match */
  fingerprint: z.array(FingerprintRuleSchema).min(1),

  /** Field mapping for extraction */
  fieldMapping: FieldMappingSchema,

  /**
   * Whether the assistant response requires assembly from multiple parts.
   * If true, the normalizer uses a custom assembler instead of a simple path lookup.
   *
   * VS Code Copilot: true (response is an array of {kind, value} objects)
   * Claude Code: false (response is a string field)
   * ChatGPT: false (content is a string)
   */
  requiresResponseAssembly: z.boolean().default(false),

  /**
   * Whether tool calls are nested in rounds (Copilot) vs flat array (most others)
   */
  toolCallsNested: z.boolean().default(false),

  /** Priority for fingerprint matching (higher = checked first) */
  priority: z.number().int().default(50),

  /** Status of this format descriptor */
  status: z.enum(['stable', 'beta', 'experimental', 'deprecated']).default('beta'),
});

export type ChatFormatDescriptor = z.infer<typeof ChatFormatDescriptorSchema>;

// ============================================================================
// REGISTRY TYPE — collection of all known format descriptors
// ============================================================================

export const ChatFormatRegistrySchema = z.object({
  version: z.string(),
  lastUpdated: z.string().describe('ISO 8601 timestamp'),
  formats: z.array(ChatFormatDescriptorSchema),
});

export type ChatFormatRegistry = z.infer<typeof ChatFormatRegistrySchema>;

// ============================================================================
// DETECTION + NORMALIZATION RESULT TYPES
// ============================================================================

export interface DetectionResult {
  matched: boolean;
  formatId: string | null;
  descriptor: ChatFormatDescriptor | null;
  confidence: 'exact' | 'partial' | 'none';
  /** Which fingerprint rules passed/failed */
  ruleResults: Array<{ rule: FingerprintRule; passed: boolean }>;
}

export interface NormalizationResult {
  success: boolean;
  payload: UniversalTurnPayload | null;
  errors: string[];
  warnings: string[];
  /** Stats for diagnostics */
  stats: {
    totalTurns: number;
    extractedTurns: number;
    skippedTurns: number;
    toolCallsFound: number;
  };
}
