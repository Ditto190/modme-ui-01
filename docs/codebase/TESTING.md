# Testing

## Core Sections (Required)

### 1) Test Frameworks

- **next-forge:** Vitest (`vitest` in `next-forge/apps/app/package.json`, `next-forge/apps/api/package.json`; configs at `next-forge/apps/app/vitest.config.mts`, `next-forge/apps/api/vitest.config.mts`).
- **GenerativeUI_monorepo:** Yarn workspace tests; package-level runners vary (evidence: `GenerativeUI_monorepo/AGENTS.md`, per-package `package.json` scripts).
- **Python agent-server:** pytest (`pytest = "^7.4.0"` in `GenerativeUI_monorepo/apps/agent-server/pyproject.toml`; `poetry run pytest` documented in `README.md`).
- **E2E:** Playwright (`@playwright/test` in `next-forge/package.json`; config at `next-forge/playwright.config.ts`).

### 2) Test Organization

| Stack              | Unit / integration                                         | E2E                                                                                                       |
| ------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| next-forge app     | `next-forge/apps/app/__tests__/` (e.g. `sign-in.test.tsx`) | `next-forge/tests/e2e/`                                                                                   |
| next-forge api     | `next-forge/apps/api/__tests__/health.test.ts`             | `next-forge/tests/e2e/inbox-api.spec.ts` (API project)                                                    |
| GenerativeUI       | Per-workspace `tests/`, `__tests__/` under apps/packages   | Legacy Cypress/Jest referenced in root `GenerativeUI_monorepo/README.md` (may be stale vs current layout) |
| Root orchestration | —                                                          | `e2e/worktree-smoke/run.mjs`                                                                              |

**Playwright E2E specs (next-forge):**

- `catalog.spec.ts` — web project, baseURL **3101** (`PLAYWRIGHT_WEB_URL`).
- `generative-ui.spec.ts` — app project, baseURL **3100** (`PLAYWRIGHT_APP_URL`); auth via `signInApp` in `auth.ts`.
- `inbox-api.spec.ts` — api project, baseURL **3102** (`PLAYWRIGHT_API_URL`).

### 3) Test Runners and Commands

| Command                                 | Scope                                            | Evidence                                                                      |
| --------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| `yarn verify:forge`                     | next-forge CI parity: `check` + `test` + `build` | `scripts/verify-forge-ci.ps1`, root `package.json`                            |
| `yarn verify:generative`                | GenerativeUI lint/test/build                     | root `package.json`, `scripts/verify-generative-ci.ps1`                       |
| `cd next-forge && npx bun run test`     | Vitest across next-forge workspaces              | `next-forge/package.json` turbo `test`                                        |
| `cd next-forge && npx bun run test:e2e` | Playwright (`playwright test`)                   | `next-forge/package.json`                                                     |
| `yarn e2e:worktree-smoke`               | Worktree orchestration smoke                     | `e2e/worktree-smoke/run.mjs`, `.github/workflows/ci.yml` job `worktree-smoke` |
| `poetry run pytest`                     | agent-server Python tests                        | `GenerativeUI_monorepo/apps/agent-server/README.md`                           |

**Manual E2E prerequisite:** Playwright config does not start dev servers — run `yarn dev:forge:core` (ports 3100–3102) and, for generative-ui WebSocket tests, `yarn dev:generative` (agent-server **8000**) before `test:e2e`.

### 4) Mocking and Test Data

- **Schema fixtures:** `GenerativeUI_monorepo/packages/shared-schemas` and `next-forge/packages/schemas/index.ts` — canonical Zod types for TS/WebSocket payloads; Python Pydantic in agent-server (manual sync; no cross-monorepo import in tests yet).
- **Vitest:** Node env via `NODE_ENV=test` in app/api package scripts.

### 5) CI Integration

| Workflow / job                                | What runs                                                         | Playwright in PR?                         |
| --------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| `.github/workflows/ci.yml` → `next-forge`     | `bun run check`, `test`, `build` when forge paths change          | **No** — Vitest only                      |
| `.github/workflows/ci.yml` → `worktree-smoke` | `node e2e/worktree-smoke/run.mjs` when orchestration paths change | N/A (orchestration smoke, not Playwright) |
| Pre-push hook                                 | Path-filtered `verify:forge` (lint-only) / advisory generative    | **No** Playwright gate documented         |

Playwright E2E is **local / manual pre-PR** today; not wired into `ci.yml` or `verify:forge`. [TODO: add opt-in CI job after `dev:forge:core` health check — see migration plan Lane D.]

### 6) Evidence

- `docs/codebase-scan/.codebase-scan.txt` (CI/CD PIPELINES, PERFORMANCE & TESTING sections)
- `next-forge/playwright.config.ts`
- `next-forge/tests/e2e/*.spec.ts`
- `next-forge/package.json` (`test:e2e`)
- `.github/workflows/ci.yml`
- `scripts/verify-forge-ci.ps1`
- `GenerativeUI_monorepo/apps/agent-server/pyproject.toml`
