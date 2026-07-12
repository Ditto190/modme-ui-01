# control-cli-rolldown-orchestration — Plan (HOW)

## Approach

1. Thermo baseline + ECL STATUS
2. Wave-1 manifest (root-scoped)
3. Add Rolldown builder + config with bundleAnalyzerPlugin
4. Vitest suite + preflight builders profile
5. ADR-0013 + synthesis + docs
6. Verify matrix → serial commit → PR to `dev`

## Files to touch

| Path | Change |
|------|--------|
| `scripts/builders.manifest.json` | Register rolldown builder + pipeline |
| `config/builders/rolldown.config.mjs` | Bundle orchestration scripts + analyser |
| `package.json` | Add `rolldown` devDependency |
| `scripts/__tests__/rolldown-builder.test.mjs` | Vitest analyse assertions |
| `scripts/preflight.manifest.json` | Wire builders profile test |
| `next-forge/docs/adr/0013-rolldown-root-builders.md` | ADR |
| `docs/workflows/reports/*` | Manifest + synthesis |
| `docs/agent-terminal-orchestration.md` | Builders note |
| `docs/workflows/thermo-nuclear-dual-monorepo-review.md` | Verify row |
| `CHANGELOG.md` | Unreleased |

## Spec gaps discovered during planning

None — Rolldown clarified as bundler, not package manager.

## Verify plan

```powershell
yarn lint:harness
node scripts/builders-orchestrator.mjs ensure --builder rolldown
node scripts/builders-orchestrator.mjs build --builder rolldown
npx vitest run --config vitest.config.mjs --project orchestration scripts/__tests__/rolldown-builder.test.mjs
node scripts/preflight.mjs --profile builders
```

## Rollback

Remove rolldown from builders.manifest, delete config, revert package.json devDep, archive ECL change.
