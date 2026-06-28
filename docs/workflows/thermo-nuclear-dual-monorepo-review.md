# Thermo-Nuclear Dual-Monorepo Review — Runbook

Repeatable federated audit for ModMe's dual monorepo (next-forge + GenerativeUI). Encodes the dual-monorepo audit plan as agent-team choreography.

## Agent team roster

| Wave | Agent lane | Scope | Skills |
|------|------------|-------|--------|
| 0 (serial) | orchestrator | ECL change, baseline, synthesis | `workflow-from-chats`, ECL harness |
| 1 (parallel) | explorer-forge | `next-forge/apps/*`, `packages/*` | `acquire-codebase-knowledge`, `lean-ctx`, `next-forge` |
| 1 | explorer-legacy | `GenerativeUI_monorepo/apps/*`, root `src/`/`agent/` | `reverse-engineer`, `modme-generative-ui-migrate` |
| 1 | contract-auditor | `@repo/schemas`, WS, intake-contracts | `principle-type-system-discipline` |
| 2 (blocked on wave 1) | thermo-reviewer-forge | P0/P1 forge findings | `thermo-nuclear-code-quality-review` |
| 2 | thermo-reviewer-legacy | PORTING_GUIDE portable components | `thermo-nuclear-code-quality-review` |
| 2 | test-engineer | Vitest + Playwright + telemetry audit | `distributed-debugging-debug-trace`, playwright-skill |
| 3 (serial) | doc-writer | C4 slice + `docs/codebase/*` + ADR | `c4-architecture`, `context7-auto-research` |

## Dependency rule (Gas City lifecycle)

1. **Plan serially** — ECL spec/plan gate, molecule manifest, acquire docs before parallel reviewers
2. **Execute in waves** — wave 2 blocked until wave 1 publishes `docs/workflows/reports/manifest.json`
3. **Commit serially** — merge findings, golden fixtures, INDEX.json, STATUS.md in stable order

See [ADR-0012](../../next-forge/docs/adr/0012-bounded-parallel-agent-lifecycle.md).

## Install collection

```powershell
node scripts/install-agents.mjs -c scripts/collections/modme-migration-review.collection.json
npx skills add obra/superpowers@parallel-agents --agent cursor -y
npx skills add muratcankoylan/agent-skills@multi-agent-patterns --agent cursor -y
```

## Session start

```powershell
yarn worktree:doctor
yarn lint:harness
# lean-ctx
# /context-focus thermo-nuclear-review
# /context-pin harness/changes/active/<change-id>/
```

## Verification gates

| Layer | Command |
|-------|---------|
| Harness | `yarn lint:harness` |
| Forge | `yarn verify:forge` |
| Generative | `yarn verify:generative` |
| Contracts | `cd next-forge && bun test packages/schemas/*.test.ts` |
| Molecule | `yarn molecule-index:verify` |
| Telemetry | `yarn telemetry:audit --lens all` |
| E2E | `cd next-forge && bun run test:e2e` (full stack) |

## Synthesis output

After each run, emit report to `docs/workflows/reports/thermo-nuclear-<scope>-<date>.md` using template in [`OBSERVABILITY-AGENTS.md`](../evaluation/OBSERVABILITY-AGENTS.md#parallel-synthesis-template).

## Related

- Skill: [`.cursor/skills/thermo-nuclear-monorepo-review/SKILL.md`](../../.cursor/skills/thermo-nuclear-monorepo-review/SKILL.md)
- Collection: [`scripts/collections/modme-migration-review.collection.json`](../../scripts/collections/modme-migration-review.collection.json)
- ECL: [`docs/ECL.md`](../ECL.md)
