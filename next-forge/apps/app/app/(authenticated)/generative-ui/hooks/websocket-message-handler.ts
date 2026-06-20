import type { OptimisticMessage } from "@repo/schemas";
import {
  type AgentState,
  AgentStateSchema,
  DonePayloadSchema,
  TokenEventPayloadSchema,
  ToolResultPayloadSchema,
  ToolStartPayloadSchema,
  type WebSocketMessage,
} from "@repo/schemas";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { AgentRunStatus } from "./use-agent-state";

interface MessageHandlerContext {
  seqRef: MutableRefObject<number>;
  setActiveRunId: Dispatch<SetStateAction<string | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setOptimisticMessages: Dispatch<SetStateAction<OptimisticMessage[]>>;
  setRunStatus: Dispatch<SetStateAction<AgentRunStatus>>;
  setState: Dispatch<SetStateAction<AgentState | null>>;
  setStreamingText: Dispatch<SetStateAction<string>>;
}

function handleStateUpdate(payload: unknown, ctx: MessageHandlerContext): void {
  const validatedState = AgentStateSchema.parse(payload);
  ctx.setState(validatedState);

  if (
    validatedState.status === "processing" ||
    validatedState.status === "streaming"
  ) {
    ctx.setRunStatus("streaming");
    return;
  }

  if (validatedState.status === "complete") {
    ctx.setRunStatus("done");
    ctx.setOptimisticMessages((prev) =>
      prev.map((m) => ({ ...m, pending: false }))
    );
    return;
  }

  if (validatedState.status === "error") {
    ctx.setRunStatus("error");
    ctx.setError(validatedState.error ?? "Agent error");
    return;
  }

  ctx.setRunStatus("idle");
}

function handleToken(payload: unknown, ctx: MessageHandlerContext): void {
  const token = TokenEventPayloadSchema.parse(payload);
  if (token.seq <= ctx.seqRef.current) {
    return;
  }

  ctx.seqRef.current = token.seq;
  if (token.runId) {
    ctx.setActiveRunId(token.runId);
  }
  ctx.setRunStatus("streaming");
  ctx.setStreamingText((prev) => prev + token.delta);
}

function handleDone(payload: unknown, ctx: MessageHandlerContext): void {
  const done = DonePayloadSchema.parse(payload);
  ctx.setActiveRunId(done.runId);
  ctx.setRunStatus("done");
  ctx.setOptimisticMessages((prev) =>
    prev.map((m) => ({ ...m, pending: false }))
  );
}

function handleErrorPayload(
  payload: unknown,
  ctx: MessageHandlerContext
): void {
  const errorPayload = payload as { message?: string } | undefined;
  ctx.setError(errorPayload?.message ?? "Unknown error");
  ctx.setRunStatus("error");
  ctx.setOptimisticMessages((prev) =>
    prev.filter((m) => m.role !== "user" || !m.pending)
  );
}

export function handleAgentWebSocketMessage(
  validatedMessage: WebSocketMessage,
  ctx: MessageHandlerContext
): void {
  switch (validatedMessage.type) {
    case "state_update":
      handleStateUpdate(validatedMessage.payload, ctx);
      break;
    case "token":
      handleToken(validatedMessage.payload, ctx);
      break;
    case "tool_start":
      ToolStartPayloadSchema.parse(validatedMessage.payload);
      ctx.setRunStatus("tool");
      break;
    case "tool_result":
      ToolResultPayloadSchema.parse(validatedMessage.payload);
      ctx.setRunStatus("streaming");
      break;
    case "done":
      handleDone(validatedMessage.payload, ctx);
      break;
    case "error":
      handleErrorPayload(validatedMessage.payload, ctx);
      break;
    default:
      break;
  }
}
