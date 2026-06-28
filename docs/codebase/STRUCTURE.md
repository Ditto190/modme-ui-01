# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| **`next-forge/`** | **Primary** Turborepo — apps (3100–3102), `@repo/*`, Supabase/Prisma | `next-forge/turbo.json`, `next-forge/package.json` |
| **`GenerativeUI_monorepo/`** | **Legacy** agent stack — agent-server (8000), web-dashboard (3001) | `GenerativeUI_monorepo/turbo.json`, `README_GENERATIVE_UI.md` |
| **`src/` / `agent/`** | **Legacy/deprecated** root GenUI R&D stub — do not extend | `AGENTS.md`, `harness/config/environment.json` (`stacks.legacy`) |
| **`scripts/`** | Root orchestration, harness, intake, CI glue | `package.json` scripts, `scripts/launch-manifest.json` |
| **`harness/`** | ECL change tracking, environment contract | `docs/ECL.md`, `harness/config/environment.json` |
| **`C4-Documentation/`** | Product C4 architecture (context → code) | `C4-Documentation/c4-context.md` |
| **`.agents/skills/`** | Repo-scoped agent skills | `AGENTS.md` |
| **`.github/workflows/`** | Path-filtered CI (forge + generative) | `.github/workflows/ci.yml`, `scripts/lib/stack-paths.json` |

### 2) Entry Points

| Stack | Entry | Port | Evidence |
|-------|-------|------|----------|
| next-forge app | `next-forge/apps/app` | 3100 | `scripts/launch-manifest.json` (`forge-app`) |
| next-forge api | `next-forge/apps/api` | 3102 | `launch-manifest.json` |
| agent-server | `GenerativeUI_monorepo/apps/agent-server/src/main.py` | 8000 | `launch-manifest.json`, FastAPI factory |
| Generative UI island | `next-forge/apps/app/app/(authenticated)/generative-ui/` | 3100 (via app) | `docs/codebase/ARCHITECTURE.md` |
| Legacy root UI | `src/app/page.tsx` | [deprecated] | `src/app/` — superseded by next-forge |
| Legacy root agent | `agent/main.py` | [deprecated] | `agent/main.py` — superseded by agent-server |

Orchestration: `yarn dev:forge:core`, `yarn dev:generative` from root (`package.json`).

### 3) Module Boundaries

| Boundary | Owns | Must not own | Evidence |
|----------|------|--------------|----------|
| `next-forge/apps/app` | Auth.js SaaS, Generative UI client island | AG2 orchestration | `.cursor/rules/monorepo-boundaries.mdc` |
| `next-forge/packages/schemas` | Zod contracts, golden JSON | Python runtime | `@repo/schemas`, `fixtures/genui-agent-contract.golden.json` |
| `GenerativeUI_monorepo/apps/agent-server` | FastAPI WebSocket, AG2 GroupChat | Next.js rendering | hexagonal layout in `apps/agent-server/src/` |
| `GenerativeUI_monorepo/apps/web-dashboard` | Legacy CopilotKit dashboard | [migrate → next-forge] | `docs/agent-index.md` migration table |
| Root `src/` / `agent/` | Historical GenUI prototype | New feature work | `AGENTS.md` — deprecated |

**Hard rule:** No `workspace:*` or relative imports across `next-forge/` ↔ `GenerativeUI_monorepo/`.

### 4) Naming and Organization Rules

- **Monorepo apps:** `next-forge/apps/*`, `GenerativeUI_monorepo/apps/*`
- **Shared packages:** `@repo/*` (next-forge), `@generative-ui/*` / workspace names (GenerativeUI)
- **Internal deps:** `workspace:*` within each monorepo only
- **Agent tools (Python):** `snake_case` in `agent-server/src/`
- **React components:** PascalCase files under `components/` or `packages/design-system`

### 5) Evidence

- `docs/codebase/.codebase-scan.txt` (directory tree, manifests)
- `scripts/launch-manifest.json`
- `scripts/lib/stack-paths.json`
- `AGENTS.md`, `docs/agent-index.md`
- `next-forge/turbo.json`, `GenerativeUI_monorepo/turbo.json`
