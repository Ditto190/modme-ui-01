# control-cli-rolldown-orchestration — Spec (WHAT / WHY)

## Problem

Control-cli orchestration needs a thermo-nuclear finish gate. Root builders lack a Rust bundler that emits machine-readable bundle analysis for Vitest/CI smoke.

## Target users / scenarios

- Agents verifying orchestration scripts via `yarn harness:control-cli`
- CI/preflight builders pipeline needing analyse artefacts
- Maintainers keeping Turborepo siloed to next-forge

## Success criteria

- [x] ECL change active under `harness/changes/active/control-cli-rolldown-orchestration/`
- [ ] Rolldown registered in `scripts/builders.manifest.json` with analyze-data.json
- [ ] Vitest asserts on analyse artefact shape
- [ ] ADR-0013 documents Rolldown as root builders bundler (not package manager)
- [ ] Thermo synthesis report published

## Acceptance criteria

- `builders-orchestrator.mjs build --builder rolldown` exits 0
- `.cache/builders/rolldown/analyze-data.json` exists after build
- No next-forge or GenerativeUI lockfile edits for Rolldown
- Yarn/Bun remain package managers; Turborepo remains next-forge-only

## Non-goals

- Replacing Vite for vibe-web-app production builds
- Adding Rolldown inside next-forge turbo pipeline
- Claiming Rolldown manages npm dependencies
- Editing UniversalWorkbench copies

## Constraints

- Dual-monorepo boundaries: no cross-imports (`scripts/lib/stack-paths.json`)
- ADR-0011 / ADR-0012 lifecycle (plan serial → waves → commit serial)

## Assumptions

- Control-cli harness and agent-status JSON default already present on this branch

## Risks

- `bundleAnalyzerPlugin` is experimental (`rolldown/experimental`) — API may change; Vitest asserts on observed keys only
