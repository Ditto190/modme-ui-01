import { database } from "@repo/database";
import { ingestTelemetry } from "@repo/observability/ingest/telemetry-ingestor";
import { createLogger } from "@repo/observability/logger";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const logger = createLogger("api.telemetry.ingest");

const DEFAULT_TENANT_ID = "00000000-0000-4000-8000-000000000001";

function resolveTenantId(request: NextRequest, bodyTenant?: string): string {
  const { searchParams } = new URL(request.url);
  return (
    bodyTenant ??
    searchParams.get("tenant_id") ??
    process.env.DEV_TENANT_ID ??
    DEFAULT_TENANT_ID
  );
}

function resolveSignalCount(
  stats: Record<string, unknown> | null | undefined,
  sessionId: string | null,
  signalCountBySession: Map<string, number>
): number {
  if (typeof stats?.stored === "number") {
    return stats.stored;
  }
  if (typeof stats?.signals === "number") {
    return stats.signals;
  }
  if (sessionId) {
    return signalCountBySession.get(sessionId) ?? 0;
  }
  return 0;
}

function pickStringField(
  primary: Record<string, unknown> | null | undefined,
  primaryKey: string,
  fallback: Record<string, unknown> | null | undefined,
  fallbackKey: string
): string | null {
  const fromPrimary = primary?.[primaryKey];
  if (typeof fromPrimary === "string") {
    return fromPrimary;
  }
  const fromFallback = fallback?.[fallbackKey];
  if (typeof fromFallback === "string") {
    return fromFallback;
  }
  return null;
}

function mapImpactToSeverity(impact: string): "low" | "medium" | "high" {
  if (impact === "high") {
    return "high";
  }
  if (impact === "low") {
    return "low";
  }
  return "medium";
}

function resolveEventTenant(
  event: Record<string, unknown>,
  fallbackTenantId: string
): string {
  if (typeof event.tenant_id === "string") {
    return event.tenant_id;
  }
  if (typeof event.tenantId === "string") {
    return event.tenantId;
  }
  return fallbackTenantId;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normaliseIngestEvent(
  event: unknown,
  fallbackTenantId: string
): {
  message: string;
  source: string;
  level: string;
  sessionId: string | null;
  tenantId: string;
  metadata: Record<string, unknown>;
} {
  const record = typeof event === "object" && event !== null ? event : {};
  const eventRecord = record as Record<string, unknown>;

  return {
    message: String(eventRecord.message ?? ""),
    source: String(eventRecord.source ?? "api"),
    level: typeof eventRecord.level === "string" ? eventRecord.level : "info",
    sessionId:
      readOptionalString(eventRecord.session_id) ??
      readOptionalString(eventRecord.sessionId),
    tenantId: resolveEventTenant(eventRecord, fallbackTenantId),
    metadata:
      typeof eventRecord.metadata === "object" && eventRecord.metadata
        ? (eventRecord.metadata as Record<string, unknown>)
        : {},
  };
}

/**
 * GET /telemetry/ingest
 * Session Ops feed — recent pipeline_runs + eval_signals for Knowledge UI.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const tenantId = resolveTenantId(request);
  const severity = searchParams.get("severity") ?? undefined;
  const agentPlatform = searchParams.get("agent_platform") ?? undefined;
  const sessionIdFilter = searchParams.get("session_id") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);

  try {
    const [runs, signals] = await Promise.all([
      database.pipelineRun.findMany({
        where: { tenantId },
        orderBy: { startedAt: "desc" },
        take: limit * 2,
      }),
      database.evalSignal.findMany({
        where: {
          tenantId,
          ...(severity ? { impact: severity } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit * 2,
      }),
    ]);

    const signalCountBySession = new Map<string, number>();
    for (const signal of signals) {
      if (!signal.sessionId) {
        continue;
      }
      signalCountBySession.set(
        signal.sessionId,
        (signalCountBySession.get(signal.sessionId) ?? 0) + 1
      );
    }

    const runRows = runs
      .map((run) => {
        const metadata = run.metadata as Record<string, unknown>;
        const stats = run.stats as Record<string, unknown>;
        const sessionId = pickStringField(
          metadata,
          "agent_session_id",
          stats,
          "session_id"
        );
        const signalCount = resolveSignalCount(
          stats,
          sessionId,
          signalCountBySession
        );

        const rowAgentPlatform = pickStringField(
          metadata,
          "agent_platform",
          stats,
          "agent_platform"
        );

        return {
          pipeline: run.pipeline,
          status: run.status as "running" | "completed" | "failed" | "skipped",
          durationMs: run.durationMs ? Number(run.durationMs) : null,
          signalCount,
          impact: "medium" as const,
          sessionId,
          title: `${run.pipeline} · ${run.mode}`,
          description:
            run.errorMessage ??
            (typeof stats?.label === "string" ? stats.label : null),
          severity:
            run.status === "failed" ? ("high" as const) : ("medium" as const),
          startedAt: run.startedAt.toISOString(),
          agentPlatform: rowAgentPlatform,
          envelopePath:
            typeof metadata?.envelope_path === "string"
              ? metadata.envelope_path
              : null,
          traceRefs: {
            traceId:
              typeof stats?.trace_id === "string" ? stats.trace_id : null,
            greptimeSpanId:
              typeof stats?.greptime_span_id === "string"
                ? stats.greptime_span_id
                : null,
            parentSessionId:
              typeof metadata?.parent_session_id === "string"
                ? metadata.parent_session_id
                : null,
          },
        };
      })
      .filter((row) => {
        if (sessionIdFilter && row.sessionId !== sessionIdFilter) {
          return false;
        }
        if (agentPlatform && row.agentPlatform !== agentPlatform) {
          return false;
        }
        return true;
      });

    const signalRows = signals
      .map((signal) => ({
        pipeline: "eval-signal",
        status: "completed" as const,
        durationMs: null,
        signalCount: 1,
        impact: signal.impact as "low" | "medium" | "high",
        sessionId: signal.sessionId,
        title: signal.title,
        description: signal.description,
        severity: mapImpactToSeverity(signal.impact),
        startedAt: signal.createdAt.toISOString(),
        agentPlatform: null as string | null,
        envelopePath: null as string | null,
        traceRefs: null,
      }))
      .filter((row) => {
        if (sessionIdFilter && row.sessionId !== sessionIdFilter) {
          return false;
        }
        return !(severity && row.severity !== severity);
      });

    const merged = [...runRows, ...signalRows]
      .sort(
        (a, b) => Date.parse(b.startedAt ?? "") - Date.parse(a.startedAt ?? "")
      )
      .slice(0, limit);

    return NextResponse.json({
      data: merged,
      tenant_id: tenantId,
      count: merged.length,
    });
  } catch (error) {
    logger.error(error, { route: "GET /telemetry/ingest" });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "query failed",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /telemetry/ingest
 * Accepts single event or batch; persists via @repo/observability TelemetryBatcher.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const events = Array.isArray(body) ? body : [body];
    const tenantId = resolveTenantId(
      request,
      typeof body?.tenant_id === "string" ? body.tenant_id : undefined
    );

    let accepted = 0;
    for (const event of events) {
      const payload = normaliseIngestEvent(event, tenantId);
      await ingestTelemetry(payload);
      accepted += 1;
    }

    logger.info("telemetry batch ingested", { accepted, tenantId });
    return NextResponse.json({ ok: true, accepted, tenant_id: tenantId });
  } catch (error) {
    logger.error(error, { route: "POST /telemetry/ingest" });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "ingest failed",
      },
      { status: 400 }
    );
  }
}
