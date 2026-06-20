# Testing

## Core Sections (Required)

### 1) Test Frameworks

- Unit test framework: [TODO - likely Jest/Vitest for TS and Pytest for Python based on typical Turborepos]
- E2E framework: [TODO - Playwright mentioned in `mcp.json` in root but needs verification]
- Orchestration: Tests are run via Turborepo (`yarn test` runs tests across all workspaces).

### 2) Test Organization

- Test locations: [TODO]
- Execution commands: `yarn test`

### 3) CI Pipeline Integration

- CI Providers: GitHub Actions (`.github/workflows/ci.yml`), Buildkite (`.buildkite/pipeline.yml`), GitLab CI (`.gitlab-ci.yml`).
- Triggers: Push/PR to `main`, `master`, `develop`.

### 4) Evidence

- `GenerativeUI_monorepo/README_GENERATIVE_UI.md`
- `AGENTS.md`
- `docs/agent-tech-guide.md`
