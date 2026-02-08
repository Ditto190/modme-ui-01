/**
 * chat-formats/normalizer.ts
 *
 * Applies a ChatFormatDescriptor's field mappings to raw chat data,
 * producing a UniversalTurnPayload that the Python bridge can ingest.
 *
 * This is pure transformation code — no LLM calls, no network I/O.
 * The field mappings were generated offline by AI + schema-crawler.
 */

import type {
  ChatFormatDescriptor,
  FieldMapping,
  NormalizationResult,
  UniversalTurn,
  UniversalTurnPayload,
  ToolCall,
} from './types';
import { UniversalTurnPayloadSchema } from './types';
import { getByPath } from './fingerprint';

// ============================================================================
// RESPONSE ASSEMBLERS — format-specific logic for complex response structures
// ============================================================================

/**
 * Registry of custom response assemblers.
 *
 * Some formats (like VS Code Copilot) store responses as arrays of typed
 * objects ({kind, value}) rather than a simple string. These assemblers
 * know how to concatenate those parts into a single string.
 *
 * Key = format ID, Value = assembler function
 */
export type ResponseAssembler = (responses: any[]) => string;

const responseAssemblers: Map<string, ResponseAssembler> = new Map();

/**
 * Register a custom response assembler for a format.
 * Called during format registration (e.g., in copilot-chat.ts).
 */
export function registerResponseAssembler(
  formatId: string,
  assembler: ResponseAssembler
): void {
  responseAssemblers.set(formatId, assembler);
}

/**
 * Registry of custom thinking extractors.
 * Some formats store thinking/CoT in specific locations.
 */
export type ThinkingExtractor = (turn: any) => string;

const thinkingExtractors: Map<string, ThinkingExtractor> = new Map();

export function registerThinkingExtractor(
  formatId: string,
  extractor: ThinkingExtractor
): void {
  thinkingExtractors.set(formatId, extractor);
}

/**
 * Registry of custom tool call extractors.
 * Some formats nest tool calls in rounds, others have flat arrays.
 */
export type ToolCallExtractor = (turn: any) => ToolCall[];

const toolCallExtractors: Map<string, ToolCallExtractor> = new Map();

export function registerToolCallExtractor(
  formatId: string,
  extractor: ToolCallExtractor
): void {
  toolCallExtractors.set(formatId, extractor);
}

// ============================================================================
// GENERIC EXTRACTION
// ============================================================================

/**
 * Extract a string value from a turn using a field path.
 * Handles both direct string values and nested objects (returns JSON.stringify for objects).
 */
function extractString(turn: any, path: string | null): string {
  if (!path) return '';
  const value = getByPath(turn, path);
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

/**
 * Extract a number value from a turn using a field path.
 */
function extractNumber(turn: any, path: string | null): number | undefined {
  if (!path) return undefined;
  const value = getByPath(turn, path);
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/**
 * Generic tool call extraction using field mapping paths.
 * Used when no custom extractor is registered.
 */
function extractToolCallsGeneric(turn: any, mapping: FieldMapping): ToolCall[] {
  const tcMapping = mapping.turn.toolCalls;
  if (!tcMapping.path) return [];

  const rawCalls = getByPath(turn, tcMapping.path);
  if (!Array.isArray(rawCalls)) return [];

  return rawCalls.map((tc: any) => ({
    name: extractString(tc, tcMapping.name),
    input: extractString(tc, tcMapping.input),
    output: extractString(tc, tcMapping.output),
  }));
}

// ============================================================================
// NORMALIZER — the main transformation function
// ============================================================================

/**
 * Normalize raw chat data into the Universal Turn Format.
 *
 * @param data - Raw chat JSON (the entire file content)
 * @param descriptor - The matched ChatFormatDescriptor
 * @param projectName - Phoenix project name override
 */
export function normalize(
  data: any,
  descriptor: ChatFormatDescriptor,
  projectName?: string
): NormalizationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const mapping = descriptor.fieldMapping;

  // Extract the turns array
  const rawTurns = getByPath(data, mapping.turns);
  if (!Array.isArray(rawTurns)) {
    return {
      success: false,
      payload: null,
      errors: [`No turns array found at path "${mapping.turns}"`],
      warnings: [],
      stats: { totalTurns: 0, extractedTurns: 0, skippedTurns: 0, toolCallsFound: 0 },
    };
  }

  // Extract global metadata
  const sessionId = extractString(data, mapping.global.sessionId) || undefined;
  const responder = extractString(data, mapping.global.responder) || undefined;
  const agentName = extractString(data, mapping.global.agent) || descriptor.agent;

  // Get custom extractors if registered
  const responseAssembler = responseAssemblers.get(descriptor.id);
  const thinkingExtractor = thinkingExtractors.get(descriptor.id);
  const toolCallExtractor = toolCallExtractors.get(descriptor.id);

  const turns: UniversalTurn[] = [];
  let toolCallsFound = 0;
  let skippedTurns = 0;

  for (let i = 0; i < rawTurns.length; i++) {
    const rawTurn = rawTurns[i];

    try {
      // Extract user message
      const userMessage = extractString(rawTurn, mapping.turn.userMessage);
      if (!userMessage.trim()) {
        skippedTurns++;
        warnings.push(`Turn ${i}: empty user message, skipped`);
        continue;
      }

      // Extract assistant response
      let assistantResponse: string;
      if (descriptor.requiresResponseAssembly && responseAssembler) {
        const responseParts = getByPath(rawTurn, mapping.turn.assistantResponse || 'response');
        assistantResponse = Array.isArray(responseParts)
          ? responseAssembler(responseParts)
          : extractString(rawTurn, mapping.turn.assistantResponse);
      } else {
        assistantResponse = extractString(rawTurn, mapping.turn.assistantResponse);
      }

      // Extract tool calls
      let toolCalls: ToolCall[];
      if (toolCallExtractor) {
        toolCalls = toolCallExtractor(rawTurn);
      } else {
        toolCalls = extractToolCallsGeneric(rawTurn, mapping);
      }
      toolCallsFound += toolCalls.length;

      // Extract thinking/CoT
      let thinking: string | undefined;
      if (thinkingExtractor) {
        thinking = thinkingExtractor(rawTurn) || undefined;
      } else if (mapping.turn.thinking) {
        thinking = extractString(rawTurn, mapping.turn.thinking) || undefined;
      }

      // Extract tokens
      const promptTokens = extractNumber(rawTurn, mapping.turn.tokens.prompt);
      const completionTokens = extractNumber(rawTurn, mapping.turn.tokens.completion);
      const tokens = (promptTokens !== undefined || completionTokens !== undefined)
        ? {
            prompt: promptTokens || 0,
            completion: completionTokens || 0,
            total: (promptTokens || 0) + (completionTokens || 0),
          }
        : undefined;

      // Build the universal turn
      const turn: UniversalTurn = {
        index: i,
        userMessage,
        assistantResponse,
        model: extractString(rawTurn, mapping.turn.model) || 'unknown',
        timestampMs: extractNumber(rawTurn, mapping.turn.timestamp),
        latencyMs: extractNumber(rawTurn, mapping.turn.latencyMs),
        tokens,
        toolCalls,
        thinking,
        metadata: {},
      };

      turns.push(turn);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Turn ${i}: extraction failed — ${msg}`);
      skippedTurns++;
    }
  }

  if (turns.length === 0) {
    return {
      success: false,
      payload: null,
      errors: [...errors, 'No turns could be extracted'],
      warnings,
      stats: {
        totalTurns: rawTurns.length,
        extractedTurns: 0,
        skippedTurns,
        toolCallsFound,
      },
    };
  }

  // Build the payload
  const rawPayload: UniversalTurnPayload = {
    format: descriptor.id,
    agent: agentName,
    projectName: projectName || 'chat-traces',
    sessionId,
    responder,
    turns,
  };

  // Validate with Zod
  const validation = UniversalTurnPayloadSchema.safeParse(rawPayload);
  if (!validation.success) {
    return {
      success: false,
      payload: null,
      errors: [...errors, `Validation failed: ${validation.error.message}`],
      warnings,
      stats: {
        totalTurns: rawTurns.length,
        extractedTurns: turns.length,
        skippedTurns,
        toolCallsFound,
      },
    };
  }

  return {
    success: true,
    payload: validation.data,
    errors,
    warnings,
    stats: {
      totalTurns: rawTurns.length,
      extractedTurns: turns.length,
      skippedTurns,
      toolCallsFound,
    },
  };
}
