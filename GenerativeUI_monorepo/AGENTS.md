# AI Agent Instructions for Generative UI Monorepo

**Legacy stack** — maintained until GenerativeUI → next-forge migration cutover (Phase 4).  
**Primary product stack:** `next-forge/` — see [`.agents/skills/modme-generative-ui-migrate/SKILL.md`](../.agents/skills/modme-generative-ui-migrate/SKILL.md) and [`../docs/agent-index.md`](../docs/agent-index.md).

This Turborepo-powered monorepo contains AI-driven generative UI applications with frontend (Next.js + CopilotKit) and backend (Python FastAPI + AG2) components.

## Quick Navigation

| Goal | Command | Location |
|------|---------|----------|
| Start all services | `yarn dev` | Root |
| Build all packages | `yarn build` | Root |
| Run linting | `yarn eslint` | Root |
| Fix linting issues | `yarn eslint:fix` | Root |
| Run tests | `yarn test` | Root |
| Frontend dev | `yarn workspace @generative-ui/web-dashboard dev` | Root (port **3001** in ModMe) |
| Backend dev | `cd apps/agent-server && poetry run uvicorn src.main:app --reload` | `apps/agent-server/` |

## Workspace docs (Monorepo_ModMe root)

External and automated agents should also read:

- [`../docs/agent-tech-guide.md`](../docs/agent-tech-guide.md) — lean-ctx, skills, MCP, changelog workflow
- [`../docs/inbox-pipeline/README.md`](../docs/inbox-pipeline/README.md) — **Inbox → Knowledge pipeline** (architecture, feature taxonomy, all scripts + DB + workflows)
- [`../CHANGELOG.md`](../CHANGELOG.md) — append under `[Unreleased]` per Agent Update Protocol
- [`docs/inbox/README.md`](docs/inbox/README.md) — Inbox funnel guide + agent capture protocol

## Monorepo Structure

```
GenerativeUI_monorepo/
├── apps/
│   ├── web-dashboard/          # Next.js 14 + CopilotKit frontend (main frontend)
│   ├── agent-server/           # Python FastAPI + AG2 backend (main backend)
│   ├── vibe-web-app/           # Vanilla JS design showcase
│   └── agent-generator/        # Agent generation tooling
├── packages/
│   ├── shared-schemas/         # Zod/Pydantic type-safe schemas
│   ├── example-react-module/   # React module example
│   ├── example-react-application/
│   ├── example-next-application/
│   └── monorepo-config/        # Shared config
└── docs/                       # See README links below
```

## Architecture Patterns

### Frontend-Backend Communication
The **web-dashboard** and **agent-server** communicate via WebSocket:

```
web-dashboard (Next.js/CopilotKit)
       ↓ WebSocket (ws://localhost:8000/ws/agent)
agent-server (Python FastAPI)
       ↓ Streams AgentState changes
web-dashboard re-renders GenerativeCanvas
```

**Key Components:**
- **CopilotKit**: Provides chat UI and integrates with agent
- **GenerativeCanvas**: Renders dynamic UI based on agent state
- **useAgentState** hook: Manages WebSocket connection and state
- **AG2 (AutoGen) GroupChat**: Orchestrates multi-agent conversations

### Type Safety
All frontend-backend communication uses **shared-schemas**:
- `packages/shared-schemas/src/index.ts` contains Zod definitions
- Backend mirrors these with Pydantic models
- Both frontend and backend import types for type checking

## Working on the Main Application (web-dashboard + agent-server)

### Frontend (Next.js + CopilotKit)

**Location:** `apps/web-dashboard/`

**Key files:**
- `src/app/layout.tsx` - CopilotKit provider setup
- `src/app/page.tsx` - Dashboard page
- `src/components/GenerativeCanvas.tsx` - Dynamic UI renderer
- `src/hooks/useAgentState.ts` - WebSocket state management
- `src/app/api/copilotkit/route.ts` - CopilotKit API integration

**Commands:**
```bash
# Development
yarn workspace @monorepo-template/web-dashboard dev

# Build
yarn workspace @monorepo-template/web-dashboard build

# Lint
yarn workspace @monorepo-template/web-dashboard run eslint

# Type check
yarn workspace @monorepo-template/web-dashboard run tsc --noEmit
```

### Backend (Python FastAPI + AG2)

**Location:** `apps/agent-server/`

**Key files:**
- `src/main.py` - FastAPI application setup
- `src/routes/websocket.py` - WebSocket endpoint
- `src/agents/groupchat.py` - AG2 GroupChat logic
- `src/models/schemas.py` - Pydantic models
- `pyproject.toml` - Poetry dependencies

**Setup:**
```bash
cd apps/agent-server

# Using Poetry (recommended)
poetry install
poetry run uvicorn src.main:app --reload

# Using pip + venv
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn src.main:app --reload
```

**Environment:**
Create `.env` with:
```
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4
```

## Development Conventions

### LeanCTX (recommended)
- This repo benefits from `lean-ctx` for AI-assisted coding workflows; it compresses repeated file reads and common shell output.
- Install on Windows with:
  ```bash
  npm install -g lean-ctx-bin
  ```
- Verify the binary:
  ```bash
  lean-ctx --version
  lean-ctx doctor
  ```
- Configure repo-local integration from the project root:
  ```bash
  lean-ctx setup --project
  ```
- Enable editor integration:
  ```bash
  lean-ctx init --agent vscode
  lean-ctx init --agent cursor
  ```
- Validate in this repo:
  ```bash
  lean-ctx read README.md -m map
  lean-ctx -c "git status"
  lean-ctx gain
  ```

### Monorepo Commands
- **Always use Turborepo scripts** from root: `yarn build`, `yarn dev`, `yarn lint`
- These respect dependency order and run in parallel where possible
- Turbo configuration: see `turbo.json`

### TypeScript
- All TypeScript files use `src/` directory structure
- Root `tsconfig.json` for base config
- Individual `tsconfig.json` in each workspace
- Linting: `.eslintrc.cjs` at root

### Code Quality
- **Linting:** ESLint (check root `.eslintrc.cjs`)
- **Formatting:** Prettier (check `.prettierrc.json`)
- **Type Checking:** TypeScript strict mode
- **Testing:** Jest for TypeScript/JavaScript packages

### Adding New Workspace Packages
1. Create folder under `apps/` (for applications) or `packages/` (for libraries)
2. Add `package.json` with name, scripts (build, dev, lint, test)
3. Root `package.json` automatically includes all workspaces via `"workspaces": ["apps/*", "packages/*"]`
4. Run `yarn install` to register

## Related Documentation

- [Getting Started](docs/GETTING_STARTED.md) - Full setup walkthrough
- [Contributing](docs/CONTRIBUTING.md) - Contribution guidelines
- [Debugging](docs/DEBUGGING.md) - Troubleshooting tips
- [Project Guidelines](docs/PROJECT_GUIDELINES.md) - Best practices
- [React Application Guide](docs/REACT_APPLICATION.md) - React setup details
- [React Module Guide](docs/REACT_MODULE.md) - Creating React modules
- [Setup Complete](SETUP_COMPLETE.md) - Architecture overview
- [README (Generative UI)](README_GENERATIVE_UI.md) - Project details

## Common Workflows

### Making Changes to Shared Schemas
```bash
# Edit packages/shared-schemas/src/index.ts
# Rebuild to generate dist/
yarn build

# Frontend automatically picks up types from dist/
# Backend mirrors Pydantic models
```

### Debugging Frontend-Backend Communication
1. Check WebSocket connection in browser DevTools > Network > WS
2. Verify backend is running on `localhost:8000`
3. Check CORS settings in `apps/agent-server/src/main.py`
4. See [Debugging](docs/DEBUGGING.md) for more

### Running Only One Service
```bash
# Frontend only (ModMe port 3001; default next dev uses 3000)
cd apps/web-dashboard
PORT=3001 yarn dev

# Backend only (runs on port 8000)
cd apps/agent-server
poetry run uvicorn src.main:app --reload
```

## Key Constraints & Patterns

✅ **DO:**
- Use `yarn` for package management (Yarn Berry 3.3+)
- Run TypeScript builds before linting
- Check dependencies with `turbo.json` task dependencies
- Keep schema changes synchronized between frontend and backend

❌ **DO NOT:**
- Use `npm` directly (use `yarn`)
- Run tests or builds from individual workspace folders without context
- Modify turbo.json cache configuration without understanding impact
- Commit without running `yarn eslint` first

## Performance Tips

- **Turbo caching:** Builds are cached; use `--force` to rebuild everything
- **Incremental builds:** Only affected packages rebuild when dependencies change
- **Parallel tasks:** Turbo runs independent tasks in parallel automatically
- **Watch mode:** `yarn dev` uses persistent task mode for fast iteration

## Environment Setup

**Prerequisites:**
- Node.js 18+ (check with `node --version`)
- Python 3.10+ (check with `python3 --version`)
- Poetry (install with `pip install poetry`)
- Yarn 3.3+ (already configured as packageManager in package.json)

**First-time setup:**
```bash
yarn install           # Install Node dependencies
yarn build             # Build all packages
cd apps/agent-server
poetry install         # Install Python dependencies
```

See [Getting Started](docs/GETTING_STARTED.md) for detailed setup.

---

**Last Updated:** 2026-06-20  
**For questions:** See [Debugging](docs/DEBUGGING.md) or [`../docs/agent-index.md`](../docs/agent-index.md)

---

## Inbox Capture Protocol

When making significant design decisions, architectural changes, code reviews, or research worth keeping, **drop a note in the inbox**:

**Location**: `GenerativeUI_monorepo/docs/inbox/`

**Filename**: `YYYY-MM-DDTHH-MM-SS_{type}_{agent-role}_{summary-slug}.{ext}`

**Minimum frontmatter** (`.md` files):
```yaml
---
timestamp: <ISO 8601>        # e.g. 2026-06-20T13:08:52Z
agent: copilot               # your agent name
agent_role: backend          # frontend|backend|devops|architect|reviewer|researcher
type: architecture           # architecture|design|code-review|solution|research|snippet|link|component
severity: high               # low|medium|high|critical
tags: [fastapi, decision]
branch: <current branch>
---
```

For non-`.md` formats (links, PDFs, code snippets, React components), just drop the file — the ingestor handles extraction automatically.

The pipeline runs on every push to `docs/inbox/` and ingests entries into Supabase.
See `docs/inbox/README.md` for full documentation.
