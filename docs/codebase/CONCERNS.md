# Concerns

## Core Sections (Required)

### 1) Technical Debt and Churn

**High-churn files (last 90 days, from `docs/codebase/.codebase-scan.txt`):**

| Churn | Path | Signal |
|------:|------|--------|
| 18 | `CHANGELOG.md` | Release/doc churn |
| 10 | `.gitignore` | Tooling/vendor growth |
| 9 | `.github/workflows/ci.yml` | CI consolidation |
| 9 | `docs/agent-tech-guide.md` | Living agent docs |
| 8 | `AGENTS.md` | Agent orchestration drift |
| 6 | `GenerativeUI_monorepo/apps/agent-server/src/models/schemas.py` | Contract parity work |
| 6 | `scripts/pre-commit-checks.mjs` | Harness + path-filter wiring |

**Legacy root debt:** `src/` and `agent/` remain in repo as deprecated stubs — archive planned Phase 4 (`docs/migration/phase4-cutover.md`).

### 2) Architectural Risks

| Risk | Detail | Mitigation |
|------|--------|------------|
| Dual monorepo boundaries | Cross-imports forbidden | `monorepo-boundaries.mdc`, HTTP/WS only |
| Schema drift TS/Python | Manual sync | Golden JSON + `ws-contract.test.ts` + `test_schemas_contract.py` |
| WebSocket desync | Client offline / reconnect | `use-agent-state.ts` backoff + Vitest |
| Golden JSON merge conflicts | Duplicate fixtures | Single canonical content; validate in CI |
| Worktree yarn deps | Fresh worktrees need `yarn install` | `yarn worktree:doctor:fix` |

### 3) Testing Gaps

| Gap | Status |
|-----|--------|
| Playwright full stack in CI | **Documented as local-only** — `e2e-smoke` runs schema tests only |
| Root legacy tests | No CI job for `src/`/`agent/` — deprecated |
| Bun not on PATH (Windows) | `verify:forge` fails without `bun install` in next-forge | Baseline debt |

### 4) Operational Constraints

- Worktree isolation mandatory (`docs/multi-agent-worktrees.md`)
- UniversalWorkbench copies read-only unless tasked
- Port blocks: next-forge 3100–3102; GenerativeUI 3000–3004; agent 8000

### 5) Phase 4 / Legacy Archive Plan

See [`docs/migration/phase4-cutover.md`](../migration/phase4-cutover.md) and harness active change `harness-setup-dual-monorepo`.

Root `src/` + `agent/` → archive to `archive/legacy-genui-root/` after next-forge generative-ui island is default.

### 6) Evidence

- `docs/codebase/.codebase-scan.txt`
- `harness/config/environment.json` (`stacks.legacy`)
- `AGENTS.md`
- `.github/workflows/ci.yml`
- `docs/migration/phase4-cutover.md`
