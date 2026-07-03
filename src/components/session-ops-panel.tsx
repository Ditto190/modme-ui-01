'use client';

import React, { useState } from 'react';
import { OpsSignalCard } from './ops-signal-card';

interface TelemetryEvent {
  id?: string;
  source: string;
  level?: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  session_id?: string | null;
  timestamp?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface SessionOpsPanelProps {
  sessionId?: string | null;
  agentPlatform?: string | null;
  events?: TelemetryEvent[];
  isLoading?: boolean;
  maxEvents?: number;
  onRefresh?: () => void;
  onTraceClick?: (traceId: string) => void;
}

const PLATFORM_BADGE_COLORS: Record<string, string> = {
  'cursor-agent': 'bg-violet-100 text-violet-700 border-violet-200',
  'cursor-editor': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'github-copilot': 'bg-sky-100 text-sky-700 border-sky-200',
  'claude-code': 'bg-orange-100 text-orange-700 border-orange-200',
  antigravity: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  unknown: 'bg-gray-100 text-gray-600 border-gray-200',
};

const PLATFORM_LABELS: Record<string, string> = {
  'cursor-agent': 'Cursor Agent',
  'cursor-editor': 'Cursor Editor',
  'github-copilot': 'GitHub Copilot',
  'claude-code': 'Claude Code',
  antigravity: 'Antigravity',
  unknown: 'Unknown Platform',
};

export function SessionOpsPanel({
  sessionId,
  agentPlatform = 'unknown',
  events = [],
  isLoading = false,
  maxEvents = 50,
  onRefresh,
  onTraceClick,
}: SessionOpsPanelProps) {
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [traceTarget, setTraceTarget] = useState<string | null>(null);

  const platform = agentPlatform ?? 'unknown';
  const badgeColor = PLATFORM_BADGE_COLORS[platform] ?? PLATFORM_BADGE_COLORS.unknown;
  const platformLabel = PLATFORM_LABELS[platform] ?? platform;
  const shortSession = sessionId ? sessionId.slice(0, 12) : null;

  const sources = ['all', ...Array.from(new Set(events.map((e) => e.source)))];
  const levels = ['all', 'debug', 'info', 'warn', 'error'];

  const filtered = events
    .filter((e) => levelFilter === 'all' || e.level === levelFilter)
    .filter((e) => sourceFilter === 'all' || e.source === sourceFilter)
    .slice(0, maxEvents);

  function handleDrillDown(traceId: string) {
    setTraceTarget(traceId);
    onTraceClick?.(traceId);
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-white rounded-xl shadow-md border border-gray-100 min-w-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 text-sm">Session Ops</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${badgeColor}`}
          >
            {platformLabel}
          </span>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1 rounded hover:bg-gray-50"
          >
            ↻ Refresh
          </button>
        )}
      </div>

      {/* Session meta */}
      {shortSession && (
        <div className="text-xs font-mono text-gray-400">
          session: <span className="text-gray-600">{shortSession}…</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-600"
        >
          {levels.map((l) => (
            <option key={l} value={l}>
              {l === 'all' ? 'All levels' : l}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-600"
        >
          {sources.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All sources' : s}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-400 ml-auto">
          {filtered.length} / {events.length}
        </span>
      </div>

      {/* Trace drill-down notice */}
      {traceTarget && (
        <div className="text-xs font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-2 py-1 flex items-center justify-between gap-2">
          <span>Trace: {traceTarget}</span>
          <button
            type="button"
            onClick={() => setTraceTarget(null)}
            className="opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Event list */}
      <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-0.5">
        {isLoading && (
          <div className="text-xs text-gray-400 text-center py-4 animate-pulse">
            Loading events…
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="text-xs text-gray-400 text-center py-6">No events match filter.</div>
        )}
        {filtered.map((event, idx) => (
          <OpsSignalCard
            key={event.id ?? idx}
            source={event.source}
            level={event.level ?? 'info'}
            message={event.message}
            sessionId={event.session_id}
            agentPlatform={platform}
            timestamp={event.timestamp ?? undefined}
            traceId={event.metadata?.trace_id as string | undefined}
            metadata={event.metadata ?? undefined}
            onDrillDown={handleDrillDown}
          />
        ))}
      </div>
    </div>
  );
}
