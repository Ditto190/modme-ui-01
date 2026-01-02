# Copilot Instructions — ModMe GenUI Workbench

## Project Purpose

A **Generative UI workbench** where a Python ADK agent dynamically creates React dashboards through natural language. The agent maintains a canvas of UI elements (StatCards, DataTables, ChartCards) that it can add, update, or remove via tools—no hardcoded screens.

**Key Insight**: The agent doesn't render UI directly; it manipulates a shared state (`elements: UIElement[]`) that the React frontend observes and renders via a component registry.

## Architecture Overview

### Dual-Runtime Communication Flow

```
User Chat → CopilotKit Runtime → HttpAgent → Python ADK (localhost:8000)
                                            ↓
                                    Agent updates state.elements[]
                                            ↓
          React useCoAgent hook ← State synced back ← Python tool_context.state
                                            ↓
                          Components rendered from registry
```

**Critical Files**:

- `src/app/api/copilotkit/route.ts` — CopilotKit → ADK bridge via HttpAgent
- `agent/main.py` — Agent with tools: `upsert_ui_element`, `remove_ui_element`, `clear_canvas`
- `src/app/page.tsx` — Frontend uses `useCoAgent<AgentState>` to sync state
- `src/lib/types.ts` — Shared TypeScript types: `UIElement`, `AgentState`

Key files and patterns

- State contract: `AgentState = { elements: UIElement[] }` — see [src/lib/types.ts].
- Component registry: add/modify components under [src/components/registry/].
- Agent tools: `upsert_ui_element`, `remove_ui_element`, `clear_canvas` live in [agent/main.py].
- Rendering: `page.tsx` maps `elements[].type` → registry component (StatCard, DataTable, ChartCard).

Developer workflows (how to run & test)

- Start both runtimes (recommended): `npm run dev` — starts UI:3000 + Agent:8000.
- Or start individually: `npm run dev:ui` and `npm run dev:agent` (see `package.json` scripts).
- Node requirement: Node 22.9.0+; Python: 3.12+ for the agent.
- Environment: copy `.env.example` → `.env` and set `GOOGLE_API_KEY` if using Google/Gemini models.

Agent + component change flow (how to make edits that agents will use)

- To add a new UI component:
  1. Create component file in `src/components/registry/` (export props type).
  2. Update `src/lib/types.ts` if you add props to `UIElement` types.
  3. Add a rendering case in `src/app/page.tsx` to return the component.
  4. Teach the Python agent by updating the agent system instructions in `agent/main.py`.
- To change agent tools: edit the tool function in `agent/main.py`. Tools modify `tool_context.state` (Python → React one-way).

Examples

- Agent writes a StatCard (pseudo-tool call):

  upsert_ui_element(id="kpi-1", type="StatCard", props={"title":"Sales","value":12345})

  After this call React will render a `StatCard` with `id=kpi-1`.

Repo-specific conventions

- Use `elements` array as the canonical single source of truth; do not try to mutate frontend state from Python other than replacing `tool_context.state["elements"]`.
- Component type names are literal strings (e.g., "StatCard") and must match names in the registry.
- Keep tools' docstrings descriptive — they become the LLM-visible tool descriptions.

Where to look for more context

- Agent logic and system prompts: [agent/main.py]
- Frontend rendering & state hookup: [src/app/page.tsx] and [src/app/api/copilotkit/route.ts]
- Shared types: [src/lib/types.ts]
- Existing components: [src/components/registry/StatCard.tsx], [DataTable.tsx], [ChartCard.tsx]

What agents should NOT do

- Do not hardcode API keys or client secrets into source files—use `.env` and `src/utils/config`.
- Do not assume two-way reactive sync: Python writes → React reads. There is no built-in React→Python state write path.

If unclear or missing

- Ask a human: point to the file you want to modify and whether the change is frontend, backend (agent), or both.

Next step for you

- Tell me if you want me to run dev servers, update an example tool, or add a sample component+agent tool pair.

# Copilot Instructions - ModifyMe GenUI Workspace

## What This Project Does

A **Generative UI workbench** where a Python ADK agent dynamically creates React dashboards through natural language. The agent maintains a canvas of UI elements (StatCards, DataTables, ChartCards) that it can add, update, or remove via tools—no hardcoded screens.

**Key Insight**: The agent doesn't render UI directly; it manipulates a shared state (`elements: UIElement[]`) that the React frontend observes and renders via a component registry.

---

## Architecture Overview

### Dual-Runtime Communication Flow

```
User Chat → CopilotKit Runtime → HttpAgent → Python ADK (localhost:8000)
                                            ↓
                                    Agent updates state.elements[]
                                            ↓
          React useCoAgent hook ← State synced back ← Python callback_context.state
                                            ↓
                          Components rendered from registry
```

**Critical Files**:

- [src/app/api/copilotkit/route.ts](src/app/api/copilotkit/route.ts) — CopilotKit → ADK bridge via HttpAgent
- [agent/main.py](agent/main.py) — Agent with tools: `upsert_ui_element`, `remove_ui_element`, `clear_canvas`
- [src/app/page.tsx](src/app/page.tsx) — Frontend uses `useCoAgent<AgentState>` to sync state
- [src/lib/types.ts](src/lib/types.ts) — Shared TypeScript types: `UIElement`, `AgentState`

### The State Contract

Both Python and TypeScript agree on this shape:

```typescript
type AgentState = {
  elements: UIElement[]; // Array of {id, type, props}
};
```

**Python side** ([agent/main.py#L23-L39](agent/main.py#L23-L39)):

```python
def upsert_ui_element(tool_context: ToolContext, id: str, type: str, props: Dict[str, Any]):
    elements = tool_context.state.get("elements", [])
    elements.append({"id": id, "type": type, "props": props})
    tool_context.state["elements"] = elements
```

**React side** ([src/app/page.tsx#L72-L76](src/app/page.tsx#L72-L76)):

```tsx
const { state } = useCoAgent<AgentState>({ name: "WorkbenchAgent" });
state.elements.map((el) => renderElement(el));
```

---

## Development Workflow

### Starting Both Runtimes

```bash
npm run dev  # Concurrently starts UI:3000 + Agent:8000
# Or separately: npm run dev:ui, npm run dev:agent
```

**Environment Prerequisites**:

- Node.js 22.9.0+ (use `nvm use 22.9.0` — earlier versions break)
- Python 3.12+ with `uv` (dependency manager)
- Google API key in `.env`: `GOOGLE_API_KEY=your-key-here`

### Adding a New Component to the Registry

1. Create the component in [src/components/registry/](src/components/registry/):
   ```tsx
   export function MyWidget({ title, data }: MyWidgetProps) { ... }
   ```
2. Update [src/lib/types.ts](src/lib/types.ts) if needed
3. Add rendering logic in [src/app/page.tsx#L84-L96](src/app/page.tsx#L84-L96):
   ```tsx
   case "MyWidget": return <MyWidget key={el.id} {...el.props} />;
   ```
4. Update Python agent's system instructions in [agent/main.py#L69-L75](agent/main.py#L69-L75) to teach it about the new component type

### Modifying Agent Behavior

**Two places control what the agent knows**:

1. **System Instructions** ([agent/main.py#L69-L75](agent/main.py#L69-L75)):

   - Injected via `before_model_modifier` callback
   - Includes current canvas state and available component types
   - Example: "Available Types: StatCard, DataTable, ChartCard"

2. **Cognitive Layer Prompts** ([src/prompts/copilot/01_molecules.md](src/prompts/copilot/01_molecules.md)):
   - Markdown files describing component APIs and usage patterns
   - Currently not auto-loaded; reference when updating agent instructions

**Tool Definition Pattern** ([agent/main.py#L23-L39](agent/main.py#L23-L39)):

```python
def upsert_ui_element(tool_context: ToolContext, id: str, type: str, props: Dict[str, Any]):
    """Docstring becomes the tool description shown to LLM"""
    # Modify tool_context.state to affect React
```

### Testing Agent Changes

1. Modify tool in `agent/main.py`
2. Agent server auto-reloads (uvicorn watch mode via `scripts/run-agent.sh`)
3. Open UI at `localhost:3000`, use chat sidebar
4. Try suggestion: "Generate a sales KPI dashboard"
5. Check DevTools Console for state changes from `useCoAgent`

---

## Component Registry Conventions

**Current Components** ([src/components/registry/](src/components/registry/)):

- **StatCard**: Single metric display (title, value, trend, trendDirection)
- **DataTable**: Tabular data (columns, data arrays)
- **ChartCard**: Visualization wrapper (chartType, data, config)

**Adding Props**:

- Define in component file with TypeScript types
- Document in [src/prompts/copilot/01_molecules.md](src/prompts/copilot/01_molecules.md)
- Update agent's system instructions to teach it the new prop schema

**Rendering Pattern** ([src/app/page.tsx#L84-L96](src/app/page.tsx#L84-L96)):

```tsx
const renderElement = (el: UIElement) => {
  switch (el.type) {
    case "StatCard":
      return <StatCard key={el.id} {...el.props} />;
    default:
      return <div>Unknown: {el.type}</div>;
  }
};
```

---

## Critical Conventions

### State Synchronization

- **Python writes** to `tool_context.state` (mutable dict)
- **React reads** via `useCoAgent` hook (immutable snapshot)
- Changes flow one-way: Python → React (no React → Python state writes)

### Agent Lifecycle Hooks ([agent/main.py#L54-L100](agent/main.py#L54-L100))

```python
on_before_agent()           # Initialize state.elements = []
before_model_modifier()     # Inject canvas state into system instructions
after_model_modifier()      # Stop tool-calling loop if agent returns text
```

**Why `after_model_modifier`?** Prevents infinite tool-calling when agent is done building UI.

### Debugging

- **Frontend**: Check React DevTools → Components → `YourMainContent` → `state.elements`
- **Backend**: Add `print(tool_context.state)` in tools, watch terminal output
- **Network**: Open DevTools Network tab, filter by `copilotkit`, inspect WebSocket frames

### Package Manager Flexibility

Lock files (`.gitignore`'d) — use any of: `npm`, `pnpm`, `yarn`, `bun`. Scripts work with all.

---

## Common Tasks

### Change Theme Color

Agent can call frontend tool `setThemeColor` ([src/app/page.tsx#L17-L28](src/app/page.tsx#L17-L28)):

```tsx
useFrontendTool({
  name: "setThemeColor",
  handler({ themeColor }) {
    setThemeColor(themeColor);
  },
});
```

Try: "Change the theme to green" → Agent calls tool, CSS variable updates.

### Clear the Canvas

User: "Clear all" → Agent calls `clear_canvas()` → `state.elements = []` → UI empties.

### Generate Multi-Component Layout

User: "Sales dashboard with 3 KPIs and a customer table"
→ Agent calls `upsert_ui_element` 4 times (3 StatCards, 1 DataTable)
→ React renders all elements in grid layout ([src/app/page.tsx#L103-L108](src/app/page.tsx#L103-L108))

---

## What's NOT Implemented Yet

- **Declarative GenUI**: Dashboard schema/renderer (planned, not active)
- **Open-Ended GenUI**: Sandboxed HTML iframe (planned, not active)
- **Audit logging**: `src/utils/audit.py` doesn't exist yet
- **`data/` directory**: Mentioned in docs but not used in current implementation

Focus on the **Static GenUI** pattern (component registry + agent tools) — that's what's operational now.

---

## Relevant MCP Collections & GitHub Toolsets

This repository uses patterns from these awesome-copilot collections:

### Frontend Development Collection

- **frontend-web-dev**: React, TypeScript, Next.js development patterns
  - Instructions: `reactjs.instructions.md`, `nextjs.instructions.md`, `typescript-5-es2022.instructions.md`
  - Agent: `expert-react-frontend-engineer.agent.md`
  - Applies to React 19+ with hooks, TypeScript, functional components, and modern patterns

### Python MCP Development Collection

- **python-mcp-development**: Building Model Context Protocol servers in Python
  - Instructions: `python-mcp-server.instructions.md`
  - Agent: `python-mcp-expert.agent.md`
  - Prompt: `python-mcp-server-generator.prompt.md`
  - Uses FastMCP, `uv` for dependency management, decorators for tool registration

### Available GitHub MCP Toolsets

Use `#mcp_github_enable_toolset` to enable more capabilities:

**Currently Enabled:**

- `code_security` — GitHub Code Scanning

**Available (not yet enabled):**

- `pull_requests` — PR management and review workflows
- `issues` — Issue creation, labeling, assignment
- `repos` — Repository operations (branches, commits, files)
- `actions` — GitHub Actions workflows and CI/CD
- `discussions` — GitHub Discussions integration
- `projects` — GitHub Projects board management

**To enable:** Use GitHub MCP tools or run:

```
mcp_github_enable_toolset({toolset: "pull_requests"})
```

---

## References

- **Project Documentation:**

  - `Project_Overview.md` — High-level vision (aspirational)
  - `CONTRIBUTING.md` — DevContainer setup, testing guidelines
  - `src/prompts/copilot/` — Agent cognitive layer (not yet auto-loaded)

- **External Documentation:**
  - [CopilotKit Docs](https://docs.copilotkit.ai) — `useCoAgent`, `useFrontendTool` API
  - [Google ADK](https://google.github.io/adk-docs/) — Agent Development Kit reference
  - [React Documentation](https://react.dev) — React 19+ official patterns
  - [FastMCP Documentation](https://github.com/jlowin/fastmcp) — Python MCP server framework

## Next Steps for Agents

- **To run dev servers:** Use `npm run dev` or ask me to start UI/Agent individually
- **To add new components:** Follow the 4-step process in "Adding a New Component" above
- **For React/TypeScript questions:** Reference the `frontend-web-dev` collection patterns
- **For Python agent questions:** Reference the `python-mcp-development` collection
- **For repository operations:** Enable relevant GitHub MCP toolsets as needed (e.g., `pull_requests`, `issues`)
