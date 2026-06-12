'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AgentState,
  AgentStateSchema,
  WebSocketMessage,
  WebSocketMessageSchema,
} from '@generative-ui/shared-schemas';

/**
 * Custom hook to manage agent state via WebSocket connection
 * Connects to the backend agent server and receives real-time state updates
 */
export function useAgentState() {
  const [state, setState] = useState<AgentState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connectWebSocket = useCallback(() => {
    try {
      // Use environment variable for WebSocket URL, fallback to localhost
      const wsUrl =
        process.env.NEXT_PUBLIC_AGENT_SERVER_WS_URL ||
        'ws://localhost:8000/ws/agent';

      const websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Validate message with Zod schema
          const validatedMessage = WebSocketMessageSchema.parse(message);

          if (validatedMessage.type === 'state_update') {
            // Validate and update agent state
            const validatedState = AgentStateSchema.parse(
              validatedMessage.payload
            );
            setState(validatedState);
          } else if (validatedMessage.type === 'error') {
            setError(validatedMessage.payload?.message || 'Unknown error');
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
          setError('Failed to parse message from server');
        }
      };

      websocket.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
        setIsConnected(false);
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (document.visibilityState === 'visible') {
            connectWebSocket();
          }
        }, 3000);
      };

      setWs(websocket);
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to connect to agent server');
    }
  }, []);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connectWebSocket, ws]);

  const sendMessage = useCallback(
    (message: WebSocketMessage) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      } else {
        console.error('WebSocket is not connected');
      }
    },
    [ws]
  );

  return {
    state,
    isConnected,
    error,
    sendMessage,
  };
}
