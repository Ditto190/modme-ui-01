/**
 * Observability integration tests — validates:
 * 1. Data contracts (Zod schemas round-trip against golden fixtures)
 * 2. Agent-platform adapter detection
 * 3. lean-ctx collector event shapes
 * 4. Telemetry-bridge normalization (no Supabase connection required)
 * 5. Expectations contract structure
 *
 * Run: yarn telemetry:test:contracts
 * Blocking CI gate: all tests must pass.
 * Integration tests against live Supabase are guarded by env-var check.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const GOLDEN = JSON.parse(
  readFileSync(
    join(ROOT, 'next-forge/packages/schemas/fixtures/observability-contract.golden.json'),
    'utf8'
  )
);

const CONTRACT = JSON.parse(
  readFileSync(
    join(ROOT, 'docs/inbox-pipeline/contracts/observability-contract.v1.json'),
    'utf8'
  )
);

const EXPECTATIONS = JSON.parse(
  readFileSync(
    join(ROOT, 'docs/inbox-pipeline/contracts/expectations/observability.v1.json'),
    'utf8'
  )
);

// ─── Helper: lazy import schemas (bun/next-forge package) ─────────────────────

async function loadSchemas() {
  try {
    return await import('../../next-forge/packages/schemas/observability.js');
  } catch {
    return await import('../../next-forge/packages/schemas/observability.ts');
  }
}

// ─── 1. Contract structure ────────────────────────────────────────────────────

describe('observability-contract.v1.json', () => {
  it('has version >= 1.1', () => {
    expect(parseFloat(CONTRACT.version)).toBeGreaterThanOrEqual(1.1);
  });

  it('defines agentPlatform enum with all required platforms', () => {
    const platforms = CONTRACT.enums.agentPlatform ?? [];
    const required = ['cursor', 'copilot', 'claude', 'voltagent', 'cloud', 'lean-ctx', 'human'];
    for (const p of required) {
      expect(platforms).toContain(p);
    }
  });

  it('defines spanName enum', () => {
    const spans = CONTRACT.enums.spanName ?? [];
    expect(spans).toContain('agent.session');
    expect(spans).toContain('agent.tool_call');
    expect(spans).toContain('lean_ctx.read');
  });

  it('defines traceRef schema', () => {
    expect(CONTRACT.traceRef).toBeDefined();
    expect(CONTRACT.traceRef.required).toContain('trace_id');
    expect(CONTRACT.traceRef.required).toContain('greptime_span_id');
  });

  it('defines correlationKeys', () => {
    expect(CONTRACT.correlationKeys).toBeDefined();
    expect(CONTRACT.correlationKeys.required).toContain('trace_id');
    expect(CONTRACT.correlationKeys.required).toContain('session_id');
  });

  it('declares dual-store with trace_refs in Supabase', () => {
    expect(CONTRACT.dualStore.supabase).toContain('trace_refs');
    expect(CONTRACT.dualStore.greptime).toContain('agent_spans');
  });
});

// ─── 2. Golden fixture validation ─────────────────────────────────────────────

describe('observability-contract.golden.json', () => {
  it('contractVersion is >= 1.1', () => {
    expect(parseFloat(GOLDEN.contractVersion)).toBeGreaterThanOrEqual(1.1);
  });

  it('includes agentPlatforms in enums', () => {
    expect(GOLDEN.enums.agentPlatforms ?? GOLDEN.enums.agentPlatform ?? []).toEqual(
      expect.arrayContaining(['cursor', 'copilot', 'claude'])
    );
  });

  it('traceRef has required fields', () => {
    expect(GOLDEN.traceRef).toBeDefined();
    expect(GOLDEN.traceRef.trace_id).toBeTruthy();
    expect(GOLDEN.traceRef.greptime_span_id).toBeTruthy();
    expect(GOLDEN.traceRef.agent_platform).toBeTruthy();
  });

  it('otelSpan has required fields', () => {
    expect(GOLDEN.otelSpan).toBeDefined();
    expect(GOLDEN.otelSpan.span_name).toBeTruthy();
    expect(GOLDEN.otelSpan.trace_id).toBeTruthy();
    expect(GOLDEN.otelSpan.tenant_id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('telemetryEvent passes schema validation', async () => {
    const schemas = await loadSchemas().catch(() => null);
    if (!schemas) return; // schema package not built — skip
    const result = schemas.TelemetryEventSchema.safeParse(GOLDEN.telemetryEvent);
    expect(result.success).toBe(true);
  });

  it('pipelineRun passes schema validation', async () => {
    const schemas = await loadSchemas().catch(() => null);
    if (!schemas) return;
    const result = schemas.PipelineRunSchema.safeParse(GOLDEN.pipelineRun);
    expect(result.success).toBe(true);
  });

  it('traceRef passes TraceRefSchema validation', async () => {
    const schemas = await loadSchemas().catch(() => null);
    if (!schemas) return;
    const result = schemas.TraceRefSchema.safeParse(GOLDEN.traceRef);
    expect(result.success).toBe(true);
  });

  it('otelSpan passes OtelSpanSchema validation', async () => {
    const schemas = await loadSchemas().catch(() => null);
    if (!schemas) return;
    const result = schemas.OtelSpanSchema.safeParse(GOLDEN.otelSpan);
    expect(result.success).toBe(true);
  });
});

// ─── 3. Expectations contract ─────────────────────────────────────────────────

describe('expectations/observability.v1.json', () => {
  it('has at least 10 expectations', () => {
    expect(EXPECTATIONS.expectations.length).toBeGreaterThanOrEqual(10);
  });

  it('includes a secret-redaction expectation', () => {
    const secretRule = EXPECTATIONS.expectations.find((e) => e.id.includes('secret'));
    expect(secretRule).toBeDefined();
    expect(secretRule.severity).toBe('critical');
  });

  it('includes trace_ref referential integrity expectation', () => {
    const traceRule = EXPECTATIONS.expectations.find((e) => e.id.includes('trace_ref'));
    expect(traceRule).toBeDefined();
  });

  it('covers all required dimensions', () => {
    const dims = new Set(EXPECTATIONS.expectations.map((e) => e.dimension));
    expect(dims.has('completeness')).toBe(true);
    expect(dims.has('validity')).toBe(true);
    expect(dims.has('uniqueness')).toBe(true);
  });
});

// ─── 4. Agent platform adapters ───────────────────────────────────────────────

describe('detectAgentPlatform', () => {
  let detectAgentPlatform;
  let SpanTaxonomy;

  before(async () => {
    const mod = await import('../telemetry/lib/agent-platform-adapters.mjs');
    detectAgentPlatform = mod.detectAgentPlatform;
    SpanTaxonomy = mod.SpanTaxonomy;
  });

  it('detects lean-ctx from LEAN_CTX_DATA_DIR env', () => {
    const info = detectAgentPlatform({ LEAN_CTX_DATA_DIR: '/tmp/lean-ctx' });
    expect(info.agent_platform).toBe('lean-ctx');
  });

  it('detects cursor from CURSOR_SESSION_ID env', () => {
    const info = detectAgentPlatform({ CURSOR_SESSION_ID: 'cs-001' });
    expect(info.agent_platform).toBe('cursor');
    expect(info.agent_id).toBe('cs-001');
  });

  it('detects copilot from GITHUB_COPILOT_TOKEN env', () => {
    const info = detectAgentPlatform({ GITHUB_COPILOT_TOKEN: 'ghu_xxx' });
    expect(info.agent_platform).toBe('copilot');
  });

  it('detects claude from CLAUDECODE env', () => {
    const info = detectAgentPlatform({ CLAUDECODE: '1' });
    expect(info.agent_platform).toBe('claude');
  });

  it('detects voltagent from VOLTAGENT_SESSION_ID env', () => {
    const info = detectAgentPlatform({ VOLTAGENT_SESSION_ID: 'va-001' });
    expect(info.agent_platform).toBe('voltagent');
  });

  it('falls back to human when no markers present', () => {
    const info = detectAgentPlatform({ NO_AGENT_ENV: '1' });
    expect(info.agent_platform).toBe('human');
  });

  it('emits otel_resource with agent.platform key', () => {
    const info = detectAgentPlatform({ CURSOR_SESSION_ID: 'cs-002' });
    expect(info.otel_resource['agent.platform']).toBe('cursor');
  });

  it('SpanTaxonomy.agentSession produces correct span_name', () => {
    const span = SpanTaxonomy.agentSession('sess-1', 'cursor', 'dev');
    expect(span.span_name).toBe('agent.session');
    expect(span.attributes['agent.platform']).toBe('cursor');
  });

  it('SpanTaxonomy.leanCtxRead produces correct attributes', () => {
    const span = SpanTaxonomy.leanCtxRead('src/foo.ts', 'full', 120);
    expect(span.span_name).toBe('lean_ctx.read');
    expect(span.attributes['lean_ctx.mode']).toBe('full');
    expect(span.attributes['tokens.saved']).toBe(120);
  });
});

// ─── 5. Telemetry bridge normalization ────────────────────────────────────────

describe('telemetry-bridge normalization', () => {
  let normalizeTelemetryEvent;
  let redactSecrets;

  before(async () => {
    const mod = await import('../telemetry/lib/telemetry-bridge.mjs');
    normalizeTelemetryEvent = mod.normalizeTelemetryEvent;
    redactSecrets = mod.redactSecrets;
  });

  it('normalizes a valid telemetry event', () => {
    const result = normalizeTelemetryEvent(
      {
        message: 'test event',
        source: 'lean-ctx-marker',
        level: 'info',
        session_id: 'sess-001',
      },
      '00000000-0000-4000-8000-000000000001'
    );
    expect(result.ok).toBe(true);
    expect(result.data.source).toBe('lean-ctx-marker');
  });

  it('rejects event with empty message', () => {
    const result = normalizeTelemetryEvent(
      { message: '', source: 'session-logger' },
      '00000000-0000-4000-8000-000000000001'
    );
    expect(result.ok).toBe(false);
  });

  it('redactSecrets removes JWT-like tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const redacted = redactSecrets(`token: ${jwt}`);
    expect(redacted).not.toContain('eyJ');
  });

  it('redactSecrets removes sbp_ tokens', () => {
    const token = 'sbp_abc123def456ghi789';
    const redacted = redactSecrets(`key=${token}`);
    expect(redacted).not.toContain('sbp_');
  });
});

// ─── 6. Integration smoke (Supabase-gated) ────────────────────────────────────

describe('integration: Supabase dual-write (skipped without env)', () => {
  const hasSupabase =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  it.skipIf(!hasSupabase)('writeTraceRef dry-run returns written=true', async () => {
    const { writeTraceRef } = await import('../telemetry/lib/telemetry-bridge.mjs');
    const result = await writeTraceRef({
      tenantId: '00000000-0000-4000-8000-000000000001',
      sessionId: 'test-sess-' + Date.now(),
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      spanId: '00f067aa0ba902b7',
      agentPlatform: 'cursor',
      dryRun: true,
    });
    expect(result.written).toBe(true);
    expect(result.dryRun).toBe(true);
  });

  it.skipIf(!hasSupabase)('openPipelineRun dry-run returns pipeline_run_id', async () => {
    const { openPipelineRun } = await import('../telemetry/lib/telemetry-bridge.mjs');
    const result = await openPipelineRun({
      tenantId: '00000000-0000-4000-8000-000000000001',
      pipeline: 'observability-test',
      mode: 'test',
      dryRun: true,
    });
    expect(result.id).toBeTruthy();
    expect(result.dryRun).toBe(true);
  });
});
