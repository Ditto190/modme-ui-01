---
timestamp: 2026-06-28T00:00:00Z
agent: cursor
agent_role: architect
type: research
severity: high
tags: [migration, tech-debt, testing, schemas, playwright, awt]
branch: feature/cursor/agent-terminal-orchestration
---

# Tech debt register — GenerativeUI → next-forge migration (2026-06-28)

Ranked by **ROI** (impact ÷ effort) for Phase 2–4 orchestration. Evidence from `docs/codebase/.codebase-scan.txt`, code inspection, and `.agents/skills/modme-generative-ui-migrate/SKILL.md`.

## P0 — Quick wins (≤1 session each)

| ID | Debt | Impact | Effort | Evidence | Recommended action |
|----|------|--------|--------|----------|-------------------|
| TD-01 | **Playwright absent from CI** | Regressions ship undetected | Low | `.github/workflows/ci.yml` runs Vitest only; `verify-forge-ci.ps1` has no E2E | Opt-in CI job after stack health check (Lane D chore) |
| TD-02 | **`.firecrawl/` not gitignored** | Accidental commit of scraped docs | Trivial | Root `.gitignore` | Add `.firecrawl/` |
| TD-03 | **Docs/codebase stale ASK USER items** | Onboarding friction | Low | `TESTING.md`, `ARCHITECTURE.md` | Resolved in Lane A refresh (pytest + reconnect + CI facts) |

## P1 — Migration blockers

| ID | Debt | Impact | Effort | Evidence | Recommended action |
|----|------|--------|--------|----------|-------------------|
| TD-10 | **Schema drift TS ↔ Python** | WS payload mismatch breaks canvas | Medium | Churn on `next-forge/packages/schemas/index.ts` (4); manual sync note in migrate skill | Vitest contract test + golden JSON snapshot (Lane B) |
| TD-11 | **No feature flag on `/generative-ui`** | Phase 4 cutover risk | Medium | `modme-6ea` seeded; route exists under `(authenticated)/generative-ui/` | `@repo/feature-flags` gate (Lane C) |
| TD-12 | **Storybook ≠ GenerativeCanvas parity** | UI regressions before prod | Medium | `modme-530`; `modme-workshop.stories.tsx` | Complete workshop stories (Lane C) |
| TD-13 | **E2E manual stack dependency** | Flaky local verify | Medium | `playwright.config.ts` no `webServer` | Document pre-req + optional `globalSetup` health check |

## P2 — Quality / parity

| ID | Debt | Impact | Effort | Evidence | Recommended action |
|----|------|--------|--------|----------|-------------------|
| TD-20 | **AWT visual regression missing** | Streaming UI hard to assert in Playwright | Medium | Plan Phase 0 baseline: AWT not installed | Install AWT skill; one `generative-canvas-smoke.yaml` (Lane E) |
| TD-21 | **Dual monorepo boundary enforcement** | Accidental cross-import | High if violated | `monorepo-boundaries.mdc` | Critic pass + grep in CI (integration gate) |
| TD-22 | **GenerativeUI README test stack stale** | Wrong commands for contributors | Low | `GenerativeUI_monorepo/README.md` Cypress/Jest | [TODO] Align README with current Vitest/pytest layout |
| TD-23 | **scan.py slow on main checkout** | Phase 0 friction | Low | Scan hit `.conda/` (29k+ files); 27+ min run | Add `.conda`, `.vendor` to `EXCLUDE_DIRS` or document worktree-only scan |

## P3 — Chores / hygiene

| ID | Debt | Impact | Effort | Evidence | Recommended action |
|----|------|--------|--------|----------|-------------------|
| TD-30 | **verify:forge docs incomplete** | Agents skip correct verify | Low | `modme-ceb` | Document in onboarding (existing beads chore) |
| TD-31 | **Beads ↔ GitHub issue duplication** | Tracking drift | Low | Seeded + ad-hoc Playwright issues (`modme-d6r`, `modme-d7a`, `modme-8uj`) | Link under migration epic (Phase 0.4) |
| TD-32 | **MCP registry TODO in knowledge-base** | Incomplete tooling | Low | `.codebase-scan.txt` TODO in `knowledge-base.json` | Out of migration scope unless intake pipeline tasks it |

## Hotspot quantification (schema drift)

| Location | Role |
|----------|------|
| `GenerativeUI_monorepo/packages/shared-schemas/src/index.ts` | Source Zod definitions |
| `next-forge/packages/schemas/index.ts` | Target mirror (4 commits/90d churn) |
| `GenerativeUI_monorepo/apps/agent-server/` | Pydantic models (pytest in `pyproject.toml`) |

**Duplication signal:** No automated contract test; manual sync documented in `modme-generative-ui-migrate` Phase 2.

## Playwright port matrix (resolved)

| Project | Spec | baseURL | Port |
|---------|------|---------|------|
| `web` | `catalog.spec.ts` | `PLAYWRIGHT_WEB_URL` | 3101 |
| `app` | `generative-ui.spec.ts` | `PLAYWRIGHT_APP_URL` | 3100 |
| `api` | `inbox-api.spec.ts` | `PLAYWRIGHT_API_URL` | 3102 |

Prior concern ("catalog only on 3101") is **by design** in current config — not a bug; auth-heavy generative-ui correctly targets app port 3100.

## Migration checklist gap (vs modme-generative-ui-migrate)

| Checklist item | Status |
|----------------|--------|
| Phase 2 schemas in `@repo/schemas` | Started (mirror exists) |
| Phase 2 contract test | **Open** |
| Phase 3 client island | Started (`generative-ui/` route) |
| Phase 3 WebSocket hardening | **Partial** (reconnect in hook) |
| Phase 3 feature flag | **Open** |
| Phase 4 cutover | **Open** (`modme-6ea`) |
| Storybook workshop parity | **Open** (`modme-530`) |
| Playwright generative + inbox specs | **Present** (files exist; CI gate open) |
| AWT YAML | **Open** |

## Recommended execution order

1. TD-10 schema contract test → unblocks generative-ui hardening
2. TD-11 feature flag + TD-12 Storybook → unblocks cutover prep
3. TD-01 CI E2E opt-in + TD-20 AWT smoke → integration gates
4. TD-02, TD-03, TD-30 hygiene in parallel with lanes
