# Testing

## Core Sections (Required)

### 1) Test Frameworks

- next-forge: Vitest (evidence: `docs/codebase/.codebase-scan.txt` and `.github/copilot-instructions.md` which reference `npx bun run test` and Vitest in next-forge commands).
- GenerativeUI_monorepo: Yarn workspace tests; some packages use Jest/Vitest depending on package (evidence: `docs/codebase/.codebase-scan.txt`, package.json entries under `GenerativeUI_monorepo/packages`).
- End-to-end: Playwright referenced by Playwright MCP assets and Playwright test templates in repository (evidence: Playwright-related skills in `.agents/skills` and Playwright MCP references).

### 2) Test Organization

- Unit tests: per-package under `tests/`, `__tests__/`, or `src/__tests__/` (workspace layout follows Yarn workspaces in `GenerativeUI_monorepo/` and Bun workspaces in `next-forge/`). [TODO: enumerate exact test folders per workspace — requires deeper per-package inspection].
- Integration tests: API-focused integration tests expected under `GenerativeUI_monorepo/apps/agent-server/tests/` per typical FastAPI layouts (evidence: `apps/agent-server` exists; explicit test folders not enumerated in scan output).
- E2E tests: stored in `tests/e2e` or `playwright` config locations when present — [TODO: confirm exact paths].

### 3) Test Runners and Commands

- next-forge: `npx bun run test` or `npx bun run vitest` per package scripts (evidence: `.github/copilot-instructions.md`, `next-forge` package.json scripts referenced in `docs/codebase/STACK.md`).
- GenerativeUI: `yarn workspace <pkg> run test` (evidence: repo's monorepo conventions in `.github/copilot-instructions.md`).
- Playwright: `npx playwright test --project=chromium` (evidence: Playwright templates and MCP skills).

### 4) Mocking and Test Data

- Shared-schemas (`packages/shared-schemas`) used as canonical types and fixtures across TS/Python boundaries — evidence: `GenerativeUI_monorepo/packages/shared-schemas` and references in `apps/agent-server` code.
- Python backend tests (agent-server) likely use pytest or unittest — [ASK USER] 2: confirm whether backend Python tests use pytest or unittest.

### 5) CI Integration

- Tests run in CI via GitHub Actions and Buildkite workflows (evidence: `docs/codebase/.codebase-scan.txt`, `.github/workflows/`, `.buildkite/`).
- Some verification tasks are grouped into `verify:forge` and `verify:generative` scripts (evidence: `AGENTS.md` and `docs/codebase/CONVENTIONS.md`).
- Artifacts and reports: Workflows mention test reporting (JUnit/XML) in some action files — [TODO: enumerate exact workflow files and artifact upload steps].

### 6) Evidence

- `docs/codebase/.codebase-scan.txt`
- `.github/copilot-instructions.md`
- `.agents/skills` (Playwright & testing-related skills)
- `AGENTS.md`

[ASK USER] 2: Confirm whether backend Python tests use pytest or unittest, and whether E2E Playwright runs are included in PR checks or only in nightly CI.