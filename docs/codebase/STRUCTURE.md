# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

List only meaningful top-level directories and files.

| Path | Purpose | Evidence |
|------|---------|----------|
| `GenerativeUI_monorepo/apps/web-dashboard/` | Next.js 14 + CopilotKit frontend | `GenerativeUI_monorepo/README_GENERATIVE_UI.md` |
| `GenerativeUI_monorepo/apps/agent-server/` | Python FastAPI + AG2 backend | `GenerativeUI_monorepo/README_GENERATIVE_UI.md` |
| `GenerativeUI_monorepo/packages/shared-schemas/` | Shared Zod/Pydantic schemas | `GenerativeUI_monorepo/README_GENERATIVE_UI.md` |
| `.agents/skills/` | Project-scoped agent skills | `AGENTS.md` |
| `.vscode/` | VS Code debug/launch configurations | `docs/agent-tech-guide.md` |
| `.github/` | CI/CD pipelines and copilot rules | `AGENTS.md` |

### 2) Entry Points

- Main runtime entry: `GenerativeUI_monorepo/apps/agent-server/src/main.py` (Backend), Next.js dev server (Frontend)
- Secondary entry points (worker/cli/jobs): `scripts/` (e.g., `pre-commit-checks.mjs`, `cursor-ai/setup.ps1`)
- How entry is selected (script/config): Managed via Turborepo (`yarn dev` starts all)

### 3) Module Boundaries

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| `web-dashboard` | UI components, React hooks, Next.js routes | Heavy AI processing logic, DB calls |
| `agent-server` | Agent GroupChat logic, FastAPI WebSockets | Frontend rendering code |
| `shared-schemas`| Zod schemas, Pydantic schemas | Implementation logic |

### 4) Naming and Organization Rules

- File naming pattern: [TODO]
- Directory organization pattern: Turborepo standard (`apps/` for deployables, `packages/` for shared libraries).
- Import aliasing or path conventions: Workspace protocols `workspace:*` for internal packages.

### 5) Evidence

- `GenerativeUI_monorepo/README_GENERATIVE_UI.md`
- `AGENTS.md`
- `docs/agent-tech-guide.md`
