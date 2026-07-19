---
title: "AST Semantic Map — Observability Pipeline"
status: draft
source: "GenerativeUI_monorepo + next-forge"
tags: [observability, telemetry, tracing, ast, semantic-map]
---

# AST Semantic Map — Observability Pipeline

## Scope

- `GenerativeUI_monorepo` root-level observability files were requested, but the concrete telemetry implementation lives in the repo root and `next-forge`.
- This map captures the observability pipeline objects that are currently discoverable and usable across the monorepo.

## Canonical data model

```json
{
  "version": "1.1",
  "telemetry_sources": [
    "session-logger",
    "session-logger-prompt",
    "agent-orchestrator",
    "test-results",
    "telemetry-bridge",
    "lean-ctx-journal",
    "lean-ctx-tee",
    "lean-ctx-debug",
    "lean-ctx-marker",
    "lean-ctx-archive"
  ],
  "agent_platforms": ["cursor", "copilot", "claude", "voltagent", "cloud", "lean-ctx", "human"],
  "otel_span_names": ["agent.session", "agent.tool_call", "agent.handoff", "telemetry.sync", "lean_ctx.read"],
  "pipeline_status": ["running", "completed", "failed", "skipped"]
}
```

## Semantic entities

| Entity | Location | Role |
|---|---|---|
| `TelemetryEventSchema` | `next-forge/packages/schemas/observability.ts` | normalized event record |
| `PipelineRunSchema` | `next-forge/packages/schemas/observability.ts` | pipeline lifecycle record |
| `EvalSignalSchema` | `next-forge/packages/schemas/observability.ts` | evaluation signal record |
| `TestResultSchema` | `next-forge/packages/schemas/observability.ts` | contract/test outcome record |
| `TraceRefSchema` | `next-forge/packages/schemas/observability.ts` | Supabase ↔ Greptime join row |
| `OtelSpanSchema` | `next-forge/packages/schemas/observability.ts` | Greptime span payload |
| `TelemetryEventV11Schema` | `next-forge/packages/schemas/observability.ts` | event + `agent_platform` |

## Pipeline graph

```text
session_logger / agenttrace / lean-ctx
  -> telemetry-cli
  -> telemetry-bridge
  -> Zod contracts
  -> Supabase tables (pipeline_runs, telemetry_events, eval_signals, trace_refs)
  -> Greptime agent_spans (optional)
```

## Cross-repo observability links

- `docs/observability/README.md`
- `docs/observability/voltops-mapping.md`
- `docs/adr/0013-observability-pipeline-entry-points-and-session-trace-config.md`
- `next-forge/packages/observability/*`
- `next-forge/packages/schemas/observability.ts`
- `scripts/telemetry/*`
- `agent/observability/*`
- `agent/genai-toolbox/internal/telemetry/*`

## AST-semantic extraction notes

- The schema is union-like via Zod enums and object records, not class-based.
- Correlation relies on shared scalar keys: `tenant_id`, `session_id`, `trace_id`, `span_id`, `parent_session_id`.
- Promotion semantics are stage-based: collect -> normalize -> promote.
- Greptime is optional; Supabase is the canonical metadata store.

## Test targets

- `yarn telemetry:test:contracts`
- `yarn telemetry:sync --dry-run`
- `yarn verify:forge`
- `yarn verify:generative`
