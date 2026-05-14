// ──────────────────────────────────────────────────────────────────────────────
// Typed props for each registered component type.
// ⚠️  Must stay in sync with:
//   • agent/main.py  ALLOWED_TYPES / upsert_ui_element validation
//   • src/app/page.tsx  renderElement() switch cases
// ──────────────────────────────────────────────────────────────────────────────

// ── Existing types ─────────────────────────────────────────────────────────────

export type StatCardProps = {
  title: string;
  value: string | number;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
};

export type DataTableProps = {
  columns: string[];
  data: Record<string, unknown>[];
};

export type ChartCardProps = {
  title: string;
  chartType: string;
  data: Record<string, unknown>[];
};

// ── New project-management types ───────────────────────────────────────────────

export type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  /** Optional badge label rendered next to the title */
  badge?: string;
};

export type StatusBadgeProps = {
  label: string;
  status: "success" | "warning" | "error" | "info" | "neutral";
  /** Optional descriptive text rendered below the badge */
  description?: string;
};

export type ActivityFeedItem = {
  id: string;
  actor: string;
  action: string;
  target?: string;
  timestamp: string;
  /** Optional icon name (used as a label fallback) */
  icon?: string;
};

export type ActivityFeedProps = {
  title?: string;
  items: ActivityFeedItem[];
};

export type ProgressItem = {
  id: string;
  label: string;
  /** 0–100. Enforced at runtime by the Zod schema in ProgressList.tsx. */
  percent: number;
  status?: "on_track" | "at_risk" | "blocked" | "complete";
};

export type ProgressListProps = {
  title?: string;
  items: ProgressItem[];
};

export type AlertItem = {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  message?: string;
  timestamp?: string;
};

export type AlertListProps = {
  title?: string;
  items: AlertItem[];
};

// ── Discriminated union ────────────────────────────────────────────────────────

export type UIElement =
  | { id: string; type: "StatCard"; props: StatCardProps }
  | { id: string; type: "DataTable"; props: DataTableProps }
  | { id: string; type: "ChartCard"; props: ChartCardProps }
  | { id: string; type: "SectionHeader"; props: SectionHeaderProps }
  | { id: string; type: "StatusBadge"; props: StatusBadgeProps }
  | { id: string; type: "ActivityFeed"; props: ActivityFeedProps }
  | { id: string; type: "ProgressList"; props: ProgressListProps }
  | { id: string; type: "AlertList"; props: AlertListProps };

export type AgentState = {
  elements: UIElement[];
};