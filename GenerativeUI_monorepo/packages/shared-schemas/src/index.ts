import { z } from 'zod';

/**
 * AgentAction schema represents an action taken by an AI agent
 * that should be reflected in the UI state
 */
export const AgentActionSchema = z.object({
  id: z.string().describe('Unique identifier for the action'),
  type: z
    .enum(['create', 'update', 'delete', 'render'])
    .describe('Type of action'),
  timestamp: z.number().describe('Unix timestamp of when the action occurred'),
  componentType: z
    .string()
    .optional()
    .describe('Type of UI component to render'),
  props: z
    .record(z.any())
    .optional()
    .describe('Properties to pass to the component'),
  content: z
    .any()
    .optional()
    .describe('Content or data associated with the action'),
  metadata: z.record(z.any()).optional().describe('Additional metadata'),
});

export type AgentAction = z.infer<typeof AgentActionSchema>;

/**
 * AgentState schema represents the current state of the AI agent system
 */
export const AgentStateSchema = z.object({
  actions: z.array(AgentActionSchema).describe('List of agent actions'),
  status: z
    .enum(['idle', 'processing', 'streaming', 'complete', 'error'])
    .describe('Current status'),
  error: z.string().optional().describe('Error message if status is error'),
  metadata: z.record(z.any()).optional().describe('Additional state metadata'),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

/** Token delta emitted during streaming generation */
export const TokenEventPayloadSchema = z.object({
  delta: z.string(),
  seq: z.number(),
  runId: z.string().optional(),
});

export type TokenEventPayload = z.infer<typeof TokenEventPayloadSchema>;

/** Tool invocation lifecycle events */
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

/** Optimistic chat message tracked client-side until server ack */
export const OptimisticMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  pending: z.boolean().optional(),
});

export type OptimisticMessage = z.infer<typeof OptimisticMessageSchema>;

/**
 * WebSocket message schema for real-time communication
 */
export const WebSocketMessageSchema = z.object({
  type: z
    .enum([
      'state_update',
      'action',
      'error',
      'ping',
      'pong',
      'token',
      'tool_start',
      'tool_result',
      'done',
    ])
    .describe('Message type'),
  payload: z.any().optional().describe('Message payload'),
  timestamp: z
    .number()
    .default(() => Date.now())
    .describe('Unix timestamp'),
});

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;
