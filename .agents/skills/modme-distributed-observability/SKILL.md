---
name: modme-distributed-observability
description: 'ModMe distributed observability orchestrator — OTel span export, Greptime dual-write, Supabase ETL, multi-agent platform adapters, VoltOps-pattern session tracing, data-quality contracts, and Impeccable UI surfaces. Use when wiring agent sessions to observability, debugging trace boundaries, running telemetry:sync, working on OpsSignalCard UI, writing runbooks, or any cross-platform agent telemetry task.'
---

# ModMe Distributed Observability Orchestrator

Composes the full observability stack for ModMe: OTel-normalized spans, Supabase-primary metadata, Greptime time-series, multi-agent adapters, data-quality gates, and impeccable UI surfaces.

## When to use this skill

- Wiring `agent-session-start/finish` to OTel span export
- Adding `agent_platform` adapters (cursor / copilot / claude / voltagent / cloud)
- Running `yarn telemetry:sync`, `yarn telemetry:report`, `yarn telemetry:test`
- Evolving `OpsSignalCard` or `SessionOpsPanel` UI
- Writing or updating runbooks in `docs/observability/runbooks/`
- Schema work: `009_observability_tenant.sql`, Prisma `Tenant`/`PipelineRun`/`TraceRef`
- Validating data-quality expectations at each ETL stage
- Debugging Greptime OTLP export or Supabase RLS on observability tables

## Composed skills

This skill references and extends:

| Skill | Role |
|-------|------|
| `observability-pipeline` | Base 3-stage ETL: collect → normalize → promote |
| `lean-ctx` | Context-efficient codebase reads; `ctx_compose` before any schema work |
| `distributed-debugging-debug-trace` | OTel trace boundaries, span context propagation |
| `observability-engineer` | SLOs, runbooks, alert design |
| `data-quality-frameworks` | Expectation contracts at each ETL stage |
| `supabase` | RLS policies, service_role ingest, migration patterns |
| `awesome-agent-skills` | Bootstrap + search for additional skills via skills-sh MCP |
| `context7-auto-research` | Live docs for OTel/Greptime/Supabase/Prisma before schema edits |

## Architecture overview

```
Agent platforms (Cursor/Copilot/Claude/VoltAgent/Cloud)
  → OTel adapter (agent_platform attribute normalization)
  → OpenTelemetry SDK (trace + span)
  → 3-stage ETL (collect JSONL → normalize Zod → promote dual-write)
  → Supabase (pipeline_runs, telemetry_events, eval_signals, trace_refs)
  → Greptime (OTLP spans/metrics, agent_spans table)
  → OpsSignalCard + SessionOpsPanel (Impeccable UI)
```

**Correlation keys (required on every span/event):**

| Field | Source |
|-------|--------|
| `trace_id` | OTel trace |
| `span_id` | OTel span |
| `session_id` | `AGENT_SESSION_ID` / envelope UUID |
| `tenant_id` | `DEV_TENANT_ID` (default `modme-local`) |
| `agent_platform` | `cursor` \| `copilot` \| `claude` \| `voltagent` \| `cloud` \| `human` |
| `parent_session_id` | supervisor / worktree parent |
| `worktree` | path slug |
| `branch` | git branch |

## Session playbook

1. **Start** — `yarn agent:session:start` → sets `AGENT_SESSION_ID`, `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES`
2. **Trace** — OTel root span `agent.session` created; lean-ctx reads emit `lean_ctx.read` child spans
3. **Work** — tool calls emit `agent.tool_call` spans; handoffs emit `agent.handoff` with `parent_session_id`
4. **Promote** — `yarn telemetry:sync` → dual-write to Supabase + Greptime; `trace_refs` row links stores
5. **Audit** — `yarn agenttrace --latest`; `yarn telemetry:report`; check `OpsSignalCard` in Knowledge UI

## Multi-agent handoff

Propagate `parent_session_id` (VoltOps `parentHistoryEntryId` analogue) when spawning sub-agents:

```powershell
$env:PARENT_SESSION_ID = $env:AGENT_SESSION_ID
# launch sub-agent with PARENT_SESSION_ID exported
```

The sub-agent's session-logger picks up `PARENT_SESSION_ID` and includes it in `telemetry_events` for Supabase correlation and OTel `parent_span_id` linking.

## Span taxonomy

| Span name | Key attributes |
|-----------|----------------|
| `agent.session` | `session_id`, `agent_platform`, `branch`, `worktree` |
| `agent.tool_call` | `tool_name`, `lean_ctx_mode`, `duration_ms` |
| `agent.handoff` | `parent_session_id`, `child_session_id` |
| `telemetry.sync` | `pipeline_run_id`, `events_count`, `promote_status` |
| `lean_ctx.read` | `path`, `mode`, `tokens_saved` |

## Data quality gates

Each ETL stage must pass expectations from `docs/inbox-pipeline/contracts/expectations/observability.v1.json`:

| Stage | Gate | Blocker |
|-------|------|---------|
| collect | `session_id` present on all events | Blocking |
| normalize | Zod schema valid, no unknown fields | Blocking |
| promote | `tenant_id` set, `trace_refs.greptime_span_id` non-null | Advisory |
| CI | `yarn telemetry:test:contracts` | Blocking CI |

## Commands

```powershell
# Sync + dry-run
node scripts/telemetry/telemetry-cli.mjs sync --dry-run

# Full collect + promote
yarn telemetry:sync

# Report
node scripts/telemetry/telemetry-cli.mjs report --output reports/observability/latest.html

# Test
yarn telemetry:test

# Session diagnostics
yarn agenttrace --latest
yarn agenttrace --doctor
```

## Environment

| Variable | Purpose |
|----------|---------|
| `AGENT_SESSION_ID` | Current session UUID |
| `OTEL_SERVICE_NAME` | `modme-agent-orchestrator` |
| `OTEL_RESOURCE_ATTRIBUTES` | Comma-separated k=v: `session_id,tenant_id,agent_platform,branch` |
| `GREPTIME_HOST` | OTLP endpoint (default `localhost:4000`) |
| `GREPTIME_DB` | Greptime database name |
| `DEV_TENANT_ID` | Tenant isolation UUID |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Override for cloud Greptime |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Ingest writes |

## Runbooks

All runbooks live in [`docs/observability/runbooks/`](../../docs/observability/runbooks/):

- [`loop-detected.md`](../../docs/observability/runbooks/loop-detected.md) — lean-ctx loop detection triggered
- [`tee-failure.md`](../../docs/observability/runbooks/tee-failure.md) — tee output capture failed
- [`otel-export-failed.md`](../../docs/observability/runbooks/otel-export-failed.md) — OTel span flush failed
- [`telemetry-sync-failed.md`](../../docs/observability/runbooks/telemetry-sync-failed.md) — promote stage failure
- [`supabase-rls-denied.md`](../../docs/observability/runbooks/supabase-rls-denied.md) — RLS blocking ingest
- [`greptime-down.md`](../../docs/observability/runbooks/greptime-down.md) — Greptime unavailable

## SLOs

| SLI | Target |
|-----|--------|
| Session capture rate | >95% have envelope + OTel root span |
| Span export success | >99% sessions flush on finish |
| ETL promote | 0 Zod violations on `--strict` |
| Cross-platform coverage | All 5 adapters emit `agent_platform` |
| lean-ctx adoption | `ctx_*` in >80% Cursor sessions |

## References

- Plan: `.cursor/plans/distributed_observability_stack_550315f5.plan.md` (read-only)
- Base skill: `.cursor/skills/observability-pipeline/SKILL.md`
- VoltOps mapping: `docs/observability/voltops-mapping.md`
- Entry point: `docs/observability/README.md`
- Eval architecture: `docs/evaluation/ARCHITECTURE.md`
- Migration: `next-forge/supabase/migrations/009_observability_tenant.sql`
- Contract: `docs/inbox-pipeline/contracts/observability-contract.v1.json`

## Gotchas

- **Never** call `telemetry-bridge.mjs` without `DEV_TENANT_ID` set — all rows will use the fallback UUID and RLS will block reads from the UI.
- **No facade hooks** — only real scripts (session-logger must exist at `.github/hooks/session-logger/session-logger.ps1`).
- **Do not** use `--accept-data-loss` in `prisma db push` on cloud — drops copilot/agent tables outside Prisma schema.
- Greptime OTLP endpoint requires `X-Greptime-DB-Name` header; verify in `greptime-config.ts` before changing.
- lean-ctx journal tee output goes to `logs/lean-ctx/tee/` — watch for disk growth if `tee_mode = "always"`.
