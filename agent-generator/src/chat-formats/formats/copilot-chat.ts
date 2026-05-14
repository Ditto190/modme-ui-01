/**
 * chat-formats/formats/copilot-chat.ts
 *
 * VS Code Copilot Chat format descriptor.
 *
 * This is the first concrete format — built from the existing parser in
 * agent/observability/upload_chat_traces.py. The same knowledge, but now
 * expressed as a declarative ChatFormatDescriptor + registered extractors.
 *
 * Copilot's format is the most complex we handle:
 *   - Responses are arrays of typed objects ({kind, value})
 *   - Tool calls are nested in "toolCallRounds" (rounds → toolCalls[])
 *   - Thinking blocks are interleaved in the response array
 *   - Rich text nodes have recursive {node: {children: [{text}]}} structure
 *   - Variables carry workspace, prompt files, and toolsets
 */

import type { ChatFormatDescriptor, ToolCall } from '../types';
import {
  registerResponseAssembler,
  registerThinkingExtractor,
  registerToolCallExtractor,
} from '../normalizer';
import { getByPath } from '../fingerprint';

// ============================================================================
// FORMAT DESCRIPTOR — the static, declarative definition
// ============================================================================

export const copilotChatDescriptor: ChatFormatDescriptor = {
  id: 'copilot-chat',
  name: 'VS Code Copilot Chat',
  agent: 'GitHub Copilot',
  version: '1.0.0',
  priority: 100, // High priority — most common format in this project

  /**
   * Fingerprint: how to detect this is a Copilot chat export.
   *
   * ALL rules must pass. These are the unique structural markers:
   *   - "responderUsername" exists as a string (e.g., "GitHub Copilot")
   *   - "requests" exists as an array (the conversation turns)
   *   - First request has "message" object (not "content" like OpenAI)
   *   - First request has "variableData" (unique to Copilot)
   */
  fingerprint: [
    { path: 'responderUsername', check: 'type_string' },
    { path: 'requests', check: 'type_array' },
    { path: 'requests[0].message', check: 'type_object' },
    { path: 'requests[0].variableData', check: 'type_object' },
  ],

  fieldMapping: {
    turns: 'requests',

    turn: {
      userMessage: 'message.text',
      // Response requires assembly — path points to the response array,
      // but the assembler function handles the complex extraction
      assistantResponse: 'response',
      model: 'modelId',
      timestamp: 'timestamp',
      latencyMs: 'result.timings.totalElapsed',
      thinking: null, // Extracted by custom thinkingExtractor from response[]

      tokens: {
        prompt: 'result.metadata.promptTokens',
        completion: 'result.metadata.outputTokens',
      },

      toolCalls: {
        path: 'result.metadata.toolCallRounds',
        name: 'name',
        input: 'arguments',
        output: 'result',
      },
    },

    global: {
      sessionId: null, // Embedded in result.metadata.sessionId per-turn
      responder: 'responderUsername',
      agent: 'responderUsername',
    },
  },

  requiresResponseAssembly: true,
  toolCallsNested: true,
  status: 'stable',
};

// ============================================================================
// RESPONSE ASSEMBLER — handles the complex response[] array
// ============================================================================

/**
 * Copilot stores responses as an array of typed objects.
 * Kinds include: "thinking", "toolInvocationSerialized", "progressTaskSerialized",
 * "mcpServersStarting", "undoStop", "confirmation", and unmarked text blocks.
 *
 * This assembler extracts only the assistant's visible text output,
 * skipping thinking blocks and internal tool invocation noise.
 */
function assembleCopilotResponse(responses: any[]): string {
  if (!Array.isArray(responses)) return '';

  const textParts: string[] = [];

  for (const resp of responses) {
    const kind = resp?.kind;

    // Skip non-text response types
    if (kind === 'thinking') continue;
    if (kind === 'mcpServersStarting') continue;
    if (kind === 'undoStop') continue;
    if (kind === 'confirmation') continue;

    // Tool invocations — include the past-tense message as context
    if (kind === 'toolInvocationSerialized') {
      const msg = resp.pastTenseMessage || resp.invocationMessage || '';
      const msgText = typeof msg === 'object' ? msg.value || '' : String(msg);
      if (msgText) textParts.push(`[Tool] ${msgText}`);
      continue;
    }

    // Progress tasks
    if (kind === 'progressTaskSerialized') {
      const content = resp.content;
      if (typeof content === 'object' && content?.value) {
        textParts.push(content.value);
      }
      continue;
    }

    // Unmarked text blocks (the actual assistant response)
    const value = resp?.value;
    if (typeof value === 'string' && value.trim()) {
      textParts.push(value);
    }
  }

  return textParts.join('\n');
}

// ============================================================================
// THINKING EXTRACTOR — pulls CoT/reasoning from response[]
// ============================================================================

function extractCopilotThinking(turn: any): string {
  const responses = getByPath(turn, 'response');
  if (!Array.isArray(responses)) return '';

  const parts = responses
    .filter((r: any) => r?.kind === 'thinking' && r?.value)
    .map((r: any) => r.value);

  return parts.join('\n---\n');
}

// ============================================================================
// TOOL CALL EXTRACTOR — handles nested toolCallRounds structure
// ============================================================================

/**
 * Copilot nests tool calls in rounds:
 *   result.metadata.toolCallRounds[].toolCalls[].{name, arguments, result}
 *
 * Plus tool invocations appear in the response[] array with toolId.
 * We use toolCallRounds as the primary source (has structured data).
 */
function extractCopilotToolCalls(turn: any): ToolCall[] {
  const rounds = getByPath(turn, 'result.metadata.toolCallRounds');
  if (!Array.isArray(rounds)) return [];

  const calls: ToolCall[] = [];

  for (let roundIdx = 0; roundIdx < rounds.length; roundIdx++) {
    const toolCalls = rounds[roundIdx]?.toolCalls;
    if (!Array.isArray(toolCalls)) continue;

    for (const tc of toolCalls) {
      const input = tc.arguments;
      const inputStr = typeof input === 'string'
        ? input
        : typeof input === 'object'
          ? JSON.stringify(input)
          : '';

      // Extract result text (may be a rich text node)
      let outputStr = '';
      const result = tc.result;
      if (typeof result === 'string') {
        outputStr = result;
      } else if (typeof result === 'object' && result?.node) {
        outputStr = extractRichTextNode(result.node);
      }

      calls.push({
        name: tc.name || 'unknown',
        input: inputStr.slice(0, 2000),
        output: outputStr.slice(0, 2000),
        round: roundIdx,
      });
    }
  }

  return calls;
}

/**
 * Recursively extract plain text from VS Code rich text nodes.
 * Structure: {type, ctorName, children: [{text: "..."}, ...]}
 */
function extractRichTextNode(node: any): string {
  if (typeof node === 'string') return node;
  if (!node || typeof node !== 'object') return '';

  const parts: string[] = [];
  if (typeof node.text === 'string') parts.push(node.text);
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      parts.push(extractRichTextNode(child));
    }
  }
  return parts.filter(Boolean).join(' ').trim();
}

// ============================================================================
// REGISTRATION — wire up the custom extractors
// ============================================================================

/**
 * Register all Copilot-specific extractors.
 * Call this once during pipeline initialization.
 */
export function registerCopilotFormat(): void {
  registerResponseAssembler('copilot-chat', assembleCopilotResponse);
  registerThinkingExtractor('copilot-chat', extractCopilotThinking);
  registerToolCallExtractor('copilot-chat', extractCopilotToolCalls);
}
