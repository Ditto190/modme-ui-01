---
name: thermo-nuclear-monorepo-review
description: Repeatable 7-phase dual-monorepo thermo-nuclear audit — baseline, acquire-codebase-knowledge, P0 fixes, ECL harness, C4 slice, schema contracts, migration notes. Use for federated ModMe reviews without lockfile merge.
---

# Thermo-Nuclear Dual-Monorepo Review

Federated review model: **HTTP/WebSocket + golden Zod schemas only** — never merge Bun/Yarn lockfiles or `workspace:*` across stacks.

## Prerequisites

- Isolated Git worktree (`yarn worktree:ensure` must pass)
- Active ECL change under `harness/changes/active/`
- `/context-focus` with `thermo-nuclear-review` lean-ctx profile
- Pin ECL change files with `/context-pin`

## Seven phases (serial plan → parallel explore → serial commit)

| Phase | Lane | Deliverable | Verify |
|-------|------|-------------|--------|
| 0 Baseline | orchestrator | worktree doctor snapshot, `scan.py`, verify baselines | `yarn worktree:doctor` |
| 1 Acquire | explorer (parallel forge + legacy) | refresh `docs/codebase/*.md` | evidence-only scan |
| 2 P0 | orchestrator | `stack-paths.json`, slim `AGENTS.md`, `docs/agent-index.md` | `yarn lint:harness` |
| 3 ECL | orchestrator | harness tree, `yarn lint:harness`, structured change | ECL lint PASS |
| 4 C4 | doc-writer | product slice in `C4-Documentation/` | links resolve |
| 5 Contracts | contract-auditor | Vitest golden + WS tests in `@repo/schemas` | `bun test packages/schemas/*.test.ts` |
| 6 Migration | doc-writer | `docs/migration/phase4-cutover.md`, archive plan | molecule manifest entry |

## Quality bar

- Block **structural regression** (boundaries, contracts, harness drift) — not cosmetic Biome nits
- Forge lint debt: document baseline; do not block harness merge
- UniversalWorkbench: read-only unless explicitly tasked

## Verification stack

```powershell
yarn lint:harness
yarn verify:forge          # path-filtered; lint debt may remain documented
yarn verify:generative     # when GenerativeUI paths touched
node scripts/harness-change.mjs archive <change-id>   # after merge gate
```

## Parallel team

Use [`scripts/collections/modme-migration-review.collection.json`](../../../scripts/collections/modme-migration-review.collection.json) and [`docs/workflows/thermo-nuclear-dual-monorepo-review.md`](../../../docs/workflows/thermo-nuclear-dual-monorepo-review.md).

Wave 1 explorers publish `docs/workflows/reports/manifest.json` before wave 2 thermo reviewers start.

## Related

- Workflow runbook: [`docs/workflows/thermo-nuclear-dual-monorepo-review.md`](../../../docs/workflows/thermo-nuclear-dual-monorepo-review.md)
- ECL harness: [`docs/ECL.md`](../../../docs/ECL.md)
- ADR lifecycle: [`next-forge/docs/adr/0012-bounded-parallel-agent-lifecycle.md`](../../../next-forge/docs/adr/0012-bounded-parallel-agent-lifecycle.md)
- Molecule index: [`.agents/skills/modme-molecule-index/SKILL.md`](../../../.agents/skills/modme-molecule-index/SKILL.md)
