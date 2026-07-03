"use client";

import {
  type AgentState,
  type OptimisticMessage,
  type WebSocketMessage,
  WebSocketMessageSchema,
} from "@repo/schemas";
import { useCallback, useEffect, useRef, useState } from "react";
import { getReconnectDelay, MAX_RECONNECT_ATTEMPTS } from "./reconnect-delay";
import { handleAgentWebSocketMessage } from "./websocket-message-handler";

export type AgentRunStatus =
  | "idle"
  | "connecting"
  | "reconnecting"
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
  reconnectAttempt: number;
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
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [optimisticMessages, setOptimisticMessages] = useState<
    OptimisticMessage[]
  >([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);
  const reconnectAttemptsRef = useRef(0);
  const intentionalCloseRef = useRef(false);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(
    (reconnect: () => void) => {
      clearReconnectTimer();

      const attempts = reconnectAttemptsRef.current;
      if (attempts >= MAX_RECONNECT_ATTEMPTS) {
        setError(
          "Unable to reconnect to agent server after multiple attempts. Retry manually."
        );
        setRunStatus("error");
        setReconnectAttempt(attempts);
        return;
      }

      setRunStatus("reconnecting");
      setError((current) => current ?? "Connection lost. Reconnecting…");
      setReconnectAttempt(attempts + 1);

      const delay = getReconnectDelay(attempts);
      reconnectAttemptsRef.current += 1;

      reconnectTimerRef.current = setTimeout(() => {
        if (document.visibilityState === "visible") {
          reconnect();
        }
      }, delay);
    },
    [clearReconnectTimer]
  );

  const connectWebSocket = useCallback(() => {
    clearReconnectTimer();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setRunStatus(
      reconnectAttemptsRef.current > 0 ? "reconnecting" : "connecting"
    );

    try {
      const wsUrl =
        process.env.NEXT_PUBLIC_AGENT_SERVER_WS_URL ??
        "ws://localhost:8000/ws/agent";

      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;

      websocket.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setReconnectAttempt(0);
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
      };

      websocket.onclose = (event) => {
        setIsConnected(false);
        wsRef.current = null;

        if (intentionalCloseRef.current) {
          intentionalCloseRef.current = false;
          setRunStatus("idle");
          return;
        }

        if (event.code === 1000) {
          setRunStatus("idle");
          return;
        }

        scheduleReconnect(() => connectWebSocketRef.current());
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      setError("Failed to connect to agent server");
      setRunStatus("error");
    }
  }, [clearReconnectTimer, scheduleReconnect]);

  const connectWebSocketRef = useRef(connectWebSocket);
  connectWebSocketRef.current = connectWebSocket;

  useEffect(() => {
    connectWebSocket();

    return () => {
      clearReconnectTimer();
      intentionalCloseRef.current = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket, clearReconnectTimer]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      const socket = wsRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        return;
      }

      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        return;
      }

      clearReconnectTimer();
      reconnectAttemptsRef.current = 0;
      setReconnectAttempt(0);
      setError(null);
      connectWebSocket();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clearReconnectTimer, connectWebSocket]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      return;
    }

    setError("WebSocket is not connected");
    console.error("WebSocket is not connected");
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
    clearReconnectTimer();
    reconnectAttemptsRef.current = 0;
    setReconnectAttempt(0);
    setError(null);
    connectWebSocket();
  }, [clearReconnectTimer, connectWebSocket]);

  return {
    state,
    isConnected,
    error,
    streamingText,
    runStatus,
    activeRunId,
    reconnectAttempt,
    optimisticMessages,
    sendMessage,
    sendUserMessage,
    cancelRun,
    retryConnection,
  };
}
