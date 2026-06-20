import type { InboxEntryListItem } from "../hooks/use-inbox-entries";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  low: "bg-green-50 text-green-700 border-green-200",
};

interface EntryCardProps {
  readonly entry: InboxEntryListItem;
}

export function EntryCard({ entry }: EntryCardProps) {
  const severityStyle =
    SEVERITY_STYLES[entry.severity] ?? SEVERITY_STYLES.medium;
  const date = new Date(entry.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-accent/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-sm">
            {entry.title ?? entry.sourceFile}
          </h3>
          {entry.summary && (
            <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
              {entry.summary}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded border px-2 py-0.5 font-medium text-xs ${severityStyle}`}
          title={`Severity: ${entry.severity}`}
        >
          {entry.severity}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {entry.entryType && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
            {entry.entryType}
          </span>
        )}
        {entry.category && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary text-xs">
            {entry.category.name}
          </span>
        )}
        {entry.tags?.slice(0, 4).map((tag) => (
          <span
            className="rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground text-xs"
            key={tag}
          >
            #{tag}
          </span>
        ))}
        {(entry.tags?.length ?? 0) > 4 && (
          <span className="text-muted-foreground text-xs">
            +{(entry.tags?.length ?? 0) - 4} more
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3 text-muted-foreground text-xs">
        {entry.agentName && (
          <span>by {entry.agentRole ?? entry.agentName}</span>
        )}
        {entry.branchName && (
          <code className="rounded bg-muted px-1">{entry.branchName}</code>
        )}
        <span className="ml-auto">{date}</span>
      </div>
    </article>
  );
}
