const PLATFORM_BADGE_STYLES: Record<string, string> = {
  cursor: "bg-violet-100 text-violet-700 border-violet-200",
  copilot: "bg-sky-100 text-sky-700 border-sky-200",
  claude: "bg-amber-100 text-amber-700 border-amber-200",
  voltagent: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cloud: "bg-blue-100 text-blue-700 border-blue-200",
  human: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

const PLATFORM_LABELS: Record<string, string> = {
  cursor: "cursor",
  copilot: "copilot",
  claude: "claude",
  voltagent: "voltagt",
  cloud: "cloud",
  human: "human",
};

export interface TraceRefs {
  readonly childSessionIds?: readonly string[];
  readonly greptimeSpanId?: string | null;
  readonly parentSessionId?: string | null;
  readonly traceId?: string | null;
}

export interface OpsSignalCardProps {
  readonly agentPlatform?: string | null;
  readonly description?: string | null;
  readonly durationMs?: number | null;
  readonly impact?: "low" | "medium" | "high";
  readonly pipeline: string;
  readonly sessionId?: string | null;
  readonly severity?: "low" | "medium" | "high" | "critical";
  readonly signalCount?: number;
  readonly startedAt?: string;
  readonly status: "running" | "completed" | "failed" | "skipped";
  readonly title: string;
  readonly traceRefs?: TraceRefs | null;
}

const STATUS_STYLES: Record<string, string> = {
  running: "text-blue-700 border-blue-200 bg-blue-50",
  completed: "text-green-700 border-green-200 bg-green-50",
  failed: "text-destructive border-destructive/30 bg-destructive/10",
  skipped: "text-muted-foreground border-border bg-muted",
};

const IMPACT_STYLES: Record<string, string> = {
  high: "text-orange-700",
  medium: "text-yellow-700",
  low: "text-green-700",
};

function formatDuration(ms?: number | null): string {
  if (ms == null || Number.isNaN(ms)) {
    return "—";
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function TraceLink({ traceRefs }: { readonly traceRefs: TraceRefs }) {
  const { traceId, greptimeSpanId, parentSessionId, childSessionIds } =
    traceRefs;
  const hasTrace = Boolean(traceId ?? greptimeSpanId);
  const hasParent = Boolean(parentSessionId);
  const childCount = childSessionIds?.length ?? 0;

  if (!(hasTrace || hasParent) && childCount === 0) {
    return null;
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2 border-t pt-1.5 text-[10px] text-muted-foreground">
      {hasTrace && (
        <span
          className="cursor-default font-mono tabular-nums"
          title={`trace_id: ${traceId ?? "—"}  span_id: ${greptimeSpanId ?? "—"}`}
        >
          <span className="mr-0.5 uppercase tracking-wide">trace</span>
          <span className="text-foreground">
            {(traceId ?? greptimeSpanId ?? "").slice(0, 8)}…
          </span>
        </span>
      )}
      {hasParent && (
        <span
          className="cursor-default tabular-nums"
          title={`parent_session_id: ${parentSessionId}`}
        >
          <span className="mr-0.5 uppercase tracking-wide">↑parent</span>
          <span className="text-foreground">
            {(parentSessionId ?? "").slice(0, 8)}
          </span>
        </span>
      )}
      {childCount > 0 && (
        <span className="cursor-default">
          <span className="mr-0.5 uppercase tracking-wide">↓sub</span>
          <span className="text-foreground">{childCount}</span>
        </span>
      )}
    </div>
  );
}

export function OpsSignalCard({
  pipeline,
  status,
  durationMs,
  signalCount,
  impact,
  sessionId,
  title,
  description,
  severity,
  startedAt,
  agentPlatform,
  traceRefs,
}: OpsSignalCardProps) {
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.skipped;
  const impactStyle = IMPACT_STYLES[impact ?? "medium"] ?? IMPACT_STYLES.medium;

  const platformKey = (agentPlatform ?? "").toLowerCase();
  const platformBadge =
    PLATFORM_BADGE_STYLES[platformKey] ?? PLATFORM_BADGE_STYLES.cursor;
  const platformLabel =
    PLATFORM_LABELS[platformKey] ?? (agentPlatform ?? "").slice(0, 7);

  return (
    <article className="rounded border bg-card px-2.5 py-2 font-mono text-[11px] leading-tight shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold uppercase tracking-wide">
              {pipeline}
            </span>
            <span
              className={`rounded border px-1 py-0.5 text-[10px] uppercase ${statusStyle}`}
            >
              {status}
            </span>
            {severity && (
              <span className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground uppercase">
                {severity}
              </span>
            )}
            {agentPlatform && (
              <span
                className={`rounded border px-1 py-0.5 text-[10px] uppercase ${platformBadge}`}
                title={`agent_platform: ${agentPlatform}`}
              >
                {platformLabel}
              </span>
            )}
          </div>
          <p className="mt-1 truncate font-medium text-foreground">{title}</p>
          {description && (
            <p className="mt-0.5 line-clamp-2 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1 border-t pt-1.5 text-[10px] text-muted-foreground tabular-nums">
        <div>
          <div className="uppercase tracking-wide">dur</div>
          <div className="text-foreground">{formatDuration(durationMs)}</div>
        </div>
        <div>
          <div className="uppercase tracking-wide">signals</div>
          <div className="text-foreground">{signalCount ?? 0}</div>
        </div>
        <div>
          <div className="uppercase tracking-wide">impact</div>
          <div className={impactStyle}>{impact ?? "—"}</div>
        </div>
        <div className="min-w-0">
          <div className="uppercase tracking-wide">session</div>
          <div
            className="truncate text-foreground"
            title={sessionId ?? undefined}
          >
            {sessionId ? sessionId.slice(0, 8) : "—"}
          </div>
        </div>
      </div>

      {traceRefs && <TraceLink traceRefs={traceRefs} />}

      {startedAt && (
        <div className="mt-1 text-[10px] text-muted-foreground">
          {startedAt}
        </div>
      )}
    </article>
  );
}
