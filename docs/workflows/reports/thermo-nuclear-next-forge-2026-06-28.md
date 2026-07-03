# Thermo-Nuclear next-forge Review — Synthesis

**Date:** 2026-06-28  
**Branch:** `feature/cursor/thermo-nuclear-workflow-index`  
**Scope:** next-forge + federated legacy touchpoints  
**Lifecycle:** ADR-0012 bounded-parallel (wave 0–3)

## Task summary

First bounded-parallel thermo-nuclear review after dual-monorepo audit merge. Focus: structural regression gates, molecule index spine, PORTING_GUIDE ECL slices.

## Agent contributions

| Lane | Finding |
|------|---------|
| orchestrator | ECL harness + `stack-paths.json` baseline; audit worktree ready for PR to `dev` |
| explorer-forge | next-forge apps/packages mapped; ports 3100–3102, 3104, 6106 documented in `docs/codebase/STACK.md` |
| explorer-legacy | GenerativeUI agent-server WS contract aligned with forge golden fixture |
| contract-auditor | `ws-contract.test.ts` + golden JSON in `@repo/schemas`; molecule manifest schema v1.0.0 |
| thermo-reviewer-forge | P0: maintain `@repo/*` boundaries; no cross-monorepo imports — PASS |
| thermo-reviewer-legacy | PORTING_GUIDE portable components indexed; UniversalWorkbench read-only — PASS |
| test-engineer | `yarn lint:harness` PASS; `yarn molecule-index:verify` PASS; forge lint debt documented baseline |
| doc-writer | ADR-0012 published; C4 harness component doc present |

## Consolidated recommendations

1. **Critical:** None blocking merge — harness lint + contract tests pass
2. **Important:** Run full `yarn verify:forge` before production cutover; Biome debt tracked separately
3. **Suggestion:** Enable `molecule-contract` CI job on schema path changes

## Action items

- [x] Publish wave-1 `docs/workflows/reports/manifest.json`
- [x] `yarn molecule-index:verify`
- [ ] Merge PR to `dev` after review
- [ ] Archive ECL change `harness-setup-dual-monorepo` post-merge
- [ ] Run `yarn telemetry:audit --lens all` on next observability round

## Molecule index summary

| Kind | Count (forge stack) |
|------|---------------------|
| zod_module | schema/contract TS under next-forge |
| mcp_molecule | 7 library entries from molecule-generator |
| toolset_entry | scripts/toolset-management |

Manifest: [`data/molecule-index/manifest.json`](../../data/molecule-index/manifest.json)

## Related

- Runbook: [`docs/workflows/thermo-nuclear-dual-monorepo-review.md`](../thermo-nuclear-dual-monorepo-review.md)
- ADR-0012: [`next-forge/docs/adr/0012-bounded-parallel-agent-lifecycle.md`](../../next-forge/docs/adr/0012-bounded-parallel-agent-lifecycle.md)
