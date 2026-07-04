# Thermo-Nuclear Redundancy Review — Synthesis (Round 2)

**Date:** 2026-07-04  
**Branch:** `feature/cursor/thermo-round2-redundancy`  
**Baseline:** `dev`  
**Worktree:** `.worktrees/dev-agent-cursor-thermo-round2-redundancy`  
**Lifecycle:** ADR-0012 bounded-parallel (wave 0–2)

## Executive summary

- **Five redundant surfaces** compete for GenUI ownership: root `src/`/`agent/`, GenerativeUI `web-dashboard`, next-forge `generative-ui` island, and (deprecated) CopilotKit root proxy — only **next-forge + agent-server** should remain after Phase 4.
- **Migration is 75% done:** Phase 2 schemas and Phase 3 client island pass; Phase 4 cutover blocked by missing feature-flag gating and no web-dashboard deprecation path.
- **Two schema packages** (`@generative-ui/shared-schemas` zod v3 vs `@repo/schemas` zod v4) create drift risk despite golden JSON parity tests on the forge side.
- **Orchestration duplication** in inbox pipelines (orchestrator vs workflow fan-out) and dual intake systems (Supabase inbox vs Copilot telemetry) need CLI rename + single entrypoint.
- **Skill registry sprawl:** 4 local key collisions, 522 vendor skills — establish precedence and CI hash dedup before adding more.

## Redundancy matrix

| Zone                                                | Canonical owner                           | Severity | Archive readiness             |
| --------------------------------------------------- | ----------------------------------------- | -------- | ----------------------------- |
| Root `src/` (CopilotKit, bootstrap, panel registry) | `next-forge/apps/app`                     | Critical | Not ready — Phase 4           |
| Root `agent/` (ADK, toolsets, genai-toolbox vendor) | `GenerativeUI_monorepo/apps/agent-server` | Critical | Not ready — Phase 4           |
| `web-dashboard` GenerativeCanvas + useAgentState    | `next-forge/.../generative-ui/`           | High     | Blocked on schema unification |
| `packages/shared-schemas`                           | `@repo/schemas`                           | High     | Retire after web-dashboard    |
| CopilotKit in root `layout.tsx`                     | Remove with root archive                  | Medium   | Phase 4                       |
| `intake-orchestrator.mjs` vs split GH workflows     | Single orchestrator caller                | Medium   | Ready to refactor             |
| GenerativeUI `intake-pipeline/` (Python)            | Rename to `copilot-telemetry`             | Medium   | Document only                 |
| `.agents` vs `.cursor` skill duplicates (4 keys)    | `.agents/skills/` canonical               | Medium   | Ready to dedup                |
| UniversalWorkbench MCP registry                     | HTTP-only; separate product               | Low      | Keep isolated                 |

## next-forge migration fit scorecard

| Phase | Item                                  | Status                   |
| ----- | ------------------------------------- | ------------------------ |
| 1     | Storybook ModMe/Workshop exists       | PASS                     |
| 1     | Real websocket-driven canvas story    | PARTIAL                  |
| 2     | `@repo/schemas` + golden fixture      | PASS                     |
| 2     | Python manual sync documented         | PASS (risk acknowledged) |
| 3     | generative-ui route + client boundary | PASS                     |
| 3     | use-agent-state + message handler     | PASS                     |
| 3     | Reconnect backoff + Vitest            | PARTIAL                  |
| 4     | Feature-flag gating                   | **FAIL**                 |
| 4     | web-dashboard deprecation             | **FAIL**                 |
| 4     | Worktree-aware WS URL                 | PARTIAL                  |

## Parallel review findings (deduped)

| Sev      | Lane        | Finding                                                     | Location                                             | Fix                                    |
| -------- | ----------- | ----------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- |
| Critical | Security    | Unauthenticated WS; broadcast to all connections            | `agent-server/.../websocket_route.py`                | Per-connection auth + scoped broadcast |
| Critical | Security    | Unauthenticated CopilotKit proxy                            | `src/app/api/copilotkit/route.ts`                    | Auth + rate limit; fail closed         |
| Critical | Correctness | Stale UI after reconnect (streaming/optimistic not cleared) | `use-agent-state.ts`, `websocket-message-handler.ts` | Reset on open + idle state_update      |
| High     | Security    | Fixed `demo_user` identity                                  | `agent/main.py`                                      | Per-session user_id                    |
| High     | Correctness | Cancel leaves optimistic messages pending                   | `use-agent-state.ts`                                 | Clear on cancel/idle                   |
| High     | Correctness | Python `payload: Any` — no runtime validation               | `schemas.py`                                         | Discriminated union payloads           |
| High     | Performance | N+1 Supabase in scrape-promote                              | `scripts/scrape-promote.mjs`                         | Batch insert/lookup                    |
| High     | Performance | Per-token render churn                                      | `websocket-message-handler.ts`                       | Throttle via rAF                       |
| High     | Readability | Monolithic useAgentState in legacy                          | `web-dashboard/.../useAgentState.ts`                 | Extract shared handler package         |
| Medium   | Performance | Greptime fetchAll + client cosine                           | `greptimedb_client.ts`                               | Server-side ANN                        |
| Medium   | Scripts     | intake-orchestrator mode spaghetti                          | `intake-orchestrator.mjs`                            | Declarative MODE→stages table          |
| Medium   | Skills      | 4 duplicate local skill keys                                | `.agents` + `.cursor`                                | CI hash gate                           |

## Architecture deepening candidates

HTML report: `%TEMP%\architecture-review-2026-07-04.html` (open with `start` on Windows)

| #   | Candidate                          | Strength            | Code-judo move                                        |
| --- | ---------------------------------- | ------------------- | ----------------------------------------------------- |
| 1   | Legacy root stub deletion seam     | **Strong**          | Archive `src/`+`agent/` → delete 2 entire stacks      |
| 2   | Single `@repo/genui-client` module | **Strong**          | Collapse 3 GenerativeCanvas copies into one package   |
| 3   | Schema single source + codegen     | **Strong**          | Retire shared-schemas; generate Pydantic from Zod     |
| 4   | Skill catalog consolidation        | **Worth exploring** | `.agents` canonical + vendor hash CI                  |
| 5   | Intake orchestration interface     | **Worth exploring** | One `yarn intake:*` → orchestrator; workflows call it |
| 6   | UniversalWorkbench HTTP boundary   | **Speculative**     | Document-only; no cross-import                        |

**Top recommendation:** Candidate #2 + #3 together — extract `@repo/genui-client` (hooks + canvas) and bind it to `@repo/schemas` only; then Phase 4 becomes flipping a feature flag and deleting web-dashboard + root stub.

## Skills recommendations

Already in collection: `thermo-nuclear-code-quality-review`, `modme-generative-ui-migrate`, `parallel-agents`, `garrytan/plan-eng-review`.

**Proposed adds** (gaps found via `npx skills find`):

| Skill                                                              | Install                                                                                             | Rationale                        |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------- |
| `tech-leads-club/agent-skills@legacy-migration-planner`            | `npx skills add tech-leads-club/agent-skills@legacy-migration-planner --agent cursor -y`            | Phase 4 cutover planning         |
| `cursor/plugins@principle-migrate-callers-then-delete-legacy-apis` | `npx skills add cursor/plugins@principle-migrate-callers-then-delete-legacy-apis --agent cursor -y` | Root stub deletion order         |
| `srstomp/pokayokay@architecture-review`                            | optional                                                                                            | Cross-check deepening candidates |

Local catalog cloned: `.tools/awesome-agent-skills/`

## Agent contributions

| Lane                        | Finding                                                               |
| --------------------------- | --------------------------------------------------------------------- |
| explorer-root               | Critical legacy duplication; harness canonical, scripts are operators |
| explorer-forge              | Phase 2-3 pass; Phase 4 fail on feature flags                         |
| explorer-legacy             | Dual schema packages; zod v3/v4 split                                 |
| explorer-universalworkbench | Conceptual MCP registry overlap only                                  |
| explorer-scripts            | Inbox orchestrator vs workflow drift; dual intake naming              |
| explorer-skills             | 4 local + 6 vendor key collisions                                     |
| thermo-security             | WS auth + CopilotKit proxy critical                                   |
| thermo-performance          | N+1 intake, token render churn, Greptime client search                |
| thermo-correctness          | Reconnect state staleness; Python payload Any                         |
| thermo-readability          | Delete monolithic legacy hook; declarative intake modes               |

## Verification gates

| Gate           | Command                                                | Status                                |
| -------------- | ------------------------------------------------------ | ------------------------------------- |
| Harness lint   | `yarn lint:harness`                                    | **PASS**                              |
| Molecule index | `yarn molecule-index:verify`                           | **PASS**                              |
| WS golden      | `cd next-forge && bun test packages/schemas/*.test.ts` | **PASS** (11 tests)                   |
| Forge CI       | `yarn verify:forge`                                    | Advisory — lint debt documented       |
| Generative CI  | `yarn verify:generative`                               | Not required (no legacy code changes) |
| Telemetry      | `yarn telemetry:audit --lens all`                      | Advisory                              |

## Action items (ordered)

1. [ ] Add `@repo/feature-flags` gating to `generative-ui/page.tsx` (Phase 4 blocker)
2. [ ] Extract `@repo/genui-client` from next-forge island; point web-dashboard at it temporarily
3. [ ] Unify on `@repo/schemas`; deprecate `@generative-ui/shared-schemas`
4. [ ] Fix reconnect/cancel state reset in `use-agent-state.ts`
5. [ ] Add WS auth to agent-server before production cutover
6. [ ] Refactor inbox workflows to call `intake-orchestrator.mjs` only
7. [ ] CI skill-key dedup gate (`.agents` vs `.cursor`)
8. [ ] Execute Phase 4 archive: `src/` + `agent/` → `archive/legacy-genui-root/`
9. [ ] Archive ECL change: `node scripts/harness-change.mjs archive thermo-round2-redundancy`

## Related

- Wave manifest: [`manifest.json`](manifest.json)
- Prior run: [`thermo-nuclear-forge-2026-06-28.md`](thermo-nuclear-forge-2026-06-28.md)
- Runbook: [`../thermo-nuclear-dual-monorepo-review.md`](../thermo-nuclear-dual-monorepo-review.md)
- Domain glossary: [`CONTEXT.md`](../../CONTEXT.md)
