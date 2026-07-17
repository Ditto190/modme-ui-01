# PROJECT_BRIEF.md — Frontend Gen Engine

> Last updated: 2026-07-05 | Sprint 0 (Agent runway) | Status: In Progress

## 1. Project Overview

Build a **molecule-catalog-first frontend generation engine** in next-forge. Agents compose UIs from typed **molecules** (Zod schemas + GenUI tiers), validated at the network boundary, and rendered in the existing generative-ui route. Legacy WebSocket agent-server stays live under a strangler pattern until TanStack AI reaches parity (Phase 4).

## 2. Concept / Product Description

**User flow (target MVP, Phase 2):**

1. Consultant opens **Generative UI** in the next-forge app (`/generative-ui`).
2. **Left panel** — browse `catalog.v1.json` molecules (search by `route_hint`, tags, tier).
3. **Center** — `MoleculeRenderer` live preview for the selected molecule.
4. **Right panel** — existing WebSocket agent canvas (unchanged until Phase 4 cutover).

**Molecule tiers:**

| Tier | Renderer | Notes |
|------|----------|-------|
| `static` | `@repo/design-system` + schema props | Storybook baseline |
| `declarative` | `DeclarativeFormCompiler` (WebMCP-inspired) | Zod at edge |
| `open-ended` | Sandboxed HTML island | CSP hardening deferred |

**Out of MVP:** TanStack AI BFF, agentgateway, YARA gates, Dolt catalog branches.

## 3. Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript strict, Tailwind + shadcn, `@repo/design-system`
- **Catalog / renderer:** `@repo/gen-engine` (Phase 1), `@repo/schemas`, `packages/intake-contracts`
- **Data fetching:** TanStack Query v5 + shared `api-client` (Phase 2)
- **Legacy agent:** FastAPI agent-server WebSocket (GenerativeUI) — strangler only
- **Build spine:** `scripts/molecule-index-orchestrator.mjs`, GenerativeUI `molecule-generator.ts`
- **Testing:** Vitest (packages), Storybook workshop (`6106`), Playwright (Ivy lane)
- **CI/CD:** GitHub Actions, `yarn verify:forge`, `yarn gen-engine:verify` (Phase 2)
- **Agent orchestration:** beads, worktrees, ODW, ai-team lanes, Atlas contract gates

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Ingest spine (build time)                    │
│  generate_schemas → schema-crawler → molecule-generator         │
│       → molecule-index-orchestrator → catalog.v1.json           │
└────────────────────────────┬────────────────────────────────────┘
                             │ validated JSON + Zod contracts
┌────────────────────────────▼────────────────────────────────────┐
│                     @repo/gen-engine (next-forge)                │
│  catalog loader → MoleculeRenderer → DeclarativeFormCompiler      │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│  apps/app/generative-ui  │  workshop/ModMe/Molecules (Storybook) │
│  catalog browser + preview │  visual regression                    │
│  + WebSocket panel (strangler)                                   │
└─────────────────────────────────────────────────────────────────┘
                             │ Phase 4 (deferred)
┌────────────────────────────▼────────────────────────────────────┐
│  apps/api Hono BFF → TanStack AI → optional agentgateway          │
└─────────────────────────────────────────────────────────────────┘
```

See also: [`C4-Documentation/c4-context.md`](../../C4-Documentation/c4-context.md), [`C4-Documentation/c4-container.md`](../../C4-Documentation/c4-container.md).

## 5. Key Files Map

| Area | Path | Contents |
|------|------|----------|
| Program brief | `docs/frontend-gen-engine/PROJECT_BRIEF.md` | This file — cross-chat source of truth |
| Agent runway | `docs/agents/*.md` | Issue tracker, triage labels, domain rules |
| Orchestrator | `scripts/molecule-index-orchestrator.mjs` | Catalog build spine (extend Phase 1) |
| Molecule types | `next-forge/packages/schemas/molecule-index.ts` | Types (not yet consumed by UI) |
| Gen-engine pkg | `next-forge/packages/gen-engine/` | **Phase 1** — loader, renderer, hooks |
| Catalog artifact | `data/molecule-index/catalog.v1.json` | **Phase 1** emitted catalog |
| Intake contract | `packages/intake-contracts/schemas/molecule-catalog.mjs` | **Phase 1** Zod contract |
| Generative UI route | `next-forge/apps/app/app/(authenticated)/generative-ui/` | WebSocket today; catalog browser Phase 2 |
| Agent WS hook | `.../generative-ui/hooks/use-agent-state.ts` | Strangler — keep until parity |
| Workshop stories | `next-forge/apps/workshop/stories/ModMe/Molecules/` | **Phase 2** |
| C4 stubs | `C4-Documentation/c4-context.md`, `c4-container.md` | Engine context + containers |
| Sprint docs | `docs/frontend-gen-engine/sprint-N/` | plan.md, progress.md, done.md |
| Plan (read-only) | `.cursor/plans/frontend_gen_engine_*.plan.md` | Full phased plan — do not edit from agents |

## 6. Team Roles

| Agent | Name | Role | This program |
|-------|------|------|--------------|
| Producer | **Remy** | Sprint plans, coordination, merges PRs to `dev` | Owns sprint plans; never writes product code |
| Frontend | **Nova** | UI, components, catalog browser, `MoleculeRenderer` | Primary implementer Phases 1–3 |
| Backend | **Sage** | API, BFF, auth | Phase 2 `api-client`; Phase 4 Hono + TanStack AI |
| Visual / CSS | **Milo** | Design system, Storybook polish | Workshop stories, tier styling |
| QA | **Ivy** | Playwright, sign-off, bug filing | `yarn gen-engine:verify`, sprint sign-off docs |
| DevOps | **Dash** | CI gates, deploy | `verify:forge`, PR checks |
| Product | **Kira** | UX flows | Catalog browse + preview UX |

Customize chat names per IDE window; roles stay stable.

## 7. Sprint Status

| Sprint | Name | Status | Scope |
|--------|------|--------|-------|
| 0 | Agent runway | ✅ Complete | `docs/agents/`, PROJECT_BRIEF, C4 stubs, beads epic |
| 1 | Catalog + gen-engine pkg | ✅ Complete | `catalog.v1.json`, `@repo/gen-engine` MVP |
| 2 | Schema-driven UI | ✅ Complete | api-client, MoleculeWorkbench, Storybook |
| 3 | WebMCP forms bridge | ✅ Complete | `DeclarativeFormCompiler`, inbox ADR |
| 4 | TanStack AI strangler | ⏳ Deferred | Hono BFF, feature flag cutover — see §Phase 4 note below |

### Phase 4 (deferred)

TanStack AI BFF strangler, agentgateway, and feature-flag cutover from WebSocket are **out of scope** for the current program. Keep the legacy `GenerativeCanvas` panel until parity is proven. Track as a beads child under `modme-frontend-gen-engine` when Phase 3 ships.

## 8. Current State (rewrite every sprint)

**What works:**

- Molecule index orchestrator emits `catalog.v1.json` with `source_only: false` and per-molecule JSON files.
- `@repo/gen-engine` package: catalog loader, tier renderers, `DeclarativeFormCompiler`, TanStack Query hooks.
- Generative UI route with three-column `MoleculeWorkbench` (catalog | preview | WebSocket canvas).
- Storybook per-tier stories (`StaticTier`, `DeclarativeTier`, `OpenEndedTier`).
- `yarn gen-engine:verify` CI gate.

**What doesn't work yet:**

- TanStack AI not integrated (Phase 4 deferred).
- `faf` CLI not installed — AI-readiness slots unfilled (see §15).

**What's next:**

- Phase 4 (when scheduled): Hono BFF + TanStack AI strangler behind feature flag.

## 9. Security Rules

1. Secrets in environment variables only — never in code or git.
2. Auth.js for next-forge app sign-in; do not wire Supabase Auth middleware into `apps/app` by default.
3. Zod-parse all catalog and API payloads at the network boundary.
4. `open-ended` tier: CSP and sandbox hardening before production enablement.
5. No `prisma db push --accept-data-loss` on cloud Supabase.

## 10. How to Run Locally

```powershell
# From repo root (prefer a worktree under .worktrees/)
.\scripts\new-agent-worktree.ps1 -Name "frontend-gen" -Owner cursor
. .\scripts\load-worktree-ports.ps1

yarn dev:forge:core          # app 3100, web 3101, api 3102
yarn dev:forge:storybook       # workshop 6106

# Catalog spine (Phase 1+)
yarn molecule-index --stack forge --semver 1.0.0
yarn molecule-index:verify
```

## 11. How to Deploy

- PRs target **`dev`** on `Ditto190/modme-ui-01`, not `main`.
- CI: `yarn verify:forge` (and path-filtered pre-push verify).
- Session finish from worktree: `.\scripts\vibe-session-finish.ps1` with `-CreatePr`.

## 12. Cross-Chat Handoff Protocol

Every sprint chat must do these before finishing:

1. Write `docs/frontend-gen-engine/sprint-N/done.md` — what was built, what's not done, manual setup, files changed.
2. Update this file: **§7** (sprint status) + **§8** (current state).
3. Update `docs/frontend-gen-engine/sprint-N/progress.md` if the sprint folder exists.
4. Commit with a descriptive message: `feat(gen-engine): sprint-N summary` (user-requested commits only).

**Cold start prompt for a new chat:**

```
Read docs/frontend-gen-engine/PROJECT_BRIEF.md and docs/frontend-gen-engine/sprint-N/progress.md.
You are Nova (frontend). Continue Sprint N from the last checkpoint.
Work in a .worktrees/ checkout. Do not edit the plan file.
```

**Human as message bus:** Producer (Remy) chat plans; dev chat (Nova/Sage) implements; QA chat (Ivy) signs off after merge to `dev`.

## 13. Bug & Fix Tracking

**GitHub Issues** on `Ditto190/modme-ui-01` are the source of truth for human-visible bugs. **Beads** (`modme-*`) track multi-session agent epics and dependencies.

**For Ivy (QA):** File bugs as GitHub issues with labels `bug`, `severity:blocker|major|minor`. Include component, repro steps, expected vs actual. When clear: write `docs/frontend-gen-engine/qa/sprint-N-signoff.md`.

**For Nova/Sage:** Check beads `yarn beads:ready` and GitHub issues before starting. Commits: `fix(gen-engine): description (Fixes #NN)`.

**For Remy:** Triage with labels in [`docs/agents/triage-labels.md`](../agents/triage-labels.md). AFK-ready work gets `ready-for-agent`.

## 14. Multi-Repo Setup

ModMe uses **Git worktrees**, not separate clones (see [`docs/multi-agent-worktrees.md`](../multi-agent-worktrees.md)).

| Lane | Branch pattern | Worktree path |
|------|----------------|---------------|
| Producer | `dev` (read-only coordination) | main or `.worktrees/dev` |
| Nova / Sage | `feature/cursor/<task>` | `.worktrees/dev-agent-cursor-<task>` |
| Ivy QA | `feature/qa-<sprint>` | `.worktrees/dev-agent-cursor-qa-<sprint>` |

**Rules:**

- Feature work **must not** happen in the main checkout.
- Merge feature branches to `dev` via PR — never push directly to `main`.
- Prefer merge over rebase on feature branches (ai-team anti-pattern).
- Load ports before dev: `yarn worktree:ports`.

## 15. Tooling gaps (Phase 0)

### Beads epic — `modme-frontend-gen-engine`

Schema migration blocked writes on this machine (remote v49, local bd v53). Run on the **designated migrator** clone, then `bd dolt push` for other machines.

```powershell
# Designated migrator only:
$env:BD_ALLOW_REMOTE_MIGRATE = "1"
npx @beads/bd migrate
npx @beads/bd dolt push

# Create epic + phase children:
npx @beads/bd create "epic: Frontend Gen Engine" --type epic --description "Molecule-catalog-first UI generation engine"
# Note returned ID, e.g. modme-xxxx

npx @beads/bd create "Phase 1: catalog pipeline + @repo/gen-engine" --parent modme-xxxx --type task
npx @beads/bd create "Phase 2: generative-ui + Storybook + api-client" --parent modme-xxxx --type task
npx @beads/bd create "Phase 3: DeclarativeFormCompiler (WebMCP subset)" --parent modme-xxxx --type task
npx @beads/bd create "Phase 4: TanStack AI strangler (deferred)" --parent modme-xxxx --type task
```

### faf (AI-readiness) — not installed

`faf` is not on PATH. When installed, run at repo root:

```powershell
faf auto
faf go
faf sync   # review before overwriting hand-maintained AGENTS.md sections
```

**Slots to fill after faf install:**

- Monorepo app-type profile → target ≥90% AI-readiness
- Sync discovered commands into `.faf/` and optionally `AGENTS.md`
- Do not overwrite hand-maintained `.cursor/rules/` or root `AGENTS.md` without review

## References

- Plan: `.cursor/plans/frontend_gen_engine_d75a8357.plan.md` (read-only)
- Skills: `modme-molecule-index`, `ai-team-orchestration`, `frontend-data-contracts`, `atlas-contract`
- Agent index: [`docs/agent-index.md`](../agent-index.md)
