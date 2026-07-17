# observability-platform-v2 — Spec (WHAT / WHY)

## Problem

ModMe observability Phases 0–6 wired collect/normalize/promote for session-logger and lean-ctx sources, but gaps remain: incomplete span synthesis, missing git-hook and agenttrace collectors, no strict DLQ path, deferred search, and ECL/hooks not driving cross-session telemetry events.

## Target users / scenarios

- Agent operators reviewing Session Ops in Knowledge UI
- CI validating telemetry contracts and source registry freshness
- Multi-agent workflows needing parent/child session correlation

## Success criteria

- [ ] All log sources in `docs/observability/log-sources.v1.json` have working collectors
- [ ] `yarn telemetry:sync --dry-run --strict` passes in CI
- [ ] Greptime SQL spans synthesized for tool_call, lean_ctx.read, telemetry.sync when enabled
- [ ] Git hook events appear in telemetry sync output
- [ ] ADR 0011 documents deferred semantic search

## Sub-specs

| # | Scope | Key deliverable |
|---|-------|-----------------|
| 1 | Ingestion | log-sources registry, agenttrace + git-hook collectors |
| 2 | Normalize | `--strict`, DLQ, correlation coverage stats |
| 3 | Promote | Span synthesis Phase A + trace_refs |
| 4 | Tracing | PARENT_SESSION_ID propagation |
| 5 | Search stub | ADR 0011, preserve indexes |
| 6 | UI/Monitoring | session filter, report coverage table |
| 7 | ECL/Hooks | git-hook-bridge, post-commit, pre-commit subset |

## Acceptance criteria

- Verification matrix in plan passes locally and in CI
- ECL lint passes after change close

## Non-goals

- OTLP SDK export (Phase B)
- `match_observability_signals` API wiring
- Inbox promote routing for high-severity events

## Constraints

- Dual-monorepo boundaries: no cross-imports between next-forge and GenerativeUI
- Semantic search deferred per product decision

## Assumptions

- Supabase cloud credentials available for live sync; dry-run works without them
- Greptime optional via `GREPTIME_PSQL_URL`

## Risks

- Hook append-only JSONL growth — mitigated by lightweight events only
- Greptime down — Supabase-only promote continues
