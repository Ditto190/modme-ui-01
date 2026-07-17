# Telemetry bridge dependency map

Generated for observability-platform-v2 (Spec 1 / lean-ctx maps).

## Entry points

| Caller | Function |
|--------|----------|
| `scripts/telemetry/telemetry-cli.mjs` | `cmdSync` → `bridgeCollectPayload` |
| `scripts/telemetry/otel-session-start.mjs` | `writeGreptimeSpan`, `writeTraceRef` |
| `scripts/agent-session-finish.ps1` | `yarn telemetry:sync` |
| `scripts/telemetry-audit.mjs` | `redactSecrets` (contracts lens) |

## Core module: `scripts/telemetry/lib/telemetry-bridge.mjs`

| Export | Downstream |
|--------|------------|
| `normalizeTelemetryEvent` | Zod via `packages/intake-contracts/schemas/telemetry-event.mjs` |
| `storeTelemetryEvent` | Supabase `telemetry_events` |
| `writeGreptimeSpan` | Greptime `agent_spans` (optional `GREPTIME_PSQL_URL`) |
| `writeTraceRef` | Supabase `trace_refs` + `attributes` correlation JSON |
| `bridgeCollectPayload` | normalize → store → span synthesis refs → `pipeline_runs.stats` |
| `appendDlqEntry` | `logs/telemetry/dlq/*.jsonl` (strict mode) |

## Span synthesis

`scripts/telemetry/lib/span-synthesis.mjs` → `synthesizeSpansFromEvents` maps:

- `lean-ctx-marker` / journal → `lean_ctx.read`
- session-logger tool lines → `agent.tool_call`
- git-hook / agenttrace → `agent.tool_call`
- pipeline run → `telemetry.sync`
- parent session present → `agent.handoff`

## Blast radius

Changes to `telemetry-bridge.mjs` affect: CLI sync, OTel session start, audit redaction tests, observability integration tests, CI dry-run/strict gates.
