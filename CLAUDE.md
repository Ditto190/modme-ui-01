# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

**ModMe GenUI Workspace** is a Generative UI (GenUI) R&D laboratory combining Next.js 16 frontend with Python ADK backend for creating dynamic, AI-generated interfaces. This is a local-first, privacy-focused consulting platform supporting multi-agent workflows, code sandboxing, and component-based UI generation.

**New in v0.3.0** (2026-01-19): Integrated patterns from Containarium, OpenWork, Goose, and MCP-Use for enhanced MCP support, multi-model LLM, permissions, SSE streaming, and workflow recipes.

Key technologies:

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, CopilotKit
- **Backend**: Python ADK (Google), FastAPI, Multi-Model LLM (Gemini/OpenAI/Anthropic/Ollama)
- **Protocols**: MCP (Model Context Protocol), SSE (Server-Sent Events)
- **Data**: Local SQLite + ChromaDB, Git-ignored `data/` directory
- **Execution**: MicroSandbox (not Docker) for safe code isolation
- **Permissions**: Granular permission system for agent safety

## Development Commands

### Setup & Installation

```bash
# Automated setup (recommended)
./scripts/setup.sh              # Linux/macOS
.\scripts\setup.ps1             # Windows PowerShell

# Install Python dependencies separately
npm run install:agent           # Also: pnpm/yarn/bun run install:agent
```

### Running Development Servers

```bash
npm run dev                     # Start both UI (3000) + agent (8000) concurrently
npm run dev:ui                  # Start only Next.js UI server
npm run dev:agent               # Start only Python ADK agent
npm run dev:debug               # Start dev with debug logging (LOG_LEVEL=debug)
```

**New Endpoints** (v0.3.0):
- `/api/events` - SSE streaming for real-time agent updates
- `/api/mcp/info` - MCP server information
- `/api/permissions/pending` - Permission management
- `/api/recipes` - Workflow recipe marketplace
- `/api/llm/providers` - Multi-model LLM configuration

### Building & Production

```bash
npm run build                   # Build Next.js for production
npm start                       # Start production server
```

### Code Quality

```bash
npm run lint                    # Run ESLint + Ruff (Python)
npm run lint:fix                # Fix linting issues automatically
npm run format                  # Format code (Prettier + Ruff)
npm run check                   # Run lint + format together
```

### Documentation & Knowledge Management

```bash
npm run docs:sync               # Sync documentation between formats
npm run docs:md-to-json         # Convert markdown docs to JSON
npm run docs:json-to-md         # Convert JSON docs to markdown
npm run docs:diagram            # Generate architecture diagrams (PNG)
npm run docs:diagram:svg        # Generate architecture diagrams (SVG)
npm run docs:all                # Run all doc sync and diagram generation
```

### Toolset Management

```bash
npm run validate:toolsets       # Validate toolset integrity
npm run validate:naming         # Check naming conventions
npm run test:aliases            # Test alias resolution
npm run detect:changes          # Detect toolset changes
npm run search:toolset          # Search for toolsets in knowledge base
```

## Architecture Overview

### System Architecture

```
User's Browser (localhost:3000)
├── Next.js Frontend
│   ├── Canvas (GenUI rendering)
│   ├── Components Registry (static, declarative, open-ended UI)
│   └── CopilotKit SDK (state sync)
│
├── HTTP/WebSocket connection to:
│
Python ADK Agent (localhost:8000)
├── FastAPI server
├── Google Gemini AI
├── Agent tools & state management
│
└── Local Data Store
    ├── data/ (client data, never committed)
    └── artifacts.db (audit logs)
```

### Directory Structure

```
src/
├── app/
│   ├── api/copilotkit/route.ts      # CopilotKit backend (agent orchestration)
│   ├── canvas/GenerativeCanvas.tsx  # Main GenUI interface (Chat+ style)
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Home page
├── components/
│   ├── registry/                    # Reusable GenUI components
│   │   ├── StatCard.tsx             # Metric cards (Static GenUI molecule)
│   │   ├── ChartCard.tsx            # Chart wrappers (Recharts/Chart.js)
│   │   ├── DataTable.tsx            # Data grids (Declarative GenUI)
│   │   └── [other components]
│   └── [other UI components]
├── lib/
│   ├── types.ts                     # Shared TypeScript types
│   └── [utilities]
└── prompts/
    └── copilot/                     # Cognitive layer specifications

agent/
├── main.py                          # Agent definition + tools
├── toolset_manager.py               # Toolset lifecycle management
├── skills_ref/                      # Reusable skill definitions
├── tools/                           # Tool implementations
├── pyproject.toml                   # Python dependencies
├── toolsets.json                    # Toolset configuration
└── uv.lock                          # Pinned Python dependencies
```

## Core Concepts & Patterns

### GenUI Three Layers

1. **Static GenUI**: Agent selects pre-built components from registry with predefined props
   - Components: StatCard, ChartCard, DataTable
   - Props determined by agent, validated by TypeScript
   - Fast, safe, predictable rendering

2. **Declarative GenUI**: Agent generates JSON schemas rendered by DashboardRenderer
   - Schema matches dashboard interface definitions
   - Agent provides layout + component configuration
   - Flexible but schema-constrained

3. **Open-Ended GenUI**: Agent creates HTML/JS in sandboxed iframes
   - Most powerful but least safe
   - Use only for internal/trusted workflows
   - Always wrapped in isolation

### State Synchronization

**Frontend** → `useCoAgent` hook syncs state with backend
**Backend** → `callback_context.state` (Python dict) shared with frontend
**Bridge** → CopilotKit WebSocket connection

State must always be serializable JSON. Define interfaces in `src/lib/types.ts` and match in Python side.

### Agent Tools Pattern

Tools in `agent/main.py` follow this structure:

```python
def verb_noun(tool_context: ToolContext, param: str) -> Dict[str, str]:
    """Clear description for LLM understanding."""
    # Update state for frontend sync
    tool_context.state["key"] = param
    return {"status": "success"}
```

Tool naming: `verb_noun` (e.g., `update_kpi`, `set_layout`, `fetch_data`)

### Toolset Management System

**Toolsets** organize reusable agent capabilities:

- Defined in `agent/toolsets.json`
- References in `agent/tools/` directory
- Lifecycle tracked in `agent/toolset_manager.py`
- Schema validation via `agent/toolset-schema.json`

Toolsets support:

- Versioning & deprecation workflows
- Alias resolution for backward compatibility
- Automatic naming validation
- Integration with knowledge management

## Data Handling & Privacy

**Critical**: Client data NEVER leaves the machine unless explicitly configured.

### Data Directory

- **Location**: `data/` (Git-ignored)
- **Never commit**: Client datasets, `.env` files, `artifacts.db`
- **Subdirectories**:
  - `data/raw/` - Original files from clients
  - `data/processed/` - Cleaned/extracted data
  - `data/reports/` - Generated analysis outputs

### Audit Logging

- **Location**: `artifacts.db` (SQLite, Git-ignored)
- **Tracks**: Document ingestion, pipeline runs, metrics
- **Access**: Via `src/utils/audit.py` functions

### Configuration

- **Location**: `.env` (Git-ignored)
- **Template**: `.env.example` (committed)
- **Required**: `GOOGLE_API_KEY` for Gemini
- **Load via**: `python-dotenv` in agent code

## Code Organization & Conventions

### TypeScript/React

- **Style**: Functional components with React 19 hooks
- **Styling**: Tailwind CSS 4 utility classes
- **Icons**: Lucide React
- **State**: React hooks + CopilotKit `useCoAgent` for agent sync
- **Types**: Centralized in `src/lib/types.ts`

### Python Agent

- **Framework**: Google ADK (Anthropic SDK)
- **Server**: FastAPI on port 8000
- **Tools**: Decorated functions with clear docstrings
- **Config**: Via `pyproject.toml` (dependencies) + `.env` (runtime)
- **Memory**: SQLite conversation history (optional via `src/utils/memory.py`)

### Naming Conventions

- **Files**: kebab-case (e.g., `StatCard.tsx`, `update_kpi.py`)
- **Components**: PascalCase (React components)
- **Functions**: camelCase (JavaScript/TypeScript), snake_case (Python)
- **Classes**: PascalCase
- **Toolset names**: Use underscores not spaces (e.g., `Data_Analyst` not `Data Analyst`)

## Key Files & Responsibilities

| File | Purpose |
|------|---------|
| `src/app/api/copilotkit/route.ts` | Backend for CopilotKit; handles agent calls & tool routing |
| `src/app/canvas/GenerativeCanvas.tsx` | Main GenUI interface; Chat+ style persistent canvas |
| `src/components/registry/` | All reusable GenUI components; source of truth for available UI molecules |
| `src/lib/types.ts` | Shared TypeScript interfaces for state, props, tools |
| `agent/main.py` | Agent definition, tool registration, state management |
| `agent/toolset_manager.py` | Toolset lifecycle: validation, deprecation, alias resolution |
| `agent/toolsets.json` | Toolset definitions & configuration |
| `.copilot/knowledge/architecture.md` | System architecture reference |
| `.copilot/instructions/genui-development.md` | GenUI development patterns & guidelines |
| `CONTRIBUTING.md` | Development workflow, testing, PR process |

## Testing

### Frontend Tests

- Location: `tests/` directory
- Framework: Jest/React Testing Library
- Run: No dedicated test command exposed (inspect `package.json` for setup)

### Integration Testing

- Test UI components in isolation
- Verify agent tools work independently
- Integration tests for full frontend↔backend flow
- Always verify privacy constraints (no external data calls)

## Environment & Prerequisites

**Node.js**: 22.9.0+ (use nvm for management)
**Python**: 3.12+
**Package manager**: pnpm, npm, yarn, or bun (lock files Git-ignored to avoid conflicts)
**API Keys**:

- `GOOGLE_API_KEY` (Gemini/ADK)
- Others as needed per `.env.example`

## Critical Patterns & Guardrails

### 1. LocalFirst by Default

- No hardcoded external API calls without `.env` config
- Test with `USE_LOCAL_EMBEDDINGS=true` for offline capability
- Client data stays in `data/` directory (never synced)

### 2. State Synchronization

- Always define TypeScript types in `src/lib/types.ts` FIRST
- Python side must match interface exactly (keys, types)
- Use `callback_context.state` to update, never globals

### 3. Agent Tool Design

- Keep tools focused (single responsibility)
- Allow granular state updates (not monolithic objects)
- Clear docstrings for LLM understanding
- Return status/success indicators

### 4. Component Registry

- All new GenUI components go in `src/components/registry/`
- Export from index for agent access
- Update agent instructions in `src/prompts/copilot/` when adding components
- Keep component props simple & serializable

### 5. Audit Compliance

- Log significant operations to `artifacts.db`
- Use `src/utils/audit.py` functions
- Enable in consulting/regulated workflows
- Never disable for client work

### 6. Sandboxing

- Use **MicroSandbox** (not Docker) for code execution
- Configured in workspace root `Sandboxfile`
- Persistence in `./menv/` directory
- For WSL: Use `wsl bash -c "..."` commands

## Common Gotchas

1. **Node version mismatch**: Requires Node 22.9.0+. Use `nvm use 22.9.0` to switch.

2. **Python imports failing**: Run `pip cache purge; pip install --upgrade --force-reinstall importlib-metadata google-api-core google-auth` instead of rebuilding venv.

3. **Agent not responding**: Verify:
   - `npm run dev:agent` is running on port 8000
   - `GOOGLE_API_KEY` is set in `.env`
   - Frontend → backend connection established in browser console

4. **State not syncing**: Ensure:
   - Type interfaces match exactly between `src/lib/types.ts` and Python code
   - State updates use `tool_context.state` not assignment to globals
   - WebSocket connection is active

5. **Data accidentally committed**: Check `.gitignore` includes `data/`, `.env`, `artifacts.db`, `notebooks/memory/`

6. **Lock file conflicts**: Each developer generates their own lock file with preferred package manager; never commit lock files.

7. **Toolset alias resolution failing**: Use exact names in lookups; names with spaces should use underscores (e.g., `"Data Analyst"` → `"Data_Analyst"`)

## References & Documentation

**Architecture & Design**:

- `.copilot/knowledge/architecture.md` - System architecture details
- `.copilot/instructions/genui-development.md` - GenUI patterns & practices
- `Project_Overview.md` - Vision & high-level concepts
- `docs/REPOSITORY_INTEGRATIONS.md` - **NEW**: Integration features from analyzed repos (v0.3.0)

**Process & Workflow**:

- `CONTRIBUTING.md` - Development workflow, testing, PR process
- `.devcontainer/` - DevContainer configuration for portable setup

**Advanced Topics**:

- `CODEBASE_INDEX.md` - Complete component catalog
- `PORTING_GUIDE.md` - How to port components to other projects
- `docs/TOOLSET_MANAGEMENT.md` - Toolset system details
- `docs/ISSUE_MANAGEMENT_SYSTEM.md` - Issue handling automation

**External References**:

- [Google ADK Documentation](https://google.github.io/adk-docs/)
- [CopilotKit Documentation](https://docs.copilotkit.ai)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS 4 Docs](https://tailwindcss.com/docs)

## When in Doubt

1. **New component?** → Start in `src/components/registry/` with Tailwind + Lucide icons
2. **New agent tool?** → Add to `agent/main.py` with `verb_noun` naming
3. **State management?** → Define types in `src/lib/types.ts`, sync via CopilotKit
4. **Data handling?** → Check `.env.example` for config, use `data/` directory for client data
5. **Debugging?** → Run `npm run dev:debug` for LOG_LEVEL=debug output
6. **Multi-agent workflows?** → Load agents from `agent/toolsets.json`, use GroupChat orchestration

---

For help with Claude Code features, see `/help` or report issues at <https://github.com/anthropics/claude-code/issues>
