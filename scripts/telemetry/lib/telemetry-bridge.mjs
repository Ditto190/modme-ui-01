#!/usr/bin/env node
/**
 * Telemetry bridge — normalize (Zod) → dual-write Supabase + Greptime.
 * Stage lifecycle: raw → normalized → stored → promoted (high severity → inbox hint).
 */
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  evalSignalSchema,
  pipelineRunSchema,
  telemetryEventSchema,
} from "../../../packages/intake-contracts/index.mjs";
import { loadRootEnv } from "../../lib/load-root-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

export const DEFAULT_DEV_TENANT_ID = "00000000-0000-4000-8000-000000000001";

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/,
  /sbp_[a-zA-Z0-9]+/,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+/i,
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
];

export function resolveTenantId(explicit) {
  return explicit ?? process.env.DEV_TENANT_ID ?? DEFAULT_DEV_TENANT_ID;
}

export function redactSecrets(text) {
  let out = String(text);
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
}

export function contentHash(payload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!(url && key)) return null;
  return createClient(url, key);
}

export async function openPipelineRun({
  tenantId,
  pipeline = "telemetry",
  mode = "collect",
  triggerSource = "cli",
  metadata = {},
  dryRun = false,
}) {
  const tenant_id = resolveTenantId(tenantId);
  const row = pipelineRunSchema.parse({
    tenant_id,
    pipeline,
    mode,
    trigger_source: triggerSource,
    status: "running",
    started_at: new Date().toISOString(),
    metadata: {
      ...metadata,
      agent_session_id: process.env.AGENT_SESSION_ID ?? null,
    },
  });

  if (dryRun) {
    return { id: `dry-run-${Date.now()}`, dryRun: true, row };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { id: null, skipped: true, reason: "no_supabase", row };
  }

  const { data, error } = await supabase
    .from("pipeline_runs")
    .insert({
      tenant_id: row.tenant_id,
      pipeline: row.pipeline,
      mode: row.mode,
      trigger_source: row.trigger_source,
      status: row.status,
      started_at: row.started_at,
      metadata: row.metadata,
    })
    .select("id")
    .single();

  if (error) throw new Error(`pipeline_runs insert failed: ${error.message}`);
  return { id: data.id, row };
}

export async function closePipelineRun({
  pipelineRunId,
  status = "completed",
  stats = {},
  errorMessage = null,
  dryRun = false,
}) {
  if (!pipelineRunId || dryRun) {
    return { closed: dryRun, pipelineRunId, status, stats };
  }

  const supabase = getSupabase();
  if (!supabase) return { closed: false, reason: "no_supabase" };

  const started = Date.now();
  const { error } = await supabase
    .from("pipeline_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      stats,
      error_message: errorMessage,
      duration_ms: stats.duration_ms ?? null,
    })
    .eq("id", pipelineRunId);

  if (error) throw new Error(`pipeline_runs update failed: ${error.message}`);
  return { closed: true, pipelineRunId, elapsedMs: Date.now() - started };
}

export function normalizeTelemetryEvent(raw, tenantId) {
  const tenant_id = resolveTenantId(tenantId);
  const parsed = telemetryEventSchema.safeParse({
    ...raw,
    tenant_id,
    message: redactSecrets(raw.message ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, stage: "normalized", issues: parsed.error.issues };
  }
  const hash = contentHash(parsed.data);
  return { ok: true, stage: "normalized", data: parsed.data, contentHash: hash };
}

export function normalizeEvalSignal(raw, tenantId) {
  const tenant_id = resolveTenantId(tenantId);
  const session_id = raw.session_id ?? raw.sessionId ?? null;
  const theme_id = raw.theme_id ?? (Array.isArray(raw.themes) ? raw.themes[0] : null) ?? null;
  const parsed = evalSignalSchema.safeParse({
    ...raw,
    tenant_id,
    session_id,
    theme_id,
  });
  if (!parsed.success) {
    return { ok: false, stage: "normalized", issues: parsed.error.issues };
  }
  return { ok: true, stage: "normalized", data: parsed.data };
}

export async function storeTelemetryEvent(normalized, { dryRun = false } = {}) {
  if (!normalized.ok) return { stored: false, reason: "invalid" };

  if (dryRun) {
    return { stored: true, dryRun: true, stage: "stored", id: null };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { stored: false, stage: "stored", reason: "no_supabase" };
  }

  const row = normalized.data;
  const { data, error } = await supabase
    .from("telemetry_events")
    .insert({
      id: randomUUID(),
      tenant_id: row.tenant_id,
      session_id: row.session_id ?? null,
      message: row.message,
      source: row.source,
      level: row.level,
      metadata: {
        ...row.metadata,
        content_hash: normalized.contentHash,
        severity: row.severity ?? null,
        agent_role: row.agent_role ?? null,
      },
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { stored: true, stage: "stored", idempotent: true };
    }
    throw new Error(`telemetry_events insert failed: ${error.message}`);
  }

  return { stored: true, stage: "stored", id: data.id };
}

export async function storeEvalThemes(themes, { dryRun = false } = {}) {
  if (!Array.isArray(themes) || themes.length === 0) {
    return { count: 0, stage: "stored" };
  }

  if (dryRun) {
    return { count: themes.length, dryRun: true, stage: "stored" };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { count: 0, stage: "stored", reason: "no_supabase" };
  }

  const rows = themes.map((t) => ({
    id: t.id,
    label: t.label,
    description: t.description ?? null,
    taxonomy_code: t.taxonomy_code ?? null,
    aliases: t.aliases ?? [],
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("eval_themes").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`eval_themes upsert failed: ${error.message}`);

  return { count: rows.length, stage: "stored" };
}

export async function storeEvalSignals(signals, { dryRun = false, tenantId } = {}) {
  const tenant_id = resolveTenantId(tenantId);
  const normalized = signals
    .map((s) => normalizeEvalSignal({ ...s, tenant_id }, tenant_id))
    .filter((n) => n.ok)
    .map((n) => n.data);

  if (dryRun) {
    return { count: normalized.length, dryRun: true, stage: "stored" };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { count: 0, stage: "stored", reason: "no_supabase" };
  }

  if (normalized.length === 0) return { count: 0, stage: "stored" };

  const rows = normalized.map((s) => ({
    id: randomUUID(),
    tenant_id: s.tenant_id,
    source: s.source,
    title: s.title,
    description: s.description ?? null,
    impact: s.impact,
    theme_id: s.theme_id ?? null,
    evidence: { ...s.evidence, session_id: s.session_id ?? null },
  }));

  const { error } = await supabase.from("eval_signals").insert(rows);
  if (error) throw new Error(`eval_signals insert failed: ${error.message}`);

  return { count: rows.length, stage: "stored" };
}

export async function writeGreptimeSpan(span, { dryRun = false } = {}) {
  if (dryRun) return { greptime: true, dryRun: true };

  const url = process.env.GREPTIME_PSQL_URL;
  if (!url) return { greptime: false, reason: "no_greptime_url" };

  try {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    await client.query(
      `INSERT INTO agent_spans(span_id, trace_id, tenant_id, session_id, span_name, duration_ms, attributes, started_at, ended_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (span_id) DO UPDATE SET
         duration_ms = EXCLUDED.duration_ms,
         attributes = EXCLUDED.attributes`,
      [
        span.span_id,
        span.trace_id,
        span.tenant_id,
        span.session_id ?? null,
        span.span_name ?? null,
        span.duration_ms ?? 0,
        JSON.stringify(span.attributes ?? {}),
        span.timestamp ?? Date.now(),
        (span.timestamp ?? Date.now()) + (span.duration_ms ?? 0),
      ]
    );
    await client.end();
    return { greptime: true, span_id: span.span_id };
  } catch (err) {
    return {
      greptime: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function upsertEvalSession({
  externalSessionId,
  tenantId,
  agent = null,
  worktreePath = null,
  branch = null,
  startedAt = null,
  endedAt = null,
  metadata = {},
  dryRun = false,
}) {
  const tenant_id = resolveTenantId(tenantId);
  if (!externalSessionId) {
    return { upserted: false, reason: "missing_session_id" };
  }

  const row = {
    tenant_id,
    external_session_id: externalSessionId,
    agent,
    worktree_path: worktreePath,
    branch,
    started_at: startedAt ?? new Date().toISOString(),
    ended_at: endedAt,
    metadata: {
      ...metadata,
      agent_session_id: process.env.AGENT_SESSION_ID ?? externalSessionId,
    },
  };

  if (dryRun) {
    return { upserted: true, dryRun: true, row };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { upserted: false, reason: "no_supabase", row };
  }

  if (endedAt && !startedAt && !worktreePath && !branch && !agent) {
    const { data, error } = await supabase
      .from("eval_sessions")
      .update({ ended_at: endedAt, metadata: row.metadata })
      .eq("external_session_id", externalSessionId)
      .select("id")
      .maybeSingle();

    if (error) throw new Error(`eval_sessions finish failed: ${error.message}`);
    return { upserted: Boolean(data), id: data?.id ?? null, row };
  }

  const { data, error } = await supabase
    .from("eval_sessions")
    .upsert(row, { onConflict: "external_session_id" })
    .select("id")
    .single();

  if (error) throw new Error(`eval_sessions upsert failed: ${error.message}`);
  return { upserted: true, id: data.id, row };
}

export async function registerObservabilityReportArtefact({ outputPath, dryRun = false }) {
  if (!outputPath || dryRun) {
    return { registered: dryRun, outputPath };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { registered: false, reason: "no_supabase" };
  }

  const slug = "observability-report-v1";
  const { data: schemaRow, error: schemaError } = await supabase
    .from("output_schemas")
    .upsert(
      {
        schema_type: "observability-report",
        name: "Observability Report",
        slug,
        version: "1.0.0",
        schema: { type: "object", properties: { generatedAt: { type: "string" } } },
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (schemaError) {
    throw new Error(`output_schemas upsert failed: ${schemaError.message}`);
  }

  const { error: artefactError } = await supabase.from("output_artefacts").insert({
    artefact_type: "html-report",
    title: "Observability pipeline report",
    content: outputPath,
    file_path: outputPath,
    status: "published",
    schema_id: schemaRow.id,
  });

  if (artefactError) {
    throw new Error(`output_artefacts insert failed: ${artefactError.message}`);
  }

  return { registered: true, schemaId: schemaRow.id, outputPath };
}

/**
 * Write a trace_refs row to Supabase linking Supabase metadata with a Greptime span.
 * This is the dual-write correlation key for cross-store queries.
 */
export async function writeTraceRef({
  tenantId,
  sessionId,
  traceId,
  spanId,
  agentPlatform = "unknown",
  branch = "",
  worktree = "",
  serviceName = "modme-agent-orchestrator",
  parentSessionId = null,
  dryRun = false,
} = {}) {
  const tenant_id = resolveTenantId(tenantId);

  const row = {
    tenant_id,
    session_id: sessionId ?? null,
    trace_id: traceId,
    greptime_span_id: spanId,
    agent_platform: agentPlatform,
    service_name: serviceName,
    branch: branch || null,
    worktree: worktree || null,
    parent_session_id: parentSessionId ?? null,
    created_at: new Date().toISOString(),
  };

  if (dryRun) {
    return { written: true, dryRun: true, row };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { written: false, reason: "no_supabase", row };
  }

  const { data, error } = await supabase.from("trace_refs").insert(row).select("id").maybeSingle();

  if (error) {
    if (error.code === "42P01") {
      return { written: false, reason: "table_not_found", row };
    }
    return { written: false, reason: error.message, row };
  }

  return { written: true, id: data?.id ?? null, row };
}

export async function bridgeCollectPayload({
  events = [],
  signals = [],
  themes = [],
  spans = [],
  tenantId,
  pipelineRunId = null,
  dryRun = false,
}) {
  loadRootEnv({ fileWins: true });
  const stats = {
    normalized: 0,
    stored: 0,
    promoted: 0,
    greptime: 0,
    errors: 0,
  };

  for (const raw of events) {
    const normalized = normalizeTelemetryEvent(raw, tenantId);
    if (!normalized.ok) {
      stats.errors += 1;
      continue;
    }
    stats.normalized += 1;
    const stored = await storeTelemetryEvent(normalized, { dryRun });
    if (stored.stored) stats.stored += 1;

    const severity = normalized.data.severity;
    if (severity === "high" || severity === "critical") {
      stats.promoted += 1;
    }
  }

  const themeResult = await storeEvalThemes(themes, { dryRun });
  stats.stored += themeResult.count ?? 0;

  const signalResult = await storeEvalSignals(signals, { dryRun, tenantId });
  stats.stored += signalResult.count ?? 0;

  for (const span of spans) {
    const res = await writeGreptimeSpan(
      { ...span, tenant_id: resolveTenantId(tenantId) },
      { dryRun }
    );
    if (res.greptime) stats.greptime += 1;
  }

  return {
    pipeline_run_id: pipelineRunId,
    stats,
    tenant_id: resolveTenantId(tenantId),
  };
}
