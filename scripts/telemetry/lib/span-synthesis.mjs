#!/usr/bin/env node
/**
 * Synthesize Greptime agent_spans from collected telemetry events (Phase A — SQL insert).
 */
import { createHash, randomBytes } from "node:crypto";
import { SpanTaxonomy } from "./agent-platform-adapters.mjs";
import { resolveTenantId } from "./telemetry-bridge.mjs";

const CORRELATION_KEYS = [
  "session_id",
  "tenant_id",
  "agent_platform",
  "parent_session_id",
  "worktree",
  "branch",
];

function stableSpanId(seed) {
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

function stableTraceId(sessionId) {
  if (!sessionId) {
    return randomBytes(16).toString("hex");
  }
  return createHash("sha256").update(`trace:${sessionId}`).digest("hex").slice(0, 32);
}

function metaString(event, key) {
  const md = event.metadata ?? {};
  const val = md[key] ?? event[key];
  return val != null ? String(val) : "";
}

function eventPlatform(events) {
  for (const e of events) {
    const p = e.metadata?.agent_platform ?? e.agent_platform;
    if (p) return String(p);
  }
  return process.env.AGENT_OWNER ?? "unknown";
}

function buildSpan(taxonomy, seed, trace_id, tenant_id, session_id, agent_platform) {
  const span_id = stableSpanId(seed);
  const now = Date.now();
  return {
    span_id,
    trace_id,
    tenant_id,
    session_id,
    span_name: taxonomy.span_name,
    duration_ms: taxonomy.attributes["duration.ms"] ?? 0,
    timestamp: now,
    attributes: {
      ...taxonomy.attributes,
      "agent.platform": agent_platform,
    },
  };
}

function taxonomyForEvent(event) {
  const source = event.source ?? "";
  const session_id = event.session_id ?? event.metadata?.session_id ?? "";

  if (source === "lean-ctx-marker" || source === "lean-ctx-journal") {
    const mode = metaString(event, "mode") || "auto";
    const path = metaString(event, "path") || event.message;
    return {
      taxonomy: SpanTaxonomy.leanCtxRead(path, mode, 0),
      seed: `lean_ctx.read:${session_id}:${path}:${String(event.message).slice(0, 40)}`,
    };
  }

  if (source === "session-logger" && /toolCall|tool_call/i.test(String(event.message))) {
    return {
      taxonomy: SpanTaxonomy.agentToolCall("session-logger", null, 0),
      seed: `agent.tool_call:${session_id}:${event.message}`,
    };
  }

  if (source === "git-hook") {
    return {
      taxonomy: SpanTaxonomy.agentToolCall(`git.${metaString(event, "hook")}`, null, 0),
      seed: `git.hook:${session_id}:${event.message}`,
    };
  }

  if (source === "agenttrace") {
    return {
      taxonomy: SpanTaxonomy.agentToolCall("agenttrace", null, 0),
      seed: `agenttrace:${session_id}:${event.message}`,
    };
  }

  return null;
}

export function computeCorrelationCoverage(events, tenantId) {
  const tenant_id = resolveTenantId(tenantId);
  if (events.length === 0) {
    return { total: 0, with_all_keys: 0, pct: 100, keys: CORRELATION_KEYS };
  }

  let withAll = 0;
  for (const event of events) {
    const md = event.metadata ?? {};
    const present = CORRELATION_KEYS.filter((key) => {
      if (key === "tenant_id") return Boolean(tenant_id);
      if (key === "trace_id" || key === "span_id") return true;
      const val = event[key] ?? md[key];
      return val != null && String(val).length > 0;
    });
    if (present.length >= CORRELATION_KEYS.length - 2) {
      withAll += 1;
    }
  }

  return {
    total: events.length,
    with_all_keys: withAll,
    pct: Math.round((withAll / events.length) * 1000) / 10,
    keys: CORRELATION_KEYS,
  };
}

/**
 * @param {object[]} events
 * @param {{ tenantId?: string, pipelineRunId?: string }} ctx
 */
export function synthesizeSpansFromEvents(events, ctx = {}) {
  const tenant_id = resolveTenantId(ctx.tenantId);
  const spans = [];
  const seen = new Set();

  const sessionIds = [
    ...new Set(events.map((e) => e.session_id ?? e.metadata?.session_id).filter(Boolean)),
  ];
  const primarySession = sessionIds[0] ?? process.env.AGENT_SESSION_ID ?? null;
  const trace_id = stableTraceId(primarySession);
  const platform = eventPlatform(events);

  if (ctx.pipelineRunId) {
    const syncSeed = `telemetry.sync:${ctx.pipelineRunId}`;
    seen.add(syncSeed);
    spans.push(
      buildSpan(
        SpanTaxonomy.telemetrySync(ctx.pipelineRunId, events.length),
        syncSeed,
        trace_id,
        tenant_id,
        primarySession,
        platform
      )
    );
  }

  for (const event of events) {
    const mapped = taxonomyForEvent(event);
    if (!mapped || seen.has(mapped.seed)) continue;
    seen.add(mapped.seed);
    const session_id = event.session_id ?? event.metadata?.session_id ?? primarySession;
    spans.push(buildSpan(mapped.taxonomy, mapped.seed, trace_id, tenant_id, session_id, platform));
  }

  const parentSession =
    process.env.PARENT_SESSION_ID ?? events.find((e) => e.metadata?.parent_session_id)?.metadata?.parent_session_id ?? null;
  if (parentSession && primarySession) {
    const handoffSeed = `agent.handoff:${parentSession}:${primarySession}`;
    if (!seen.has(handoffSeed)) {
      seen.add(handoffSeed);
      spans.push(
        buildSpan(
          SpanTaxonomy.agentHandoff(parentSession, primarySession),
          handoffSeed,
          trace_id,
          tenant_id,
          primarySession,
          platform
        )
      );
    }
  }

  return { spans, coverage: computeCorrelationCoverage(events, tenant_id), trace_id };
}
