# Concerns

## Core Sections (Required)

### 1) Technical Debt and Churn

**High-churn files (last 90 days, from scan):**

| Churn | Path                                                            | Signal                       |
| ----: | --------------------------------------------------------------- | ---------------------------- |
|    18 | `CHANGELOG.md`                                                  | Release/doc churn            |
|    10 | `.gitignore`                                                    | Tooling/vendor growth        |
|     9 | `.github/workflows/ci.yml`                                      | CI consolidation             |
|     9 | `docs/agent-tech-guide.md`                                      | Living agent docs            |
|     8 | `AGENTS.md`                                                     | Agent orchestration drift    |
|     6 | `GenerativeUI_monorepo/apps/agent-server/src/models/schemas.py` | Contract parity work         |
|     6 | `scripts/pre-commit-checks.mjs`                                 | Harness + path-filter wiring |

**TODOs/FIXMEs:** Scan surfaces many hits from `.conda/` Python stdlib and vendored content — not application debt. Actionable app TODO example: `knowledge-base.json` embedded MCP registry fetcher (`TODO: Implement in phases`).

### 2) Architectural Risks

| Risk                           | Detail                                                                                       | Mitigation status                                                                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dual monorepo boundaries**   | Forbidden: `workspace:*` or relative imports across `next-forge/` ↔ `GenerativeUI_monorepo/` | HTTP/WebSocket only; enforced in `AGENTS.md`, `.cursor/rules/monorepo-boundaries.mdc`                                                                           |
| **Five-way GenUI redundancy**  | Root `src/`, root `agent/`, web-dashboard, forge island, CopilotKit proxy                  | Phase 4 archive + `@repo/genui-client` extraction (Round 2)                                                                                                     |
| **Dual schema packages**       | `@generative-ui/shared-schemas` (zod v3) vs `@repo/schemas` (zod v4)                         | Unify on forge; retire legacy package                                                                                                                           |
| **Schema drift TS/Python**     | `@repo/schemas` vs Pydantic — manual sync                                                    | **Mitigated:** golden JSON + Vitest (`schemas.test.ts`) + pytest (`test_schemas_contract.py`); bump process in `next-forge/packages/schemas/README.md`         |
| **WebSocket state desync**     | GenerativeCanvas depends on agent-server stream                                              | **Mitigated:** `use-agent-state.ts` exponential backoff (max 10, 3–30s), `reconnecting` status, manual `retryConnection`, `visibilitychange` reconnect; Vitest on `reconnect-delay.ts` |
| **Unauthenticated WS**         | agent-server broadcasts to all sockets                                                       | Per-connection auth (Round 2 security)                                                                                                                          |
| **Golden JSON merge conflicts**| Duplicate fixtures                                                                           | Single canonical content; validate in CI                                                                                                                          |
| **Agent orchestration limits** | Multi-agent AG2 + external LLM rate/context limits                                           | Operational monitoring; not code-guarded in repo                                                                                                                |
| **Worktree yarn deps**         | Fresh worktrees need `yarn install`                                                          | `yarn worktree:doctor:fix`                                                                                                                                      |
| **Skill registry collisions**  | 4 keys in both `.agents` and `.cursor`                                                       | CI content-hash dedup gate                                                                                                                                      |
| **Scan performance**           | Full-repo scan traverses `.conda/`, `.vendor/` — slow on Windows                             | Exclude or run from worktree; `.gitignore` does not exclude `.conda` from scan.py `EXCLUDE_DIRS`                                                                |

### 3) Testing Gaps (migration-critical)

| Gap                           | Evidence / status                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Playwright not in CI          | `.github/workflows/ci.yml` next-forge job runs Vitest only; full stack documented as local-only |
| E2E requires manual stack     | `playwright.config.ts` — no `webServer`; ports 3100–3102 + agent 8000                          |
| Schema parity test missing    | ~~No committed contract test~~ — `@repo/schemas` Vitest + agent-server pytest against golden JSON |
| Root legacy tests             | No CI job for `src/`/`agent/` — deprecated                                                        |
| Bun not on PATH (Windows)     | `verify:forge` fails without `bun install` in next-forge                                          |
| AWT not installed             | No `next-forge/tests/awt/` YAML scenarios                                                      |
| GenerativeUI legacy test docs | `GenerativeUI_monorepo/README.md` still mentions Cypress/Jest — may not match current packages |

### 4) Operational Constraints

- **Worktree isolation:** Feature work must use `scripts/new-agent-worktree.ps1` — concurrent agents on main checkout cause git/port conflicts (`AGENTS.md`, `docs/multi-agent-worktrees.md`).
- **UniversalWorkbench copies:** Do not edit `UniversalWorkbench-staging` or `UniversalWorkbench-dev` unless explicitly tasked.
- **Port blocks:** next-forge 3100–3102; GenerativeUI 3000–3004, agent 8000 — use `load-worktree-ports.ps1` in worktrees.

### 5) Evidence

- `docs/codebase-scan/.codebase-scan.txt` (HIGH-CHURN FILES, TODO section, CODE METRICS)
- `next-forge/apps/app/app/(authenticated)/generative-ui/hooks/use-agent-state.ts`
- `next-forge/playwright.config.ts`
- `.github/workflows/ci.yml`
- `.agents/skills/modme-generative-ui-migrate/SKILL.md`
- `AGENTS.md`
- `docs/migration/phase4-cutover.md`
- `docs/workflows/reports/thermo-nuclear-redundancy-2026-07-04.md` (Round 2 synthesis)
- `CONTEXT.md` (domain glossary)
