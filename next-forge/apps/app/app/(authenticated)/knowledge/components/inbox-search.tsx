"use client";

import { useState } from "react";
import { useInboxEntries } from "../hooks/use-inbox-entries";
import { EntryCard } from "./entry-card";

const SEVERITY_OPTIONS = ["", "low", "medium", "high", "critical"] as const;
const TYPE_OPTIONS = [
  "",
  "architecture",
  "design",
  "code-review",
  "solution",
  "research",
  "snippet",
  "link",
  "component",
  "md",
  "txt",
] as const;

export function InboxSearch() {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<string>("");
  const [type, setType] = useState<string>("");

  const { data, isLoading, error, fetchNextPage, hasNextPage } =
    useInboxEntries({
      q: query || undefined,
      severity: severity || undefined,
      type: type || undefined,
    });

  const entries = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="space-y-4">
      {/* Search bar + filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          aria-label="Search knowledge base"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entries..."
          type="search"
          value={query}
        />
        <select
          aria-label="Filter by severity"
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onChange={(e) => setSeverity(e.target.value)}
          value={severity}
        >
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s ? `Severity: ${s}` : "All severities"}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by type"
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onChange={(e) => setType(e.target.value)}
          value={type}
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t ? `Type: ${t}` : "All types"}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          Loading...
        </div>
      )}

      {error && (
        <div
          className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-destructive text-sm"
          role="alert"
        >
          Failed to load entries: {error.message}
        </div>
      )}

      {!isLoading && entries.length === 0 && (
        <div className="py-8 text-center text-muted-foreground text-sm">
          No entries found. Drop files in{" "}
          <code className="rounded bg-muted px-1">
            GenerativeUI_monorepo/docs/inbox/
          </code>{" "}
          to get started.
        </div>
      )}

      <div
        aria-busy={isLoading}
        aria-label="Knowledge base entries"
        className="space-y-3"
        role="feed"
      >
        {entries.map((entry) => (
          <EntryCard entry={entry} key={entry.id} />
        ))}
      </div>

      {hasNextPage && (
        <button
          className="w-full rounded-md border px-4 py-2 text-sm hover:bg-accent"
          onClick={() => fetchNextPage()}
          type="button"
        >
          Load more
        </button>
      )}
    </div>
  );
}
