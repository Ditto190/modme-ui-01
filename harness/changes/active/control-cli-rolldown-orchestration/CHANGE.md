# control-cli-rolldown-orchestration

> Structured change — see [docs/ECL.md](../../../../docs/ECL.md)

## Goal

Finish control-cli + multi-agent workspace orchestration with a scoped thermo-nuclear review (ADR-0012), then register Rolldown as a root builders bundler that emits `analyze-data.json` for Vitest — without replacing Yarn/Bun or Turborepo in next-forge.

## Scope

- In scope: ECL change, wave-1 `manifest.json`, Rolldown in `builders.manifest.json`, `config/builders/rolldown.config.mjs`, Vitest suite, ADR-0013, thermo synthesis report, docs/CHANGELOG
- Out of scope: UniversalWorkbench, next-forge Turbo pipeline edits, GenerativeUI app production Vite replacement, lockfile merges across stacks

## Baseline

- Branch: `feature/cursor/control-cli-orchestration` from `dev`
- Worktree: `.worktrees/dev-agent-cursor-control-cli-orchestration`
- Doctor: OK 2026-07-12
- `yarn lint:harness` / `node e2e/worktree-smoke/run.mjs` / `node scripts/control-cli-harness.mjs`: PASS

## Verify

```powershell
yarn lint:harness
node scripts/control-cli-harness.mjs
node e2e/worktree-smoke/run.mjs
node scripts/builders-orchestrator.mjs ensure --builder rolldown
node scripts/builders-orchestrator.mjs build --builder rolldown
npx vitest run --config vitest.config.mjs --project orchestration scripts/__tests__/rolldown-builder.test.mjs
```

## Evidence

- `docs/workflows/reports/manifest.json`
- `docs/workflows/reports/thermo-nuclear-control-cli-rolldown-2026-07-12.md`
- `next-forge/docs/adr/0013-rolldown-root-builders.md`
