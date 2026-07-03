# ADR-0012: Bounded parallel agent lifecycle (Gas City pattern)

**Status**: Accepted  
**Date**: 2026-06-28  
**Supersedes**: N/A  
**Related**: [ADR-0011](./0011-terminal-orchestration-without-nx.md), [Gas City dependency-aware lifecycle](https://github.com/gastownhall/gascity/blob/main/engdocs/design/dependency-aware-bounded-parallel-lifecycle.md)

## Context

ModMe runs **parallel AI agents** across dual monorepos with Git worktrees, ECL structured changes, molecule indexing, and thermo-nuclear review teams. Unbounded parallel edits cause merge conflicts, contract drift, and unstable golden fixtures.

Gas City's **dependency-aware bounded parallel lifecycle** separates planning, execution waves, and serial commit — with distinct budgets for agent wakes vs concurrent subagent starts.

## Decision

Adopt the Gas City lifecycle for ModMe agent orchestration and migration indexing:

1. **Plan serially** — ECL spec/plan gate, molecule manifest, acquire docs before parallel reviewers
2. **Execute in waves** — independent explorer lanes in parallel; thermo reviewers blocked on wave-1 `manifest.json`
3. **Commit serially** — merge findings, update golden fixtures, INDEX.json, STATUS.md in stable planned order (not worker completion order)
4. **Separate budgets** — `defaultMaxWakesPerTick` (agent attempts) vs `defaultMaxParallelStartsPerWave` (concurrent subagents)
5. **Reverse order for teardown** — legacy archive stops dependents before dependencies

### Single-writer artifacts

Gas City treats config/bead metadata as single-writer. ModMe treats **Zod contracts + golden JSON** as single-writer — generated artifacts are read-only inputs to parallel workers.

| Artifact | Writer | Readers |
|----------|--------|---------|
| `packages/schemas/fixtures/*.golden.json` | contract-auditor (wave 3) | all lanes |
| `data/molecule-index/manifest.json` | molecule-index orchestrator (wave 0–1) | thermo reviewers |
| `harness/changes/active/*/STATUS.md` | orchestrator | all lanes |
| `docs/workflows/reports/manifest.json` | wave-1 explorers | wave-2 reviewers |

## Consequences

### Positive

- Repeatable thermo-nuclear reviews via [`modme-migration-review`](../../../scripts/collections/modme-migration-review.collection.json) collection
- Molecule manifest gates PORTING_GUIDE migration slices
- Aligns with existing worktree isolation and ECL harness

### Negative

- Wave 2 latency until wave 1 manifest is published
- Requires discipline — agents must not skip plan gate

## Alternatives rejected

| Alternative | Reason |
|-------------|--------|
| Full-repo parallel edits | Merge conflicts on shared docs and schemas |
| Nx root orchestrator | User preference; ADR-0011 — keep Turbo/Bun/Yarn per stack |
| Single mega-agent review | Context limits; loses domain parallelism |

## Implementation

- Runbook: [`docs/workflows/thermo-nuclear-dual-monorepo-review.md`](../../../docs/workflows/thermo-nuclear-dual-monorepo-review.md)
- Skill: [`.cursor/skills/thermo-nuclear-monorepo-review/SKILL.md`](../../../.cursor/skills/thermo-nuclear-monorepo-review/SKILL.md)
- lean-ctx profiles: [`data/lean-ctx-task-profiles.toml`](../../../data/lean-ctx-task-profiles.toml) — `thermo-nuclear-review`, `molecule-index`
- Eval architecture link: [`docs/evaluation/ARCHITECTURE.md`](../../../docs/evaluation/ARCHITECTURE.md)

## Verification

```powershell
yarn lint:harness
yarn molecule-index:verify
# Wave 1 → docs/workflows/reports/manifest.json
# Wave 3 → synthesis in docs/workflows/reports/
```
