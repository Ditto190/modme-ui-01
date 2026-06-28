"use client";

import { useMemo, useState } from "react";
import { useSessionOps } from "../hooks/use-session-ops";
import { OpsSignalCard } from "./ops-signal-card";

const PLATFORM_OPTIONS = [
  { value: "", label: "all platforms" },
  { value: "cursor", label: "cursor" },
  { value: "copilot", label: "copilot" },
  { value: "claude", label: "claude" },
  { value: "voltagent", label: "voltagent" },
  { value: "cloud", label: "cloud" },
  { value: "human", label: "human" },
] as const;

export function SessionOpsPanel() {
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<string>("");

  const { data, isLoading, isError, error } = useSessionOps({
    severity: severityFilter || undefined,
    agentPlatform: platformFilter || undefined,
    limit: 24,
  });

  const rows = useMemo(() => data?.data ?? [], [data?.data]);

  const rootRows = useMemo(
    () => rows.filter((r) => !r.traceRefs?.parentSessionId),
    [rows]
  );
  const subRows = useMemo(
    () => rows.filter((r) => Boolean(r.traceRefs?.parentSessionId)),
    [rows]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-muted-foreground text-xs" htmlFor="ops-severity">
          Severity
        </label>
        <select
          className="rounded border bg-background px-2 py-1 font-mono text-xs"
          id="ops-severity"
          onChange={(e) => setSeverityFilter(e.target.value)}
          value={severityFilter}
        >
          <option value="">all</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>

        <label className="text-muted-foreground text-xs" htmlFor="ops-platform">
          Platform
        </label>
        <select
          className="rounded border bg-background px-2 py-1 font-mono text-xs"
          id="ops-platform"
          onChange={(e) => setPlatformFilter(e.target.value)}
          value={platformFilter}
        >
          {PLATFORM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <span className="ml-auto text-[10px] text-muted-foreground">
          {data?.tenant_id
            ? `tenant ${data.tenant_id.slice(0, 8)}… · ${rows.length} rows`
            : "Session Ops"}
        </span>
      </div>

      {isLoading && (
        <p className="font-mono text-muted-foreground text-xs">
          Loading pipeline runs…
        </p>
      )}

      {isError && (
        <p className="font-mono text-destructive text-xs">
          {error instanceof Error
            ? error.message
            : "Failed to load Session Ops"}
        </p>
      )}

      {!(isLoading || isError) && rows.length === 0 && (
        <p className="font-mono text-muted-foreground text-xs">
          No pipeline runs yet — run{" "}
          <code className="text-foreground">yarn telemetry:sync --dry-run</code>
        </p>
      )}

      {rootRows.length > 0 && (
        <section aria-label="Root sessions">
          <div className="grid gap-2 md:grid-cols-2">
            {rootRows.map((row, index) => (
              <OpsSignalCard
                key={`${row.pipeline}-${row.sessionId ?? index}-${row.startedAt ?? index}`}
                {...row}
              />
            ))}
          </div>
        </section>
      )}

      {subRows.length > 0 && (
        <section aria-label="Sub-agent sessions">
          <p className="mb-1 font-mono text-[10px] text-muted-foreground uppercase tracking-wide">
            ↓ sub-agent sessions ({subRows.length})
          </p>
          <div className="grid gap-2 pl-4 md:grid-cols-2">
            {subRows.map((row, index) => (
              <OpsSignalCard
                key={`sub-${row.pipeline}-${row.sessionId ?? index}-${row.startedAt ?? index}`}
                {...row}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
