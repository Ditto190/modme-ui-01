# STATUS — Agent Handoff

> Last updated: 2026-06-28 (dual-monorepo audit harness — complete)

## Active structured change

**`harness-setup-dual-monorepo`** — ready to archive after PR merge.

Location: [`harness/changes/active/harness-setup-dual-monorepo/CHANGE.md`](../harness/changes/active/harness-setup-dual-monorepo/CHANGE.md)

## Completed

- ECL harness (`docs/ECL.md`, `docs/ARCHITECTURE.md`, lint scripts, templates)
- `scripts/lib/stack-paths.json` + CI sync validator
- Refreshed all 7 `docs/codebase/*.md` + scan artifact
- `C4-Documentation/` (context, container, 10 components, API yaml, code views)
- WS contract tests: `next-forge/packages/schemas/ws-contract.test.ts`
- Golden JSON merge conflict resolved (agent-server fixture)
- `yarn verify:all`, `yarn lint:harness` in root package.json
- Phase 4 + legacy archive plan: [`docs/migration/phase4-cutover.md`](migration/phase4-cutover.md)
- Baseline recorded: [`docs/audit-baseline.md`](audit-baseline.md)

## Next agent actions

1. `cd next-forge && npx bun install` then `yarn verify:forge` in worktree
2. `yarn verify:generative` if GenerativeUI touched
3. `yarn lint:harness` before commit
4. Archive change after PR: `node scripts/harness-change.mjs archive harness-setup-dual-monorepo`

## Blockers

- **Baseline debt:** `verify:forge` fails without next-forge `bun install` (ultracite not found)

## Canonical map

[`docs/agent-index.md`](agent-index.md) — next-forge primary; agent-server satellite; root `src/`/`agent/` deprecated.
