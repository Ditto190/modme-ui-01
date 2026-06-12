import { z } from 'zod';

/**
 * AgentAction schema represents an action taken by an AI agent
 * that should be reflected in the UI state
 */
export const AgentActionSchema = z.object({
  id: z.string().describe('Unique identifier for the action'),
  type: z.enum(['create', 'update', 'delete', 'render']).describe('Type of action'),
  timestamp: z.number().describe('Unix timestamp of when the action occurred'),
  componentType: z.string().optional().describe('Type of UI component to render'),
  props: z.record(z.any()).optional().describe('Properties to pass to the component'),
  content: z.any().optional().describe('Content or data associated with the action'),
  metadata: z.record(z.any()).optional().describe('Additional metadata'),
});

export type AgentAction = z.infer<typeof AgentActionSchema>;

/**
 * AgentState schema represents the current state of the AI agent system
 */
export const AgentStateSchema = z.object({
  actions: z.array(AgentActionSchema).describe('List of agent actions'),
  status: z.enum(['idle', 'processing', 'streaming', 'complete', 'error']).describe('Current status'),
  error: z.string().optional().describe('Error message if status is error'),
  metadata: z.record(z.any()).optional().describe('Additional state metadata'),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

/**
 * WebSocket message schema for real-time communication
 */
export const WebSocketMessageSchema = z.object({
  type: z.enum(['state_update', 'action', 'error', 'ping', 'pong']).describe('Message type'),
  payload: z.any().optional().describe('Message payload'),
  timestamp: z.number().default(() => Date.now()).describe('Unix timestamp'),
});

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;
