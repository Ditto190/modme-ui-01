---
name: observability-pipeline
description: 'ModMe observability and telemetry ingestion — telemetry-cli, telemetry-bridge dual-write, tenant-scoped pipeline_runs, eval_signals, OpsSignalCard, Greptime spans. Use for session-logger, agenttrace, agent-eval collect/report, intake orchestrator wiring, or observability schema/CI work.'
---

# Observability & Telemetry Ingestion Pipeline

## When to use

- Wiring **session logs → eval_signals → Supabase + Greptime**
- Running **`yarn telemetry:sync`**, **`yarn telemetry:report`**, **`yarn telemetry:test`**
- Schema work: `009_observability_tenant.sql`, Prisma `Tenant` / `PipelineRun` / `TraceRef`
- UI: **OpsSignalCard**, Session Ops panel in Knowledge UI
- CI: `.github/workflows/observability-pipeline-check.yml`

## Architecture (3-stage intake pattern)

| Stage | Action | Artefact |
|-------|--------|----------|
| collect | session-logger, agenttrace, test-results, orchestrator envelopes | JSONL / logs |
| normalize | Zod (`packages/intake-contracts`) | validated events |
| promote | telemetry-bridge dual-write | `pipeline_runs`, `telemetry_events`, `eval_signals`, Greptime `agent_spans` |

**Dual store:** Supabase (cards/metadata) + Greptime (spans/metrics). Bridge table: `trace_refs`.

## Commands

```powershell
node scripts/telemetry/telemetry-cli.mjs sync --dry-run
node scripts/telemetry/telemetry-cli.mjs collect --since=7d
node scripts/telemetry/telemetry-cli.mjs report --output reports/observability/latest.html
yarn telemetry:test
```

## Environment

| Variable | Purpose |
|----------|---------|
| `DEV_TENANT_ID` | Default `00000000-0000-4000-8000-000000000001` (modme-local) |
| `AGENT_SESSION_ID` | Propagated into pipeline_runs metadata |
| `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Ingest writes |

## lean-ctx profiles

Profiles live in [`data/lean-ctx-task-profiles.toml`](../../data/lean-ctx-task-profiles.toml) (not `.lean-ctx.toml` schema keys).

- `observability-work` — scripts/telemetry, telemetry-audit, DSP subgraph, docs/evaluation
- `session-audit` — tee_mode always, logs/** included

Activate: `$env:LEAN_CTX_PROFILE = "observability-work"`

## DSP + audit commands (Round 2)

```powershell
yarn telemetry:audit --lens contracts
yarn telemetry:audit --lens all
yarn dsp:observability:stats
python scripts/dsp-cli.py --root . search telemetry
python scripts/dsp-cli.py --root . read-toc
node scripts/bootstrap-dsp-observability.mjs   # once, creates .dsp/ subgraph
```

Parallel agent playbook: [`docs/evaluation/OBSERVABILITY-AGENTS.md`](../../docs/evaluation/OBSERVABILITY-AGENTS.md)

Collection install:

```powershell
node scripts/install-agents.mjs -c scripts/collections/modme-observability.collection.json
```

## Related skills

- **`modme-distributed-observability`** (orchestrator) — [`.agents/skills/modme-distributed-observability/SKILL.md`](../../.agents/skills/modme-distributed-observability/SKILL.md) — session lifecycle, lean-ctx collect, incident playbooks
- `error-debugging-error-trace`, `distributed-debugging-debug-trace`
- `ai-agents-architect`, `saas-multi-tenant`, `hybrid-search-implementation`
- `ai-native-cli`, `aria`

## /handover checklist (next agent)

Mirror scrape handover §4.5:

1. **State:** What pipeline stages ran (collect/normalize/promote)? `pipeline_run_id`?
2. **Artefacts:** JSONL paths, HTML report path, golden snapshot drift?
3. **Blockers:** Greptime down? RLS? Missing `DEV_TENANT_ID`?
4. **Verify:** `yarn telemetry:test`, `node scripts/telemetry/telemetry-cli.mjs sync --dry-run`
5. **Docs:** Update `docs/evaluation/ARCHITECTURE.md` if behavior changed

## Gotchas

- **No facade hooks** — only real scripts (`.github/hooks/session-logger/session-logger.ps1` must exist).
- Ingest uses **service_role**; sets `tenant_id` explicitly — never rely on RLS for scripts.
- Do not fork inbox enums — import from `packages/intake-contracts/schemas/classify-output.mjs`.
- `GenerativeUI_monorepo/intake-pipeline/` stays Copilot-specific; route via `telemetry-cli ingest-copilot`.

## References

- Plan: `.cursor/plans/observability_pipeline_config_4fea0e0c.plan.md` (read-only)
- Eval: `docs/evaluation/ARCHITECTURE.md`
- Inbox contract: `docs/inbox-pipeline/contracts/inbox-contract.v1.json`
- Migration: `next-forge/supabase/migrations/009_observability_tenant.sql`
