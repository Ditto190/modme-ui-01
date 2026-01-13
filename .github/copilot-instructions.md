# Copilot Instructions — ModMe GenUI Workbench (concise)

**Updated**: January 11, 2026

Purpose: Give AI coding agents the minimal, repo-specific knowledge to be productive immediately.

1. Big picture (2 bullets)

- Dual-runtime: a Python ADK agent (FastAPI) at `http://localhost:8000` is the single writer of canonical state; the Next.js + CopilotKit UI (localhost:3000) reads that state via `useCoAgent`.
- One-way state contract: Python → React only. The agent writes `tool_context.state["elements"] = [{ id, type, props }]`; React must never mutate that state.

2. Must-open files (fast path)

- [agent/main.py](agent/main.py): tools, `ALLOWED_TYPES`, lifecycle hooks (`before_model_modifier`, `after_model_modifier`).
- [src/app/page.tsx](src/app/page.tsx): canvas renderer, `useCoAgent`, and component switch mapping.
- [src/lib/types.ts](src/lib/types.ts): `UIElement` / `AgentState` contract.
- [src/app/api/copilotkit/route.ts](src/app/api/copilotkit/route.ts): HTTP bridge the UI uses to reach the agent.
- [agent/toolsets.json](agent/toolsets.json) + [agent/toolset_aliases.json](agent/toolset_aliases.json): toolset registry and deprecation aliases.

3. Non-negotiable conventions (short)

- IDs: snake_case (e.g. `revenue_stat`). Component `type` strings: PascalCase (e.g. `StatCard`). Props: camelCase and JSON-serializable.
- `ALLOWED_TYPES` in `agent/main.py` must match the `switch` cases in `src/app/page.tsx` — mismatches break rendering.
- Only use agent tools to change the canvas: `upsert_ui_element`, `remove_ui_element`, `clear_canvas`, `setThemeColor`.

4. Typical tool example (copyable)
   POST to the Copilot runtime body forwarded to the agent (example used across code):

```json
{
  "tool": "upsert_ui_element",
  "params": {
    "id": "revenue_stat",
    "type": "StatCard",
    "props": { "title": "Revenue", "value": 1234 }
  }
}
```

5. Common developer workflows (explicit commands)

- Start both services: `npm run dev` (frontend + agent).
- Agent only / UI only: `npm run dev:agent` / `npm run dev:ui`.
- Schema generation: `cd agent-generator && npm run generate:schemas`.
- Toolset docs & validation: `npm run docs:all` and `npm run validate:toolsets`.
- Lint/format: `npm run lint`, `npm run lint:fix`, `npm run format`.

6. Quick debugging checklist

- Agent health: `curl http://localhost:8000/health` and `http://localhost:8000/ready`.
- If an element doesn't render: verify `el.type` matches a `case` in `src/app/page.tsx` and appears in `ALLOWED_TYPES`.
- If props are wrong: ensure they are JSON-serializable and validate via generated Zod schemas (see `agent-generator/SCHEMA_CRAWLER_README.md`).

7. Integration & automation notes

- VT Code MCP (code-tools) integration is exposed from `agent/main.py` via tools in `tools/code_tools.py` (edit/create/analyze components + `run_build_check`).
- Toolset lifecycle is managed by `agent/toolsets.json` and scripts under `scripts/toolset-management/` — use `npm run docs:all` to regenerate docs/diagrams.
- Runtime bridge: `src/app/api/copilotkit/route.ts` configures the `CopilotRuntime` to point at the agent (env `AGENT_URL`).

### Serena quick start (optional)

- Serena (https://github.com/oraios/serena) provides semantic code search & editing tools via an MCP server. It is optional but recommended for coding agents.
- Prereq: install `uv`/`uvx` per Serena docs. Start a local Serena MCP server with:

```bash
# start on port 8001 (default)
./scripts/start-serena.sh 8001
```

- After start, configure your MCP-enabled client (Claude Code, CopilotKit adapters, or local MCP clients) to connect to the Serena MCP endpoint. See Serena's README for client-specific instructions.

8. Where to dig deeper (examples)

- State & rendering contract: `agent/main.py` (state writes) and `src/app/page.tsx` (render switch).
- Schema tooling: `agent-generator/SCHEMA_CRAWLER_README.md` (JSON Schema → Zod + TS).
- Refactoring patterns & testing: `docs/REFACTORING_PATTERNS.md` (practical examples and test snippets).

9. Quick rules for agents (actionable)

- When updating components: add `src/components/registry/MyWidget.tsx`, add `case "MyWidget"` to `renderElement`, and add `"MyWidget"` to `ALLOWED_TYPES` in `agent/main.py`.
- Validate all tool inputs/outputs before writing state; return structured responses: `{"status":"success"|"error","message":...}`.
- Sanitize string props (escape HTML) and enforce allowed `type` whitelist to reduce XSS/abuse risk.

If you want this shortened further or to include sample prompts (tool invocation sequences), tell me which area to expand and I will iterate.

# Copilot Instructions — ModMe GenUI Workbench

> **Updated**: January 6, 2026  
> **Purpose**: Targeted, repo-specific guidance for AI coding agents to become productive quickly in this GenUI R&D laboratory.

## Big Picture Architecture

**Dual-Runtime System**: Python ADK agent (FastAPI) at `http://localhost:8000` writes a single read-only state object; Next.js + CopilotKit frontend at `http://localhost:3000` reads it via `useCoAgent`.

**Critical Principle**: State flows ONE WAY (Python → React). React never writes back to agent state.

**Canonical State**: `tool_context.state["elements"] = [{ id, type, props }]` — Python is the single writer; frontend is read-only.

## Essential Files & Entry Points

| File                              | Purpose                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `agent/main.py`                   | Agent tools, lifecycle hooks (`before_model_modifier`, `after_model_modifier`), `ALLOWED_TYPES`, tool registrations |
| `src/app/page.tsx`                | Renderer and `useCoAgent` usage; `useFrontendTool` example (`setThemeColor`)                                        |
| `src/lib/types.ts`                | `UIElement` / `AgentState` contract used across runtimes                                                            |
| `src/app/api/copilotkit/route.ts` | CopilotKit ↔ HTTP agent bridge                                                                                      |
| `agent/toolsets.json`             | Toolset registry (canonical source)                                                                                 |
| `agent/toolset_aliases.json`      | Deprecation mappings for backward compatibility                                                                     |
| `agent/skills_ref/`               | Agent Skills library (validation, parsing, prompt generation)                                                       |
| `agent/tools/code_tools.py`       | VT Code MCP integration (edit/analyze/create components)                                                            |

## Critical Tools & Constraints

**Agent Tools** (do not change names):

- `upsert_ui_element` - Add/update canvas elements
- `remove_ui_element` - Remove elements by ID
- `clear_canvas` - Clear all elements
- `setThemeColor` - Frontend-only tool for theme

**VT Code Integration Tools**:

- `edit_component` - Edit component files with semantic understanding
- `analyze_component_props` - Inspect TypeScript interfaces
- `create_new_component` - Generate new components
- `run_build_check` - Verify TypeScript compilation

**Component Whitelist** (`ALLOWED_TYPES`): `StatCard`, `DataTable`, `ChartCard` — Match these exact type strings.

## Quick Start Examples

**Upsert Element** (JSON body to agent):

```json
{
  "tool": "upsert_ui_element",
  "params": {
    "id": "revenue_stat",
    "type": "StatCard",
    "props": { "title": "Revenue", "value": 1234 }
  }
}
```

**State Contract** (TypeScript/React):

```typescript
// src/lib/types.ts
export type UIElement = {
  id: string;
  type: string;
  props: Record<string, unknown>;
};
export type AgentState = { elements: UIElement[] };
```

## Developer Workflows

**Start Services**:

```bash
npm run dev              # Both runtimes (concurrently)
npm run dev:ui           # Frontend only (port 3000)
npm run dev:agent        # Python agent only (port 8000)
npm run dev:vtcode       # VT Code MCP server (port 8080)
npm run dev:debug        # With LOG_LEVEL=debug
```

**Documentation & Validation**:

```bash
npm run docs:all         # Generate all docs + diagrams
npm run docs:sync        # Sync JSON ↔ Markdown
npm run validate:toolsets # JSON schema validation
npm run detect:changes   # Find new/modified toolsets
```

**Code Quality**:

```bash
npm run lint             # ESLint (TS) + Ruff (Python)
npm run lint:fix         # Auto-fix issues
npm run format           # Prettier + Ruff format
npm run check            # Lint + format combined
```

## Environment Setup

**Required**:

- Node.js 22.9.0+ (use `nvm` or `nvm-windows`)
- Python 3.12+ (with `uv` or `pip`)
- `GOOGLE_API_KEY` in `.env` (copy from `.env.example`)

**Optional** (for VT Code integration):

- VT Code MCP server running at `http://localhost:8080`
- See `.copilot/mcp-servers/` for startup scripts

**Quick Setup**:

```bash
# Automated
./scripts/setup.sh       # Unix/macOS
.\scripts\setup.ps1      # Windows

# Manual
npm install
./scripts/setup-agent.sh
cp .env.example .env
# Edit .env and add GOOGLE_API_KEY
```

## Project Conventions (Must Follow)

**State Synchronization**:

- ✅ Python agent writes to `tool_context.state`
- ✅ React reads via `useCoAgent` (read-only)
- ❌ Never call `setState` in React to mutate agent state

**Props**:

- ✅ JSON-serializable only (strings, numbers, booleans, arrays, objects)
- ❌ No functions, no circular references

**Naming**:

- Element IDs: `snake_case` (e.g., `revenue_stat`)
- Component types: `PascalCase` (e.g., `StatCard`)
- Props: `camelCase` (e.g., `trendDirection`)

## Testing & Validation

**Agent Tools**: Mock `ToolContext` (see `agent/tests/` and `docs/REFACTORING_PATTERNS.md` Pattern 10)

**Component Props**: Use schema-crawler to generate Zod validators:

```bash
cd agent-generator
npm run generate:schemas
```

**Integration Tests**: Start both services and test via CopilotSidebar prompts

## Debugging

**Health Checks**:

```bash
curl http://localhost:8000/health  # Liveness
curl http://localhost:8000/ready   # Readiness + toolset info
```

**Common Issues**:

1. Element not rendering → Check type string matches switch case in `src/app/page.tsx`
2. Props not showing → Check JSON serialization (no functions/circular refs)
3. State not updating → Ensure tool returns `{"status": "success"}`
4. Node version errors → Run `node --version` (must be v22.9.0+)
5. Python import errors → Activate venv: `source agent/.venv/bin/activate`

## Advanced Features

**Toolset Management**: GitHub MCP-style lifecycle automation

- Registry: `agent/toolsets.json`
- Aliases: `agent/toolset_aliases.json`
- Scripts: `scripts/toolset-management/`
- Docs: `docs/TOOLSET_MANAGEMENT.md`

**Agent Skills**: Open format for extending agent capabilities

- Library: `agent/skills_ref/`
- Spec: https://agentskills.io/specification
- CLI: `python -m agent.skills_ref.cli validate <skill-dir>`

**ChromaDB Integration**: Dual architecture for semantic search

- Session storage: HTTP server at port 8001
- Persistent memory: Exported artifacts
- Docs: `docs/CHROMADB_INDEXING.md`

## Deep Dive Resources

| Topic                   | Resource                                              |
| ----------------------- | ----------------------------------------------------- |
| Architecture & Patterns | `docs/REFACTORING_PATTERNS.md`, `Project_Overview.md` |
| Toolset Lifecycle       | `docs/TOOLSET_MANAGEMENT.md`, `TOOLSET_README.md`     |
| Schema Generation       | `agent-generator/SCHEMA_CRAWLER_README.md`            |
| Agent Skills            | `agent/skills_ref/README.md`                          |
| ChromaDB & Embeddings   | `docs/CHROMADB_INDEXING.md`                           |
| Component Registry      | `src/components/registry/`, `CODEBASE_INDEX.md`       |

---

**Need more detail?** Tell me which section to expand: examples, tests, prompt templates, security patterns, or deployment workflows.

---

# Complete Implementation Guide

## Architecture Details

### Starting the System

```bash
npm run dev          # Starts both runtimes concurrently
npm run dev:agent    # Agent only (port 8000)
npm run dev:ui       # UI only (port 3000)
```

**Prerequisites**: Node.js 22.9.0+, Python 3.12+, `GOOGLE_API_KEY` in `.env`

## Key Files

| Purpose             | File                              | Notes                                        |
| ------------------- | --------------------------------- | -------------------------------------------- |
| Agent tools & state | `agent/main.py`                   | `ALLOWED_TYPES`, lifecycle hooks, tool funcs |
| Component registry  | `src/components/registry/*.tsx`   | StatCard, DataTable, ChartCard               |
| Component renderer  | `src/app/page.tsx`                | `renderElement()` switch, `useCoAgent` hook  |
| State types         | `src/lib/types.ts`                | TypeScript interfaces for state contract     |
| API bridge          | `src/app/api/copilotkit/route.ts` | HttpAgent connects to Python backend         |
| Toolset registry    | `agent/toolsets.json`             | Tool groupings with metadata                 |

## Adding Components (3-Step Sync)

**All three must stay synchronized or components won't render:**

1. **Create component** in `src/components/registry/MyWidget.tsx`:

   ```tsx
   const MyWidgetSchema = z.object({ title: z.string(), value: z.number() });
   export const MyWidget: React.FC<Props> = (rawProps) => {
     const result = MyWidgetSchema.safeParse(rawProps);
     if (!result.success) return <ErrorFallback error={result.error} />;
     return (
       <div>
         {result.data.title}: {result.data.value}
       </div>
     );
   };
   ```

2. **Register in renderer** (`src/app/page.tsx` → `renderElement` switch):

   ```tsx
   case "MyWidget": return <MyWidget key={el.id} {...el.props} />;
   ```

3. **Add to Python whitelist** (`agent/main.py`):
   ```python
   ALLOWED_TYPES = {"StatCard", "DataTable", "ChartCard", "MyWidget"}
   ```

## Agent Tool Pattern

Tools must: (1) validate inputs, (2) return status dict, (3) mutate `tool_context.state`:

```python
def my_tool(tool_context: ToolContext, id: str, type: str, props: Dict) -> Dict[str, str]:
    if type not in ALLOWED_TYPES:
        return {"status": "error", "message": f"Unknown type: {type}"}
    elements = tool_context.state.get("elements", [])
    elements.append({"id": id, "type": type, "props": props})
    tool_context.state["elements"] = elements
    return {"status": "success", "message": f"Added {id}"}
```

## Debugging

```bash
curl localhost:8000/health   # Agent health check
curl localhost:8000/ready    # Toolsets loaded confirmation
```

| Symptom                 | Cause                                  | Fix                                              |
| ----------------------- | -------------------------------------- | ------------------------------------------------ |
| Element not rendering   | Type mismatch between Python and React | Ensure `ALLOWED_TYPES` matches `renderElement()` |
| State not updating      | Tool didn't return success status      | Return `{"status": "success", ...}`              |
| Python import error     | venv not activated                     | Run `agent\.venv\Scripts\activate` (Windows)     |
| Props validation failed | Zod schema mismatch                    | Check component's schema matches agent props     |

## Project Conventions

- **Zod validation**: All components validate props with `safeParse()` and render error fallbacks
- **Lifecycle hooks**: `before_model_modifier()` injects canvas state into prompts, `after_model_modifier()` controls tool chains
- **Toolset management**: Group tools in `agent/toolsets.json`, validate with `npm run validate:toolsets`
- **Linting**: `npm run lint` runs ESLint (TS) + Ruff (Python) + markdownlint

## NPM Scripts

| Script                      | Purpose                      |
| --------------------------- | ---------------------------- |
| `npm run lint`              | ESLint + Ruff + markdownlint |
| `npm run validate:toolsets` | Validate toolset JSON schema |
| `npm run docs:all`          | Regenerate docs + diagrams   |
| `npm run detect:changes`    | Find new/modified toolsets   |

## Extended Documentation

- [../docs/REFACTORING_PATTERNS.md](../docs/REFACTORING_PATTERNS.md) — Dual-runtime refactoring guides
- [../PORTING_GUIDE.md](../PORTING_GUIDE.md) — Component portability patterns
- [../CODEBASE_INDEX.md](../CODEBASE_INDEX.md) — Full file catalog
- [../agent/skills_ref/GITLENS_INTEGRATION.md](../agent/skills_ref/GITLENS_INTEGRATION.md) — GitLens AI custom instructions generator
