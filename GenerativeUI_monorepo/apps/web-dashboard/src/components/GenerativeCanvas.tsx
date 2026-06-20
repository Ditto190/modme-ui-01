'use client';

import { AgentPanelSkeleton } from '@/components/AgentPanelSkeleton';
import { StreamingText } from '@/components/StreamingText';
import { useAgentState } from '@/hooks/useAgentState';
import { AgentAction } from '@generative-ui/shared-schemas';
import { FormEvent, useMemo, useState } from 'react';

/**
 * Renders dynamic UI from agent state with streaming text and glass loading states.
 */
export default function GenerativeCanvas() {
  const {
    state,
    isConnected,
    error,
    streamingText,
    runStatus,
    optimisticMessages,
    sendUserMessage,
    cancelRun,
    retryConnection,
  } = useAgentState();

  const [draft, setDraft] = useState('');

  const renderedComponents = useMemo(() => {
    if (!state?.actions) {
      return null;
    }

    return state.actions
      .filter((action: AgentAction) => action.type === 'render')
      .map((action: AgentAction) => (
        <div
          key={action.id}
          className="agent-glass-panel mb-4 rounded-xl p-6"
        >
          {renderComponent(action)}
        </div>
      ));
  }, [state?.actions]);

  const showSkeleton =
    !isConnected ||
    runStatus === 'connecting' ||
    (runStatus === 'streaming' && !streamingText && !renderedComponents?.length);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) {
      return;
    }
    sendUserMessage(draft);
    setDraft('');
  };

  if (error && !isConnected) {
    return (
      <div className="agent-glass-panel rounded-xl border border-red-400/30 p-6">
        <h2 className="mb-2 text-xl font-bold text-red-200">Connection error</h2>
        <p className="mb-4 text-red-100/90">{error}</p>
        <button
          type="button"
          onClick={retryConnection}
          className="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-500/30"
        >
          Retry connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${
              isConnected ? 'bg-emerald-400' : 'bg-red-400'
            }`}
          />
          <span className="text-sm text-slate-300">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {state?.status && (
          <span className="text-sm text-slate-400">
            Agent: <span className="font-medium text-slate-200">{state.status}</span>
          </span>
        )}
        {runStatus === 'tool' && (
          <span className="text-sm text-cyan-300/90">Running tool…</span>
        )}
      </div>

      {optimisticMessages.length > 0 && (
        <div className="space-y-2">
          {optimisticMessages.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg px-4 py-2 text-sm ${
                message.role === 'user'
                  ? 'ml-auto max-w-[85%] bg-cyan-500/15 text-cyan-50'
                  : 'mr-auto max-w-[85%] bg-white/5 text-slate-200'
              } ${message.pending ? 'opacity-70' : ''}`}
            >
              {message.content}
            </div>
          ))}
        </div>
      )}

      {showSkeleton ? (
        <AgentPanelSkeleton
          label={
            isConnected
              ? 'Synthesizing interface…'
              : 'Connecting to agent server…'
          }
        />
      ) : null}

      {streamingText ? (
        <div className="agent-glass-panel rounded-xl p-6">
          <StreamingText
            text={streamingText}
            isStreaming={runStatus === 'streaming' || runStatus === 'tool'}
            className="text-slate-100"
          />
        </div>
      ) : null}

      {!showSkeleton &&
      (!renderedComponents || renderedComponents.length === 0) &&
      !streamingText ? (
        <div className="agent-glass-panel rounded-xl p-12 text-center">
          <p className="text-slate-400">
            Send a message to generate UI components from the agent.
          </p>
        </div>
      ) : (
        renderedComponents
      )}

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Describe the UI you want…"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none"
          disabled={!isConnected || runStatus === 'streaming'}
        />
        <button
          type="submit"
          disabled={!isConnected || runStatus === 'streaming'}
          className="rounded-xl bg-cyan-500/20 px-5 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-40"
        >
          Send
        </button>
        {(runStatus === 'streaming' || runStatus === 'tool') && (
          <button
            type="button"
            onClick={cancelRun}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-300 hover:bg-white/5"
          >
            Cancel
          </button>
        )}
      </form>

      {error && isConnected ? (
        <p className="text-sm text-amber-200/90" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function renderComponent(action: AgentAction) {
  const { componentType, props, content } = action;

  switch (componentType) {
    case 'text':
      return (
        <div>
          <h3 className="mb-2 text-xl font-bold text-slate-100">
            {props?.title || 'Text Component'}
          </h3>
          <p className="text-slate-300">
            {content || props?.text || 'No content'}
          </p>
        </div>
      );

    case 'card':
      return (
        <div>
          <h3 className="mb-2 text-xl font-bold text-slate-100">
            {props?.title || 'Card Component'}
          </h3>
          <p className="mb-4 text-slate-300">
            {props?.description || content}
          </p>
          {props?.data && (
            <pre className="overflow-x-auto rounded bg-black/30 p-4 text-sm text-slate-300">
              {JSON.stringify(props.data, null, 2)}
            </pre>
          )}
        </div>
      );

    case 'list':
      return (
        <div>
          <h3 className="mb-2 text-xl font-bold text-slate-100">
            {props?.title || 'List Component'}
          </h3>
          <ul className="list-inside list-disc space-y-1">
            {Array.isArray(content) ? (
              content.map((item: unknown, index: number) => (
                <li key={index} className="text-slate-300">
                  {typeof item === 'string' ? item : JSON.stringify(item)}
                </li>
              ))
            ) : (
              <li className="text-slate-300">{String(content)}</li>
            )}
          </ul>
        </div>
      );

    default:
      return (
        <div>
          <h3 className="mb-2 text-xl font-bold text-slate-100">
            {componentType || 'Unknown Component'}
          </h3>
          <pre className="overflow-x-auto rounded bg-black/30 p-4 text-sm text-slate-300">
            {JSON.stringify({ props, content }, null, 2)}
          </pre>
        </div>
      );
  }
}
