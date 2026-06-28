# ECL — Engineering Change Loop

ModMe uses a lightweight **ECL harness** for agent reliability across the **federated dual-monorepo** (root Yarn orchestration + `next-forge` Bun + `GenerativeUI_monorepo` Yarn). No physical lockfile merge.

## Load order (agents)

1. [`AGENTS.md`](../AGENTS.md) — project map (80–120 lines)
2. This file — change classification + verify commands
3. Active change under `harness/changes/active/` (if any)
4. [`harness/evolution/pending.md`](../harness/evolution/pending.md) (if present)
5. [`docs/STATUS.md`](STATUS.md) — session handoff
6. [`docs/agent-index.md`](agent-index.md) → [`docs/codebase/`](codebase/)

## Small Change

Use for isolated fixes within one stack, ≤3 files, no structural or CI manifest changes.

**Workflow:**

1. Work in an **agent worktree** (`.\scripts\new-agent-worktree.ps1`)
2. Edit → path-filtered verify:
   - `next-forge/**` → `yarn verify:forge`
   - `GenerativeUI_monorepo/**` → `yarn verify:generative`
   - Both → `yarn verify:all`
3. `yarn pre-commit:check` before commit
4. Update [`CHANGELOG.md`](../CHANGELOG.md) if user-facing

## Structured Change

Use for harness setup, CI manifest changes, migration phases, or cross-stack contract work.

**Workflow:**

1. `node scripts/harness-change.mjs create <slug>`
2. Fill `harness/changes/active/<slug>/CHANGE.md`
3. Implement with evidence links in the change doc
4. Verify:

```powershell
yarn lint:harness
yarn worktree:doctor
yarn verify:all          # full CI parity before PR
yarn pre-commit:check
```

5. Archive: `node scripts/harness-change.mjs archive <slug>`
6. Update `docs/STATUS.md` for handoff

## Verify

| Command | When |
|---------|------|
| `yarn verify:forge` | next-forge paths changed |
| `yarn verify:generative` | GenerativeUI paths changed |
| `yarn verify:all` | Release / harness / cross-stack PRs |
| `yarn lint:harness` | harness/, ECL docs, environment.json |
| `yarn worktree:doctor` | Every worktree session start |
| `yarn e2e:worktree-smoke` | scripts/ orchestration changes |

Path filters: [`scripts/lib/stack-paths.json`](../scripts/lib/stack-paths.json) (single source — CI + pre-push import this).

## Environment contract

Dual stack ports and package managers: [`harness/config/environment.json`](../harness/config/environment.json), generated from [`scripts/launch-manifest.json`](../scripts/launch-manifest.json).

## Observability

Session envelopes: `logs/agent-orchestrator/sessions/`. Agenttrace: `yarn agenttrace --overview`. Do **not** add Go `harness/trace/` unless explicitly requested.

## References

- C4: [`C4-Documentation/c4-container.md`](../C4-Documentation/c4-container.md)
- Worktrees: [`docs/multi-agent-worktrees.md`](multi-agent-worktrees.md)
- Migration: [`.agents/skills/modme-generative-ui-migrate/SKILL.md`](../.agents/skills/modme-generative-ui-migrate/SKILL.md)
