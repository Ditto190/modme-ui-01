# Concerns

## Core Sections (Required)

### 1) Technical Debt and Churn

**High-churn files (last 90 days, from scan):**

| Churn | Path                                                        | Signal                           |
| ----: | ----------------------------------------------------------- | -------------------------------- |
|    13 | `CHANGELOG.md`                                              | Release/doc churn                |
|    10 | `.gitignore`                                                | Tooling/vendor growth            |
|     7 | `package.json`, `.vscode/settings.json`, `AGENTS.md`        | Agent/orchestration config drift |
|     6 | `docs/agent-tech-guide.md`                                  | Living agent docs                |
|     5 | `.github/workflows/ci.yml`, `scripts/pre-commit-checks.mjs` | CI consolidation in progress     |
|     4 | `next-forge/packages/schemas/index.ts`                      | Migration schema touchpoint      |

**TODOs/FIXMEs:** Scan surfaces many hits from `.conda/` Python stdlib and vendored content — not application debt. Actionable app TODO example: `knowledge-base.json` embedded MCP registry fetcher (`TODO: Implement in phases`).

### 2) Architectural Risks

| Risk                           | Detail                                                                                       | Mitigation status                                                                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dual monorepo boundaries**   | Forbidden: `workspace:*` or relative imports across `next-forge/` ↔ `GenerativeUI_monorepo/` | HTTP/WebSocket only; enforced in `AGENTS.md`, `.cursor/rules/monorepo-boundaries.mdc`                                                                           |
| **Schema drift TS/Python**     | `@repo/schemas` vs Pydantic — manual sync                                                    | **Mitigated:** golden JSON + Vitest (`schemas.test.ts`) + pytest (`test_schemas_contract.py`); bump process in `next-forge/packages/schemas/README.md`         |
| **WebSocket state desync**     | GenerativeCanvas depends on agent-server stream                                              | **Mitigated:** `use-agent-state.ts` exponential backoff (max 10, 3–30s), `reconnecting` status, manual `retryConnection`, `visibilitychange` reconnect; Vitest on `reconnect-delay.ts` |
| **Agent orchestration limits** | Multi-agent AG2 + external LLM rate/context limits                                           | Operational monitoring; not code-guarded in repo                                                                                                                |
| **Scan performance**           | Full-repo scan traverses `.conda/`, `.vendor/` — slow on Windows                             | Exclude or run from worktree; `.gitignore` does not exclude `.conda` from scan.py `EXCLUDE_DIRS`                                                                |

### 3) Testing Gaps (migration-critical)

| Gap                           | Evidence                                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Playwright not in CI          | `.github/workflows/ci.yml` next-forge job runs Vitest only                                     |
| E2E requires manual stack     | `playwright.config.ts` — no `webServer`; ports 3100–3102 + agent 8000                          |
| Schema parity test missing    | ~~No committed contract test~~ — `@repo/schemas` Vitest + agent-server pytest against golden JSON |
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
