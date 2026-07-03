import { z } from "zod";
import { InboxAgentRoleSchema, InboxSeveritySchema } from "./inbox";

/** Observability data contract v1.1 — sync with docs/inbox-pipeline/contracts/observability-contract.v1.json */

export const OBSERVABILITY_CONTRACT_VERSION = "1.1";

/**
 * All telemetry event source identifiers — includes lean-ctx collect sources added in v1.1.
 * Keep in sync with observability-contract.v1.json enums.telemetrySource.
 */
export const TelemetrySourceSchema = z.enum([
  "session-logger",
  "session-logger-prompt",
  "agent-orchestrator",
  "test-results",
  "telemetry-bridge",
  "lean-ctx-journal",
  "lean-ctx-tee",
  "lean-ctx-debug",
  "lean-ctx-marker",
  "lean-ctx-archive",
]);

export type TelemetrySource = z.infer<typeof TelemetrySourceSchema>;

export const TelemetryLevelSchema = z.enum(["debug", "info", "warn", "error"]);

export const PipelineStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
  "skipped",
]);

export const EvalImpactLevelSchema = z.enum(["low", "medium", "high"]);

export const TelemetryEventSchema = z.object({
  tenant_id: z.string().uuid(),
  session_id: z.string().nullable().optional(),
  message: z.string().min(1),
  source: z.string().min(1),
  level: TelemetryLevelSchema.default("info"),
  severity: InboxSeveritySchema.optional(),
  agent_role: InboxAgentRoleSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  content_hash: z.string().length(64).optional(),
});

export const PipelineRunSchema = z.object({
  tenant_id: z.string().uuid(),
  pipeline: z.string().default("telemetry"),
  mode: z.string().default("collect"),
  trigger_source: z.string().default("manual"),
  status: PipelineStatusSchema,
  started_at: z.string(),
  finished_at: z.string().nullable().optional(),
  source_path: z.string().nullable().optional(),
  stats: z.record(z.string(), z.unknown()).default({}),
  error_message: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  duration_ms: z.number().int().nonnegative().nullable().optional(),
});

export const EvalSignalSchema = z.object({
  tenant_id: z.string().uuid(),
  session_id: z.string().nullable().optional(),
  theme_id: z.string().nullable().optional(),
  source: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).nullable().optional(),
  impact: EvalImpactLevelSchema.default("medium"),
  severity: InboxSeveritySchema.optional(),
  evidence: z.record(z.string(), z.unknown()).default({}),
});

export const TestResultSchema = z.object({
  tenant_id: z.string().uuid(),
  contract_name: z.string().min(1),
  rule_id: z.string().min(1),
  passed: z.boolean(),
  severity: InboxSeveritySchema,
  framework: z
    .enum(["playwright", "junit", "vitest", "other"])
    .default("other"),
  evidence: z.record(z.string(), z.unknown()).default({}),
});

export type TelemetryEventRecord = z.infer<typeof TelemetryEventSchema>;
export type PipelineRunRecord = z.infer<typeof PipelineRunSchema>;
export type EvalSignalRecord = z.infer<typeof EvalSignalSchema>;
export type TestResultRecord = z.infer<typeof TestResultSchema>;

/** v1.1 — OTel + multi-agent fields */

export const AgentPlatformSchema = z.enum([
  "cursor",
  "copilot",
  "claude",
  "voltagent",
  "cloud",
  "lean-ctx",
  "human",
]);

export const OtelSpanNameSchema = z.enum([
  "agent.session",
  "agent.tool_call",
  "agent.handoff",
  "telemetry.sync",
  "lean_ctx.read",
]);

export const LeanCtxSourceSchema = z.enum([
  "lean-ctx-journal",
  "lean-ctx-tee",
  "lean-ctx-debug",
  "lean-ctx-marker",
  "lean-ctx-archive",
  "lean-ctx-collect",
]);

/** Correlation row linking Supabase metadata to a Greptime span */
export const TraceRefSchema = z.object({
  tenant_id: z.string().uuid(),
  session_id: z.string().nullable().optional(),
  trace_id: z.string().min(1),
  greptime_span_id: z.string().min(1),
  agent_platform: AgentPlatformSchema.optional(),
  service_name: z.string().nullable().optional(),
  branch: z.string().nullable().optional(),
  worktree: z.string().nullable().optional(),
  parent_session_id: z.string().nullable().optional(),
  created_at: z.string().optional(),
});

/** OTel-normalized span for Greptime agent_spans table */
export const OtelSpanSchema = z.object({
  span_id: z.string().min(1),
  trace_id: z.string().min(1),
  tenant_id: z.string().uuid(),
  session_id: z.string().nullable().optional(),
  parent_span_id: z.string().nullable().optional(),
  span_name: OtelSpanNameSchema,
  duration_ms: z.number().int().nonnegative().default(0),
  attributes: z.record(z.string(), z.unknown()).default({}),
  timestamp: z.number().int().nonnegative().optional(),
});

/** Extended TelemetryEvent with agent_platform (v1.1) */
export const TelemetryEventV11Schema = TelemetryEventSchema.extend({
  agent_platform: AgentPlatformSchema.optional(),
});

export type AgentPlatform = z.infer<typeof AgentPlatformSchema>;
export type TraceRefRecord = z.infer<typeof TraceRefSchema>;
export type OtelSpanRecord = z.infer<typeof OtelSpanSchema>;
export type TelemetryEventV11Record = z.infer<typeof TelemetryEventV11Schema>;
