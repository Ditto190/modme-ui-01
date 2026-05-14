/**
 * Schema Registry
 *
 * Pre-defined schemas for known AI providers with optimized parsers.
 */

import { v4 as uuidv4 } from "uuid";
import {
  type AIProvider,
  type MessageSchemaDefinition,
  type ParsedMessage,
  type SchemaRegistry,
  type ToolCall,
  type ToolResult,
  ClaudeMessageSchema,
  CopilotKitMessageSchema,
  N8nWebhookResponseSchema,
  OpenAIMessageSchema,
} from "./types";

// ============================================================================
// Claude Parser
// ============================================================================

function parseClaudeMessage(raw: unknown): ParsedMessage {
  const validated = ClaudeMessageSchema.parse(raw);
  const parsed: ParsedMessage = {
    id: validated.id || uuidv4(),
    provider: "claude",
    role: validated.role,
    content: "",
    metadata: {
      model: validated.model,
      stopReason: validated.stop_reason,
      tokens: validated.usage,
    },
    rawMessage: raw,
  };

  // Parse content blocks
  if (typeof validated.content === "string") {
    parsed.content = validated.content;
  } else if (Array.isArray(validated.content)) {
    const textBlocks: string[] = [];
    const toolCalls: ToolCall[] = [];
    const toolResults: ToolResult[] = [];

    for (const block of validated.content) {
      switch (block.type) {
        case "text":
          textBlocks.push(block.text);
          break;
        case "thinking":
          textBlocks.push(`[Thinking: ${block.thinking}]`);
          break;
        case "tool_use":
          toolCalls.push({
            id: block.id,
            name: block.name,
            arguments: block.input,
          });
          break;
        case "tool_result":
          toolResults.push({
            toolCallId: block.tool_use_id,
            result: block.content,
            isError: block.is_error,
          });
          break;
      }
    }

    parsed.content = textBlocks.join("\n\n");
    if (toolCalls.length > 0) parsed.toolCalls = toolCalls;
    if (toolResults.length > 0) parsed.toolResults = toolResults;
  }

  return parsed;
}

// ============================================================================
// OpenAI Parser
// ============================================================================

function parseOpenAIMessage(raw: unknown): ParsedMessage {
  const validated = OpenAIMessageSchema.parse(raw);
  const parsed: ParsedMessage = {
    id: validated.id || uuidv4(),
    provider: "openai",
    role: validated.role === "function" ? "assistant" : validated.role,
    content: validated.content || "",
    metadata: {
      name: validated.name,
    },
    rawMessage: raw,
  };

  // Parse tool calls
  if (validated.tool_calls && validated.tool_calls.length > 0) {
    parsed.toolCalls = validated.tool_calls.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    }));
  }

  // Parse function call (legacy)
  if (validated.function_call) {
    parsed.toolCalls = [
      {
        id: uuidv4(),
        name: validated.function_call.name,
        arguments: JSON.parse(validated.function_call.arguments),
      },
    ];
  }

  // Parse tool result
  if (validated.role === "tool" && validated.tool_call_id) {
    parsed.toolResults = [
      {
        toolCallId: validated.tool_call_id,
        result: validated.content,
      },
    ];
  }

  return parsed;
}

// ============================================================================
// CopilotKit Parser
// ============================================================================

function parseCopilotKitMessage(raw: unknown): ParsedMessage {
  const validated = CopilotKitMessageSchema.parse(raw);
  const parsed: ParsedMessage = {
    id: validated.id,
    provider: "copilotkit",
    role: validated.role,
    content: "",
    metadata: {},
    rawMessage: raw,
  };

  if ("content" in validated) {
    parsed.content = validated.content;
    if (validated.createdAt) {
      parsed.metadata.timestamp = validated.createdAt.toString();
    }
  } else if ("actionExecution" in validated) {
    const action = validated.actionExecution;
    parsed.content = `[Action: ${action.name}]`;
    parsed.toolCalls = [
      {
        id: action.id,
        name: action.name,
        arguments: action.arguments,
      },
    ];

    if (action.status === "complete" || action.status === "error") {
      parsed.toolResults = [
        {
          toolCallId: action.id,
          result: action.result,
          isError: action.status === "error",
        },
      ];
    }
  }

  return parsed;
}

// ============================================================================
// n8n Parser
// ============================================================================

function parseN8nMessage(raw: unknown): ParsedMessage {
  const validated = N8nWebhookResponseSchema.parse(raw);
  return {
    id: validated.executionId || uuidv4(),
    provider: "n8n",
    role: "assistant",
    content: JSON.stringify(validated.data, null, 2),
    metadata: {
      workflowId: validated.workflowId,
      executionId: validated.executionId,
      ...validated.metadata,
    },
    rawMessage: raw,
  };
}

// ============================================================================
// Registry Creation
// ============================================================================

export function createSchemaRegistry(): SchemaRegistry {
  const registry = new Map<AIProvider, MessageSchemaDefinition>();

  // Claude
  registry.set("claude", {
    provider: "claude",
    version: "2024-02-01",
    zodSchema: ClaudeMessageSchema,
    parser: parseClaudeMessage,
    description: "Anthropic Claude API message format with tool_use support",
    examples: [
      {
        role: "assistant",
        content: [
          { type: "text", text: "Here's the result:" },
          {
            type: "tool_use",
            id: "toolu_01A09q90qw90lq917835lq9",
            name: "get_weather",
            input: { location: "San Francisco, CA" },
          },
        ],
      },
    ],
  });

  // OpenAI
  registry.set("openai", {
    provider: "openai",
    version: "v1",
    zodSchema: OpenAIMessageSchema,
    parser: parseOpenAIMessage,
    description: "OpenAI Chat Completion API message format",
    examples: [
      {
        role: "assistant",
        content: "Let me check the weather.",
        tool_calls: [
          {
            id: "call_abc123",
            type: "function",
            function: {
              name: "get_weather",
              arguments: '{"location": "San Francisco, CA"}',
            },
          },
        ],
      },
    ],
  });

  // CopilotKit
  registry.set("copilotkit", {
    provider: "copilotkit",
    version: "1.0",
    zodSchema: CopilotKitMessageSchema,
    parser: parseCopilotKitMessage,
    description: "CopilotKit runtime message format with action executions",
    examples: [
      {
        id: "msg_123",
        role: "assistant",
        content: "I'll help you with that.",
      },
      {
        id: "msg_456",
        role: "assistant",
        actionExecution: {
          id: "action_789",
          name: "search_docs",
          arguments: { query: "API reference" },
          status: "executing",
        },
      },
    ],
  });

  // n8n
  registry.set("n8n", {
    provider: "n8n",
    version: "1.0",
    zodSchema: N8nWebhookResponseSchema,
    parser: parseN8nMessage,
    description: "n8n webhook/execution response format",
    examples: [
      {
        executionId: "exec_123",
        workflowId: "workflow_456",
        data: { result: "success", output: [1, 2, 3] },
      },
    ],
  });

  return registry;
}

// ============================================================================
// Provider Detection
// ============================================================================

export function detectProvider(raw: unknown): AIProvider {
  if (!raw || typeof raw !== "object") return "unknown";

  const obj = raw as Record<string, unknown>;

  // Claude detection
  if (
    obj.type === "message" ||
    (obj.role &&
      typeof obj.content !== "undefined" &&
      Array.isArray(obj.content) &&
      obj.content.some(
        (block: unknown) =>
          typeof block === "object" &&
          block !== null &&
          "type" in block &&
          (block as { type: string }).type === "tool_use"
      ))
  ) {
    return "claude";
  }

  // OpenAI detection
  if (obj.role && (obj.tool_calls || obj.function_call || obj.tool_call_id)) {
    return "openai";
  }

  // CopilotKit detection
  if (obj.actionExecution || (obj.id && obj.role && "content" in obj)) {
    return "copilotkit";
  }

  // n8n detection
  if ((obj.executionId && obj.workflowId) || (obj.data && "workflowId" in obj)) {
    return "n8n";
  }

  return "unknown";
}
