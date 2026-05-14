/**
 * Server-Sent Events (SSE) Client for real-time agent updates
 *
 * Integrates patterns from OpenWork for streaming agent progress
 */

export type SSEEventType =
  | 'tool_start'
  | 'tool_progress'
  | 'tool_complete'
  | 'tool_error'
  | 'agent_thinking'
  | 'state_update';

export interface SSEEvent {
  id: string;
  event: SSEEventType;
  data: Record<string, any>;
  timestamp: string;
}

export type SSEEventHandler = (event: SSEEvent) => void;

export class SSEClient {
  private baseUrl: string;
  private eventSource: EventSource | null = null;
  private handlers: Map<SSEEventType, Set<SSEEventHandler>> = new Map();

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Connect to SSE stream
   */
  connect(channel: string = 'default'): void {
    if (this.eventSource) {
      this.disconnect();
    }

    const url = `${this.baseUrl}/api/events?channel=${channel}`;
    this.eventSource = new EventSource(url);

    // Register event listeners
    const eventTypes: SSEEventType[] = [
      'tool_start',
      'tool_progress',
      'tool_complete',
      'tool_error',
      'agent_thinking',
      'state_update',
    ];

    eventTypes.forEach((eventType) => {
      this.eventSource?.addEventListener(eventType, (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          const sseEvent: SSEEvent = {
            id: (event as MessageEvent).lastEventId,
            event: eventType,
            data,
            timestamp: data.timestamp || new Date().toISOString(),
          };

          // Notify handlers
          const handlers = this.handlers.get(eventType);
          if (handlers) {
            handlers.forEach((handler) => handler(sseEvent));
          }
        } catch (error) {
          console.error('Error parsing SSE event:', error);
        }
      });
    });

    // Error handling
    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      this.disconnect();
    };
  }

  /**
   * Disconnect from SSE stream
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Register event handler
   */
  on(eventType: SSEEventType, handler: SSEEventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  /**
   * Unregister event handler
   */
  off(eventType: SSEEventType, handler: SSEEventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }
}

// Global SSE client instance
let sseClient: SSEClient | null = null;

export function getSSEClient(): SSEClient {
  if (!sseClient) {
    sseClient = new SSEClient();
  }
  return sseClient;
}
