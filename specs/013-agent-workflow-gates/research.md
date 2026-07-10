# Research: Architecture Patterns as CI/CD Principles

Synthesized for ModMe dual-stack federation (next-forge + GenerativeUI). Scope excludes native mobile/desktop.

## Turborepo CI (Context7: `/vercel/turborepo`)

| Practice       | Detail                                                   | ModMe mapping                                                                                              |
| -------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Affected tasks | `turbo run build test lint --affected`                   | `yarn verify:forge` / `yarn verify:generative` via `scripts/lib/run-verify-stack.mjs` + `stack-paths.json` |
| PR diff depth  | `fetch-depth: 2` on checkout                             | GitHub Actions already shallow; pre-push uses changed files                                                |
| Remote cache   | `TURBO_TOKEN`, `TURBO_TEAM` env                          | next-forge Turbo; root orchestration does not share Bun/Yarn caches across stacks                          |
| CI job shape   | install → affected build → affected test → affected lint | `verify:forge` = check + test + build path-filtered                                                        |

**Actionable:** Document in spec that root path filters are the cross-monorepo equivalent of Turbo `--affected`.

## Architecture-as-CI (literature + industry practice)

| Principle                         | Enforcement tool                    | ModMe today                                      | Future                                      |
| --------------------------------- | ----------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| Dependency rule (clean/hexagonal) | dependency-cruiser, ArchUnit        | `stack-paths.json` + harness lint                | dependency-cruiser on `next-forge/apps/app` |
| Boundary linting in CI            | dependency-cruiser pre-commit       | `.githooks/pre-commit` + `yarn lint:harness`     | Layer rules in `next-forge`                 |
| Affected-only CI                  | Turborepo `--affected`, Nx affected | Path-filtered verify scripts                     | Keep single `stack-paths.json` source       |
| Contract at integration boundary  | Pact, golden schema tests           | `@repo/schemas` Vitest + `molecule-index:verify` | Unify zod v3/v4 schemas (migration)         |
| Federated repos                   | Thin federation, shared manifests   | HTTP/WS only; no lockfile merge                  | `patterns/registry.json` as agent manifest  |

### Paper topics (firecrawl research index)

Use when CLI/MCP available:

- Monorepo build graphs and affected-build optimization
- Architectural linting / dependency structure validation in CI
- Contract testing across repository boundaries
- CI/CD pipeline design for polyglot monorepos

Related methods to include in searches: Bazel query graphs, Nx affected, semantic versioning of API contracts.

## Multi-platform (dual-stack) alignment

ModMe "platforms" = **stacks**, not OS targets:

| Stack              | Package manager | Verify                                    |
| ------------------ | --------------- | ----------------------------------------- |
| next-forge         | Bun + Turbo     | `yarn verify:forge`                       |
| GenerativeUI       | Yarn 3          | `yarn verify:generative`                  |
| Root orchestration | Yarn 3          | `yarn lint:harness`, hooks, agent scripts |

**API-first:** Shared contracts in `@repo/schemas` and `packages/intake-contracts` before UI cutover (Phase 4 migration).

## Recommendations encoded in this feature

1. **Pattern registry** links architecture principles to executable `yarn` gates
2. **Speckit checklists** gate requirements quality before ECL implementation
3. **workflow-from-chats** feeds durable preferences into `spec.md`
4. **Bounded parallel agents** (ADR-0012) unchanged; speckit runs in Wave 0

## References

- [Turborepo GitHub Actions CI](https://github.com/vercel/turborepo/blob/main/skills/turborepo/references/ci/github-actions.md)
- [ModMe ECL](../docs/ECL.md)
- [ADR-0012 bounded parallel lifecycle](../../next-forge/docs/adr/0012-bounded-parallel-agent-lifecycle.md)
- Architectural linting: dependency-cruiser, ArchUnit patterns (industry practice)
