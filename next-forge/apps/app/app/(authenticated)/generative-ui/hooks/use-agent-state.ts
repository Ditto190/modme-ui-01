"use client";

import {
  type AgentState,
  type OptimisticMessage,
  type WebSocketMessage,
  WebSocketMessageSchema,
} from "@repo/schemas";
import { useCallback, useEffect, useRef, useState } from "react";
import { handleAgentWebSocketMessage } from "./websocket-message-handler";

export type AgentRunStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "tool"
  | "done"
  | "error";

export interface UseAgentStateReturn {
  activeRunId: string | null;
  cancelRun: () => void;
  error: string | null;
  isConnected: boolean;
  optimisticMessages: OptimisticMessage[];
  retryConnection: () => void;
  runStatus: AgentRunStatus;
  sendMessage: (message: WebSocketMessage) => void;
  sendUserMessage: (text: string) => void;
  state: AgentState | null;
  streamingText: string;
}

export function useAgentState(): UseAgentStateReturn {
  const [state, setState] = useState<AgentState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [runStatus, setRunStatus] = useState<AgentRunStatus>("idle");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<
    OptimisticMessage[]
  >([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    clearReconnectTimer();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setRunStatus("connecting");

    try {
      const wsUrl =
        process.env.NEXT_PUBLIC_AGENT_SERVER_WS_URL ??
        "ws://localhost:8000/ws/agent";

      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;

      websocket.onopen = () => {
        setIsConnected(true);
        setError(null);
        setRunStatus("idle");
      };

      websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string);
          const validatedMessage = WebSocketMessageSchema.parse(message);
          handleAgentWebSocketMessage(validatedMessage, {
            seqRef,
            setActiveRunId,
            setError,
            setOptimisticMessages,
            setRunStatus,
            setState,
            setStreamingText,
          });
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
          setError("Failed to parse message from server");
          setRunStatus("error");
        }
      };

      websocket.onerror = () => {
        setError("WebSocket connection error");
        setIsConnected(false);
        setRunStatus("error");
      };

      websocket.onclose = () => {
        setIsConnected(false);
        setRunStatus("idle");
        wsRef.current = null;

        reconnectTimerRef.current = setTimeout(() => {
          if (document.visibilityState === "visible") {
            connectWebSocket();
          }
        }, 3000);
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      setError("Failed to connect to agent server");
      setRunStatus("error");
    }
  }, [clearReconnectTimer]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket, clearReconnectTimer]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not connected");
    }
  }, []);

  const sendUserMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      const optimisticId = `opt-${Date.now()}`;
      setOptimisticMessages((prev) => [
        ...prev,
        { id: optimisticId, role: "user", content: trimmed, pending: true },
      ]);
      setStreamingText("");
      setRunStatus("streaming");
      seqRef.current = 0;
      setError(null);

      sendMessage({
        type: "action",
        payload: { message: trimmed },
        timestamp: Date.now(),
      });
    },
    [sendMessage]
  );

  const cancelRun = useCallback(() => {
    sendMessage({
      type: "action",
      payload: { cancel: true },
      timestamp: Date.now(),
    });
    setRunStatus("idle");
    setStreamingText("");
    setActiveRunId(null);
  }, [sendMessage]);

  const retryConnection = useCallback(() => {
    setError(null);
    connectWebSocket();
  }, [connectWebSocket]);

  return {
    state,
    isConnected,
    error,
    streamingText,
    runStatus,
    activeRunId,
    optimisticMessages,
    sendMessage,
    sendUserMessage,
    cancelRun,
    retryConnection,
  };
}
