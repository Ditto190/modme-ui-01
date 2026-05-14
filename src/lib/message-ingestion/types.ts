/**
 * Message Ingestion Types
 *
 * Type-safe definitions for ingesting AI agent chat responses from multiple providers.
 * Supports Claude, OpenAI, CopilotKit, n8n, and custom formats.
 */

import { z } from "zod";

// ============================================================================
// Provider Types
// ============================================================================

export type AIProvider = "claude" | "openai" | "copilotkit" | "n8n" | "custom" | "unknown";

// ============================================================================
// Claude Message Schemas (Anthropic API)
// ============================================================================

export const ClaudeTextContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const ClaudeToolUseSchema = z.object({
  type: z.literal("tool_use"),
  id: z.string(),
  name: z.string(),
  input: z.record(z.unknown()),
});

export const ClaudeToolResultSchema = z.object({
  type: z.literal("tool_result"),
  tool_use_id: z.string(),
  content: z.union([z.string(), z.array(z.unknown()), z.unknown()]),
  is_error: z.boolean().optional(),
});

export const ClaudeThinkingBlockSchema = z.object({
  type: z.literal("thinking"),
  thinking: z.string(),
});

export const ClaudeContentBlockSchema = z.union([
  ClaudeTextContentSchema,
  ClaudeToolUseSchema,
  ClaudeToolResultSchema,
  ClaudeThinkingBlockSchema,
]);

export const ClaudeMessageSchema = z.object({
  id: z.string().optional(),
  type: z.literal("message").optional(),
  role: z.enum(["user", "assistant"]),
  content: z.union([z.string(), z.array(ClaudeContentBlockSchema)]),
  model: z.string().optional(),
  stop_reason: z.enum(["end_turn", "max_tokens", "stop_sequence", "tool_use"]).optional(),
  stop_sequence: z.string().optional(),
  usage: z
    .object({
      input_tokens: z.number(),
      output_tokens: z.number(),
    })
    .optional(),
});

export type ClaudeMessage = z.infer<typeof ClaudeMessageSchema>;
export type ClaudeContentBlock = z.infer<typeof ClaudeContentBlockSchema>;

// ============================================================================
// OpenAI Message Schemas
// ============================================================================

export const OpenAIToolCallSchema = z.object({
  id: z.string(),
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
    arguments: z.string(), // JSON string
  }),
});

export const OpenAIMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["system", "user", "assistant", "tool", "function"]),
  content: z.union([z.string(), z.null()]).optional(),
  tool_calls: z.array(OpenAIToolCallSchema).optional(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
  function_call: z
    .object({
      name: z.string(),
      arguments: z.string(),
    })
    .optional(),
});

export type OpenAIMessage = z.infer<typeof OpenAIMessageSchema>;

// ============================================================================
// CopilotKit Message Schemas
// ============================================================================

export const CopilotKitTextMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  createdAt: z.union([z.string(), z.date()]).optional(),
});

export const CopilotKitActionExecutionSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.record(z.unknown()),
  status: z.enum(["pending", "executing", "complete", "error"]),
  result: z.unknown().optional(),
  error: z.string().optional(),
});

export const CopilotKitMessageSchema = z.union([
  CopilotKitTextMessageSchema,
  z.object({
    id: z.string(),
    role: z.literal("assistant"),
    actionExecution: CopilotKitActionExecutionSchema,
  }),
]);

export type CopilotKitMessage = z.infer<typeof CopilotKitMessageSchema>;

// ============================================================================
// n8n Webhook/Execution Response Schemas
// ============================================================================

export const N8nExecutionDataSchema = z.object({
  executionId: z.string(),
  workflowId: z.string(),
  data: z.unknown(),
  finished: z.boolean(),
  mode: z.enum(["manual", "trigger", "webhook"]),
  startedAt: z.string(),
  stoppedAt: z.string().optional(),
});

export const N8nWebhookResponseSchema = z.object({
  workflowId: z.string().optional(),
  executionId: z.string().optional(),
  data: z.unknown(),
  metadata: z.record(z.unknown()).optional(),
});

export type N8nExecutionData = z.infer<typeof N8nExecutionDataSchema>;
export type N8nWebhookResponse = z.infer<typeof N8nWebhookResponseSchema>;

// ============================================================================
// Unified Parsed Message Format
// ============================================================================

export interface ParsedMessage {
  id: string;
  provider: AIProvider;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  metadata: MessageMetadata;
  rawMessage: unknown;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
  isError?: boolean;
}

export interface MessageMetadata {
  model?: string;
  tokens?: {
    input: number;
    output: number;
  };
  stopReason?: string;
  timestamp?: string;
  executionId?: string;
  [key: string]: unknown;
}

// ============================================================================
// Schema Registry Types
// ============================================================================

export interface MessageSchemaDefinition {
  provider: AIProvider;
  version?: string;
  zodSchema: z.ZodSchema;
  parser: (raw: unknown) => ParsedMessage;
  examples: unknown[];
  description: string;
}

export type SchemaRegistry = Map<AIProvider, MessageSchemaDefinition>;

// ============================================================================
// Ingestion Config
// ============================================================================

export interface IngestionConfig {
  /**
   * Pre-defined schema registry for known providers
   */
  schemaRegistry: SchemaRegistry;

  /**
   * Enable AI-powered schema discovery for unknown formats
   */
  discoveryFallback: boolean;

  /**
   * Caching strategy for discovered schemas
   */
  cacheStrategy: "memory" | "redis" | "none";

  /**
   * Validation strictness
   */
  validationMode: "strict" | "loose";

  /**
   * Maximum messages to process in one batch
   */
  batchSize?: number;

  /**
   * Timeout for discovery inference (ms)
   */
  discoveryTimeout?: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class MessageIngestionError extends Error {
  constructor(
    message: string,
    public readonly provider: AIProvider,
    public readonly rawMessage: unknown,
    public readonly validationErrors?: z.ZodError
  ) {
    super(message);
    this.name = "MessageIngestionError";
  }
}

export class SchemaDiscoveryError extends Error {
  constructor(
    message: string,
    public readonly sampleMessages: unknown[]
  ) {
    super(message);
    this.name = "SchemaDiscoveryError";
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export type IngestResult<T = ParsedMessage> =
  | { success: true; data: T }
  | { success: false; error: MessageIngestionError };

export type BatchIngestResult = {
  successful: ParsedMessage[];
  failed: Array<{
    raw: unknown;
    error: MessageIngestionError;
  }>;
  stats: {
    total: number;
    succeeded: number;
    failed: number;
  };
};
