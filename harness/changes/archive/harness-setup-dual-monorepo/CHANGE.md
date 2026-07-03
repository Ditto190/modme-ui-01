# harness-setup-dual-monorepo

> Active structured change — dual-monorepo ECL harness bootstrap (2026-06-28)

## Goal

Establish ECL core harness (docs, lint scripts, environment contract) for federated dual-monorepo efficiency without physical lockfile merge.

## Scope

**In scope:**

- `docs/ECL.md`, `docs/STATUS.md`, `harness/` tree
- `scripts/harness-change.mjs`, `lint-ecl.mjs`, `lint-encoding.mjs`, `harness-evolve.mjs`
- `scripts/lib/stack-paths.json` unified CI path manifest
- `yarn lint:harness`, `yarn verify:all`

**Out of scope:**

- Go trace package (`harness/trace/`)
- Physical monorepo merge
- UniversalWorkbench edits

## Verify

```powershell
yarn lint:harness          # PASS (2026-06-28)
yarn worktree:doctor       # PASS (2 warnings)
yarn verify:forge          # FAIL baseline debt (50 ultracite errors pre-existing)
yarn verify:generative     # run before PR if GenerativeUI touched
yarn verify:all
```

## Phase 4 / legacy archive

Documented in [`docs/migration/phase4-cutover.md`](../../migration/phase4-cutover.md) and [`docs/codebase/CONCERNS.md`](../../codebase/CONCERNS.md).

## Evidence

- Plan: `.cursor/plans/dual_monorepo_audit_da92678e.plan.md`
- Boundaries: `.cursor/rules/monorepo-boundaries.mdc`
- Migration: `.agents/skills/modme-generative-ui-migrate/SKILL.md`
