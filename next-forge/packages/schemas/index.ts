import { z } from "zod";

/**
 * AgentAction schema represents an action taken by an AI agent
 * that should be reflected in the UI state.
 * Sync manually with GenerativeUI_monorepo/apps/agent-server/src/models/schemas.py
 */
export const AgentActionSchema = z.object({
  id: z.string().describe("Unique identifier for the action"),
  type: z
    .enum(["create", "update", "delete", "render"])
    .describe("Type of action"),
  timestamp: z.number().describe("Unix timestamp of when the action occurred"),
  componentType: z
    .string()
    .optional()
    .describe("Type of UI component to render"),
  props: z.record(z.string(), z.unknown()).optional(),
  content: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AgentAction = z.infer<typeof AgentActionSchema>;

export const AgentStateSchema = z.object({
  actions: z.array(AgentActionSchema).describe("List of agent actions"),
  status: z
    .enum(["idle", "processing", "streaming", "complete", "error"])
    .describe("Current status"),
  error: z.string().optional().describe("Error message if status is error"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

export const TokenEventPayloadSchema = z.object({
  delta: z.string(),
  seq: z.number(),
  runId: z.string().optional(),
});

export type TokenEventPayload = z.infer<typeof TokenEventPayloadSchema>;

export const ToolStartPayloadSchema = z.object({
  name: z.string(),
  callId: z.string(),
  runId: z.string().optional(),
});

export const ToolResultPayloadSchema = z.object({
  callId: z.string(),
  output: z.unknown(),
  runId: z.string().optional(),
});

export const DonePayloadSchema = z.object({
  runId: z.string(),
  usage: z
    .object({
      promptTokens: z.number().optional(),
      completionTokens: z.number().optional(),
    })
    .optional(),
});

export type ToolStartPayload = z.infer<typeof ToolStartPayloadSchema>;
export type ToolResultPayload = z.infer<typeof ToolResultPayloadSchema>;
export type DonePayload = z.infer<typeof DonePayloadSchema>;

export const OptimisticMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  pending: z.boolean().optional(),
});

export type OptimisticMessage = z.infer<typeof OptimisticMessageSchema>;

export const WebSocketMessageSchema = z.object({
  type: z.enum([
    "state_update",
    "action",
    "error",
    "ping",
    "pong",
    "token",
    "tool_start",
    "tool_result",
    "done",
  ]),
  payload: z.unknown().optional(),
  timestamp: z.number().default(() => Date.now()),
});

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;
