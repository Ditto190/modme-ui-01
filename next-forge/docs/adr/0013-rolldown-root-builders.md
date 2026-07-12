# ADR-0013: Rolldown as root builders bundler (analyse smoke)

**Status**: Accepted  
**Date**: 2026-07-12  
**Supersedes**: N/A  
**Related**: [ADR-0011](./0011-terminal-orchestration-without-nx.md), [ADR-0012](./0012-bounded-parallel-agent-lifecycle.md)

## Context

ModMe needs a **machine-readable bundle analyse artefact** for orchestration scripts (control-cli harness, agent-status) so Vitest/CI can assert chunk/module reachability without replacing stack package managers or next-forge Turborepo.

Inbox research pointed at [Rolldown](https://rolldown.rs/) — a Rust JS/TS bundler with a Rollup-compatible API and an experimental `bundleAnalyzerPlugin` that emits `analyze-data.json`.

## Decision

1. **Rolldown is a root builders bundler only** — registered in [`scripts/builders.manifest.json`](../../../scripts/builders.manifest.json) beside SWC/Vite/Dolt.
2. **Yarn 3.3 / Bun remain package managers** — Rolldown does not install or resolve workspace dependencies.
3. **Turborepo remains siloed to next-forge** for app task graphs (ADR-0011).
4. **Analyse artefact** — `bundleAnalyzerPlugin` from `rolldown/experimental` writes `.cache/builders/rolldown/analyze-data.json` (gitignored under `.cache/builders/`).
5. **Vitest** asserts on observed analyse shape (`meta.bundler`, `chunks`, `modules`) — single-writer contract per ADR-0012.

### Commands

```powershell
node scripts/builders-orchestrator.mjs ensure --builder rolldown
node scripts/builders-orchestrator.mjs build --builder rolldown
npx vitest run --config vitest.config.mjs --project orchestration scripts/__tests__/rolldown-builder.test.mjs
```

Config: [`config/builders/rolldown.config.mjs`](../../../config/builders/rolldown.config.mjs)

## Consequences

### Positive

- Deterministic analyse JSON for agents/CI without shipping production GenUI apps through Rolldown yet
- Fits existing builders orchestrator (manifest-driven ensure/verify/build)
- Aligns with thermo-nuclear verification gates

### Negative

- `bundleAnalyzerPlugin` is experimental — Vitest must assert observed keys only
- Extra root `rolldown` devDependency

## Alternatives rejected

| Alternative | Reason |
|-------------|--------|
| Treat Rolldown as package manager | Incorrect; Yarn/Bun already own installs |
| Put Rolldown inside next-forge Turbo | Boundary violation; Turbo stays forge-only |
| Replace Vite for vibe-web-app now | Out of scope; pilot root orchestration first |
| SWC-only smoke | No analyse-data.json artefact for Vitest |

## Verification

```powershell
yarn lint:harness
node scripts/builders-orchestrator.mjs verify --builder rolldown
node scripts/builders-orchestrator.mjs build --builder rolldown
npx vitest run --config vitest.config.mjs --project orchestration scripts/__tests__/rolldown-builder.test.mjs
```
