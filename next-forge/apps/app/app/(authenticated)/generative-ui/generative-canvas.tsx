"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import type { AgentAction, OptimisticMessage } from "@repo/schemas";
import type { ReactNode } from "react";
import { type FormEvent, useMemo, useState } from "react";
import { type AgentRunStatus, useAgentState } from "./hooks/use-agent-state";

function listItemKey(actionId: string, item: unknown): string {
  return `${actionId}-${typeof item === "string" ? item : JSON.stringify(item)}`;
}

function AgentPanelSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-3 rounded-xl border bg-muted/40 p-6">
      <p className="text-muted-foreground text-sm">{label}</p>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function StreamingText({
  text,
  isStreaming,
}: {
  text: string;
  isStreaming: boolean;
}) {
  return (
    <p className="text-sm leading-relaxed">
      {text}
      {isStreaming ? (
        <span className="ml-1 inline-block animate-pulse">▍</span>
      ) : null}
    </p>
  );
}

function renderComponent(action: AgentAction) {
  const { componentType, props, content } = action;

  switch (componentType) {
    case "text":
      return (
        <div>
          <h3 className="mb-2 font-semibold text-lg">
            {(props?.title as string | undefined) ?? "Text Component"}
          </h3>
          <p className="text-muted-foreground">
            {String(content ?? props?.text ?? "No content")}
          </p>
        </div>
      );
    case "card":
      return (
        <div>
          <h3 className="mb-2 font-semibold text-lg">
            {(props?.title as string | undefined) ?? "Card Component"}
          </h3>
          <p className="mb-4 text-muted-foreground">
            {String(props?.description ?? content ?? "")}
          </p>
          {props?.data ? (
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(props.data, null, 2)}
            </pre>
          ) : null}
        </div>
      );
    case "list":
      return (
        <div>
          <h3 className="mb-2 font-semibold text-lg">
            {(props?.title as string | undefined) ?? "List Component"}
          </h3>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            {Array.isArray(content) ? (
              content.map((item) => (
                <li key={listItemKey(action.id, item)}>
                  {typeof item === "string" ? item : JSON.stringify(item)}
                </li>
              ))
            ) : (
              <li>{String(content)}</li>
            )}
          </ul>
        </div>
      );
    default:
      return (
        <div>
          <h3 className="mb-2 font-semibold text-lg">
            {componentType ?? "Unknown Component"}
          </h3>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
            {JSON.stringify({ props, content }, null, 2)}
          </pre>
        </div>
      );
  }
}

function getConnectionLabel(
  isConnected: boolean,
  runStatus: AgentRunStatus,
  reconnectAttempt: number
): string {
  if (isConnected) {
    return "Connected";
  }
  if (runStatus === "reconnecting") {
    return `Reconnecting (${reconnectAttempt})…`;
  }
  if (runStatus === "connecting") {
    return "Connecting…";
  }
  return "Disconnected";
}

function getConnectionIndicatorClass(
  isConnected: boolean,
  runStatus: AgentRunStatus
): string {
  if (isConnected) {
    return "bg-emerald-500";
  }
  if (runStatus === "reconnecting" || runStatus === "connecting") {
    return "animate-pulse bg-amber-500";
  }
  return "bg-destructive";
}

function ConnectionBar({
  isConnected,
  reconnectAttempt,
  status,
  runStatus,
}: {
  isConnected: boolean;
  reconnectAttempt: number;
  status?: string;
  runStatus: AgentRunStatus;
}) {
  const connectionLabel = getConnectionLabel(
    isConnected,
    runStatus,
    reconnectAttempt
  );

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <div
          className={`h-3 w-3 rounded-full ${getConnectionIndicatorClass(isConnected, runStatus)}`}
        />
        <span className="text-muted-foreground text-sm">{connectionLabel}</span>
      </div>
      {status ? (
        <span className="text-muted-foreground text-sm">
          Agent: <span className="font-medium text-foreground">{status}</span>
        </span>
      ) : null}
      {runStatus === "tool" ? (
        <span className="text-cyan-600 text-sm dark:text-cyan-400">
          Running tool…
        </span>
      ) : null}
    </div>
  );
}

function OptimisticMessageList({
  messages,
}: {
  messages: OptimisticMessage[];
}) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {messages.map((message) => (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            message.role === "user"
              ? "ml-auto max-w-[85%] bg-primary/10 text-foreground"
              : "mr-auto max-w-[85%] bg-muted text-foreground"
          } ${message.pending ? "opacity-70" : ""}`}
          key={message.id}
        >
          {message.content}
        </div>
      ))}
    </div>
  );
}

function CanvasOutput({
  showSkeleton,
  isConnected,
  streamingText,
  runStatus,
  renderedComponents,
}: {
  showSkeleton: boolean;
  isConnected: boolean;
  streamingText: string;
  runStatus: AgentRunStatus;
  renderedComponents: ReactNode;
}) {
  if (showSkeleton) {
    return (
      <AgentPanelSkeleton
        label={
          isConnected
            ? "Synthesizing interface…"
            : "Connecting to agent server…"
        }
      />
    );
  }

  return (
    <>
      {streamingText ? (
        <div className="rounded-xl border bg-card p-6">
          <StreamingText
            isStreaming={runStatus === "streaming" || runStatus === "tool"}
            text={streamingText}
          />
        </div>
      ) : null}
      {renderedComponents || streamingText ? (
        renderedComponents
      ) : (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">
            Send a message to generate UI components from the agent.
          </p>
        </div>
      )}
    </>
  );
}

function AgentChatForm({
  draft,
  isConnected,
  isBusy,
  runStatus,
  onDraftChange,
  onSubmit,
  onCancel,
}: {
  draft: string;
  isConnected: boolean;
  isBusy: boolean;
  runStatus: AgentRunStatus;
  onDraftChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const isInputDisabled = !isConnected || isBusy;

  return (
    <form className="flex gap-3" onSubmit={onSubmit}>
      <input
        className="flex-1 rounded-xl border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
        disabled={isInputDisabled}
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder="Describe the UI you want…"
        type="text"
        value={draft}
      />
      <Button disabled={isInputDisabled} type="submit">
        Send
      </Button>
      {runStatus === "streaming" || runStatus === "tool" ? (
        <Button onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
      ) : null}
    </form>
  );
}

export function GenerativeCanvas() {
  const {
    state,
    isConnected,
    error,
    streamingText,
    runStatus,
    reconnectAttempt,
    optimisticMessages,
    sendUserMessage,
    cancelRun,
    retryConnection,
  } = useAgentState();

  const [draft, setDraft] = useState("");

  const renderedComponents = useMemo(() => {
    if (!state?.actions) {
      return null;
    }

    return state.actions
      .filter((action) => action.type === "render")
      .map((action) => (
        <div className="mb-4 rounded-xl border bg-card p-6" key={action.id}>
          {renderComponent(action)}
        </div>
      ));
  }, [state?.actions]);

  const showSkeleton =
    !isConnected ||
    runStatus === "connecting" ||
    runStatus === "reconnecting" ||
    (runStatus === "streaming" &&
      !streamingText &&
      !renderedComponents?.length);

  const isBusy =
    runStatus === "streaming" ||
    runStatus === "tool" ||
    runStatus === "connecting" ||
    runStatus === "reconnecting";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) {
      return;
    }
    sendUserMessage(draft);
    setDraft("");
  };

  if (error && !isConnected && runStatus === "error") {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
        <h2 className="mb-2 font-semibold text-destructive">
          Connection error
        </h2>
        <p className="mb-4 text-muted-foreground text-sm">{error}</p>
        <Button onClick={retryConnection} type="button" variant="outline">
          Retry connection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConnectionBar
        isConnected={isConnected}
        reconnectAttempt={reconnectAttempt}
        runStatus={runStatus}
        status={state?.status}
      />
      <OptimisticMessageList messages={optimisticMessages} />
      <CanvasOutput
        isConnected={isConnected}
        renderedComponents={renderedComponents}
        runStatus={runStatus}
        showSkeleton={showSkeleton}
        streamingText={streamingText}
      />
      <AgentChatForm
        draft={draft}
        isBusy={isBusy}
        isConnected={isConnected}
        onCancel={cancelRun}
        onDraftChange={setDraft}
        onSubmit={handleSubmit}
        runStatus={runStatus}
      />
      {error && isConnected ? (
        <p className="text-amber-600 text-sm dark:text-amber-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
