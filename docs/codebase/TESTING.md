# Testing

## Core Sections (Required)

### 1) Test Frameworks

| Stack | Framework | Evidence |
|-------|-----------|----------|
| next-forge | Vitest | `next-forge/package.json` `test` script, `.github/workflows/ci.yml` |
| GenerativeUI | Jest / Vitest per package | `GenerativeUI_monorepo/package.json`, CI `yarn test` |
| agent-server | pytest | `apps/agent-server/tests/`, `test_schemas_contract.py` |
| WS contracts | Vitest + golden JSON | `next-forge/packages/schemas/ws-contract.test.ts` |
| E2E (local) | Playwright | `next-forge/playwright.config.ts` |
| Root scripts | Vitest | `scripts/__tests__/`, `yarn inbox:test` |

### 2) Test Organization

| Area | Location | Evidence |
|------|----------|----------|
| Schema unit tests | `next-forge/packages/schemas/*.test.ts` | `schemas.test.ts`, `ws-contract.test.ts` |
| Agent-server contract | `GenerativeUI_monorepo/apps/agent-server/tests/` | `test_schemas_contract.py` |
| Generative UI hooks | `next-forge/apps/app/.../generative-ui/` | `reconnect-delay.ts` Vitest |
| E2E specs | `next-forge/tests/e2e/` | `generative-ui.spec.ts` [if present] |
| CI smoke | `.github/workflows/ci.yml` `e2e-smoke` job | Schema tests only in CI; full Playwright needs stack |

### 3) Test Runners and Commands

```powershell
# next-forge (from root)
yarn verify:forge          # check + test + build

# GenerativeUI
yarn verify:generative     # lint + test + build:product

# Both stacks
yarn verify:all

# Harness / ECL
yarn lint:harness

# Schema WS contract only (from next-forge/)
cd next-forge && bun test packages/schemas/ws-contract.test.ts

# agent-server pytest
cd GenerativeUI_monorepo/apps/agent-server && poetry run pytest tests/test_schemas_contract.py
```

### 4) Mocking and Test Data

- **Golden contract:** `genui-agent-contract.golden.json` duplicated in `@repo/schemas/fixtures/` and `agent-server/tests/fixtures/` — no cross-monorepo imports
- **Observability snapshots:** `next-forge/packages/schemas/__snapshots__/observability.test.ts.snap`
- **Inbox contracts:** Zod schemas in `@repo/schemas/inbox.js`

### 5) CI Integration

| Job | Trigger (path filter) | Steps | Evidence |
|-----|----------------------|-------|----------|
| `next-forge` | `next-forge/**` | check, test, build | `ci.yml` |
| `generative-ui` | `GenerativeUI_monorepo/**` | lint, test, build:product | `ci.yml` |
| `harness-lint` | harness docs | lint-ecl, lint-encoding, stack-paths sync | `ci.yml` |
| `e2e-smoke` | e2e + ws-contract | Vitest schema tests; Playwright documented as local-only | `ci.yml` (`continue-on-error: true`) |

**Playwright in CI:** Full E2E requires agent-server (:8000) + app (:3100). CI runs schema/contract tests only; run Playwright locally with full stack (`docs/codebase/CONCERNS.md`).

### 6) Evidence

- `.github/workflows/ci.yml`
- `scripts/lib/stack-paths.json`
- `next-forge/packages/schemas/ws-contract.test.ts`
- `GenerativeUI_monorepo/apps/agent-server/tests/test_schemas_contract.py`
- `docs/codebase/.codebase-scan.txt` (CI/CD PIPELINES section)
