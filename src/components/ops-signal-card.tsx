'use client';

import React from 'react';
import { z } from 'zod';

const LEVEL_STYLES = {
  debug: 'bg-gray-100 text-gray-600 border-gray-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  warn: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  error: 'bg-red-50 text-red-700 border-red-200',
} as const;

const PLATFORM_LABELS: Record<string, string> = {
  'cursor-agent': 'Cursor Agent',
  'cursor-editor': 'Cursor Editor',
  'github-copilot': 'GitHub Copilot',
  'claude-code': 'Claude Code',
  antigravity: 'Antigravity',
  unknown: 'Unknown',
};

const OpsSignalPropsSchema = z.object({
  source: z.string(),
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  message: z.string(),
  sessionId: z.string().nullish(),
  agentPlatform: z.string().nullish(),
  timestamp: z.string().nullish(),
  traceId: z.string().nullish(),
  metadata: z.record(z.unknown()).nullish(),
  onDrillDown: z.function().args(z.string()).returns(z.void()).optional(),
});

type OpsSignalProps = z.infer<typeof OpsSignalPropsSchema>;

export function OpsSignalCard(rawProps: OpsSignalProps) {
  const result = OpsSignalPropsSchema.safeParse(rawProps);

  if (!result.success) {
    return (
      <div className="p-3 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200 text-xs">
        Invalid OpsSignalCard props: {result.error.issues[0]?.message}
      </div>
    );
  }

  const { source, level, message, sessionId, agentPlatform, timestamp, traceId, metadata, onDrillDown } =
    result.data;

  const levelStyle = LEVEL_STYLES[level];
  const platformLabel = PLATFORM_LABELS[agentPlatform ?? 'unknown'] ?? agentPlatform ?? 'Unknown';
  const shortSession = sessionId ? sessionId.slice(0, 8) : null;
  const shortTrace = traceId ? traceId.slice(0, 12) : null;

  function handleDrillDown() {
    if (onDrillDown && traceId) {
      onDrillDown(traceId);
    }
  }

  return (
    <div className={`p-3 rounded-lg border text-sm ${levelStyle} flex flex-col gap-1.5`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-semibold uppercase tracking-wide opacity-70">
            {source}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-xs font-medium border ${levelStyle}`}
          >
            {level}
          </span>
          {agentPlatform && (
            <span className="px-1.5 py-0.5 rounded text-xs bg-white/60 border border-current/20 font-medium">
              {platformLabel}
            </span>
          )}
        </div>
        {timestamp && (
          <span className="text-xs opacity-50 shrink-0">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      <p className="leading-snug">{message}</p>

      <div className="flex items-center gap-3 flex-wrap mt-0.5">
        {shortSession && (
          <span className="font-mono text-xs opacity-60">
            session: {shortSession}…
          </span>
        )}
        {shortTrace && (
          <button
            type="button"
            onClick={handleDrillDown}
            className="font-mono text-xs opacity-60 underline underline-offset-2 hover:opacity-100 transition-opacity"
            title={`Trace: ${traceId}`}
          >
            trace: {shortTrace}…
          </button>
        )}
      </div>

      {metadata && Object.keys(metadata).length > 0 && (
        <details className="mt-1">
          <summary className="text-xs opacity-50 cursor-pointer select-none">metadata</summary>
          <pre className="mt-1 text-xs font-mono opacity-70 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
