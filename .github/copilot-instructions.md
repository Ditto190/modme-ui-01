# Copilot Instructions - ModifyMe Consulting GenUI Workspace

## Project Philosophy
**Local-First, Privacy-Focused, Generative.**
This workspace is a **Generative UI (GenUI) R&D lab** designed for consulting workflows. It combines the safety and auditability of a consulting platform with the dynamic, agentic interface of GenUI.

### Core Principles
1.  **Local-Only**: No external cloud dependencies for data processing unless configured.
2.  **Privacy**: Client data (`data/`) never leaves the machine.
3.  **GenUI First**: Interfaces are generated on-demand by agents, not just hardcoded.
4.  **Auditability**: All agent actions and creations are logged.
5.  **Dual-Runtime**: Next.js Frontend + Python ADK Backend.

---

## Architecture

### 1. Hybrid GenUI Stack
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4.
- **Orchestration**: CopilotKit (TypeScript) manages the "Chat" and "Canvas" state.
- **Backend Agent**: Python ADK (Google Agent Development Kit) running on `localhost:8000`.
- **Bridge**: `useCoAgent` hooks sync state between React and Python.

### 2. GenUI Patterns
- **Static GenUI**: Agent picks from a registry of safe components (`src/components/registry/`).
- **Declarative GenUI**: Agent generates JSON schemas rendered by `DashboardRenderer`.
- **Open-Ended GenUI**: Agent writes HTML/JS into a sandboxed iframe (`SandboxedHTML`).

### 3. Directory Structure
```
modme-ui-01/
├── agent/                  # Python ADK Agent (Backend)
│   ├── main.py             # Agent entry point & tool definitions
│   └── .venv/              # Isolated Python environment
├── src/                    # Next.js Frontend
│   ├── app/
│   │   ├── api/copilotkit/ # Edge entry point
│   │   └── canvas/         # GenerativeCanvas (Chat+ surface)
│   ├── components/
│   │   └── registry/       # Reusable GenUI molecules (StatCard, DataTable)
│   ├── lib/
│   │   └── types.ts        # Shared state definitions (TypeScript)
│   └── prompts/
│       └── copilot/        # Cognitive Layer (System instructions for GenUI)
├── data/                   # Local client data (Git-ignored)
└── .github/
    └── copilot-instructions.md # THIS FILE (Source of Truth)
```

---

## Development Guide

### Environment Setup (Critical)
**Node.js Version Management:**
- **Required:** Node.js 22.9.0+ (use nvm for version management)
- **Tool:** [nvm-windows](https://github.com/coreybutler/nvm-windows) (Windows) or [nvm](https://github.com/nvm-sh/nvm) (Unix/macOS)
```bash
nvm install 22.9.0
nvm use 22.9.0
node --version  # Verify v22.9.0
```
- Earlier versions (21.x) cause EBADENGINE warnings and compatibility issues

**Python Environment:**
- Python 3.12+ with virtual environment in `agent/.venv`
- Dependency management via `uv` (recommended) or `pip`

### Startup
Run both runtimes concurrently:
```bash
npm run dev
# Starts:
# - UI: localhost:3000
# - Agent: localhost:8000
```
*(Debugging: `npm run dev:ui` and `npm run dev:agent` separately)*

### Python Agent (Backend)
- **Dependency Management**: `uv` (recommended) or `pip`.
- **State**: `callback_context.state` in Python syncs with `useCoAgent` in React.
- **Tools**: Define tools in `agent/main.py`. Tools MUST allow modifying specific parts of the state (e.g., `set_dashboard_layout`, `update_kpi`).

### Frontend GenUI (React)
1.  **Registry**: Add new "safe" components to `src/components/registry/`.
2.  **State**: Define the interface in `src/lib/types.ts`.
3.  **Canvas**: The `GenerativeCanvas` component renders the current agent state (e.g., specific widgets or open-ended HTML).

### Privacy & Compliance
- **Never commit**: `.env`, `data/`, `artifacts.db`.
- **Audit**: Use `src/utils/audit.py` (if available) to log critical actions.

---

## Technical Constraints & Conventions
- **Styling**: Tailwind CSS 4.
- **Icons**: Lucide React.
- **Components**: Shadcn/UI (atomic) + Material UI (complex data molecules).
- **Agent Instructions**: Located in `src/prompts/copilot/`. Update these to change how the agent "thinks" about UI.
