# Thermo-Nuclear Synthesis — control-cli + Rolldown root builders

**Date:** 2026-07-12  
**Branch:** `feature/cursor/control-cli-orchestration`  
**Change:** `harness/changes/active/control-cli-rolldown-orchestration/`  
**Lifecycle:** ADR-0012 (plan serial → wave 1 → contracts → commit serial)

## Scope

Root orchestration only: control-cli harness finish, Rolldown builders registration, Vitest analyse assertions. No UniversalWorkbench. No next-forge Turbo edits. No GenerativeUI production Vite replacement.

## Findings

| Severity | Finding | Disposition |
|----------|---------|-------------|
| Critical | Rolldown was requested as "dependency manager" | Clarified as bundler; Yarn/Bun unchanged (ADR-0013) |
| High | Builders lacked analyse artefact for CI/agents | Added `bundleAnalyzerPlugin` → `analyze-data.json` |
| Medium | Thermo gate missing for control-cli branch | ECL change + wave-1 manifest + this synthesis |
| Low | builders-orchestrator tests omitted rolldown | Updated assertions |

## Wave results

| Wave | Lane | Status |
|------|------|--------|
| 0 | Baseline doctor / lint-ecl / smoke / harness | PASS |
| 1 | Root orchestration acquire | PASS — `manifest.json` |
| 1 | Forge / legacy explorers | Skipped (out of scope) |
| 2 | Vitest contracts (analyse JSON) | PASS — 9 tests |
| 3 | ADR-0013 + docs | Done |

## Structural checks (quality bar)

- No Bun/Yarn lockfile merge across stacks
- No `workspace:*` across next-forge ↔ GenerativeUI
- Turborepo remains next-forge-only
- `.cache/builders/` remains gitignored

## Verify evidence

```
worktree-doctor: OK
lint-ecl: all checks passed
worktree-smoke: ok
builders verify/build rolldown: OK
vitest orchestration (rolldown + builders): 9 passed
```

## References

- ADR-0013: `next-forge/docs/adr/0013-rolldown-root-builders.md`
- Manifest: `docs/workflows/reports/manifest.json`
- Acquire notes: `docs/workflows/reports/acquire-control-cli-rolldown-2026-07-12.md`
- Runbook: `docs/workflows/thermo-nuclear-dual-monorepo-review.md`
