# ModMe GenUI Workbench - AI Agent Instructions

## Purpose

This is a **Generative UI (GenUI) R&D laboratory** where a Python ADK agent generates React UI components through natural language. The system uses a dual-runtime architecture with one-way state synchronization.

## Architecture Overview

### Dual-Runtime Communication Flow

```
Python Agent (localhost:8000)          React UI (localhost:3000)
      │                                         │
      │ writes to tool_context.state           │ reads via useCoAgent
      ├─[upsert_ui_element]──────────────────> │
      ├─[remove_ui_element]───────────────────> │
      └─[clear_canvas]────────────────────────> │
                                                 │
                                                 └─> GenerativeCanvas renders
```

**Key Point**: State flows ONE WAY: Python writes → React reads. React never writes back to agent state.

### Critical Dependencies

- **Node.js**: 22.9.0+ required (earlier versions cause EBADENGINE errors)
  - Use `nvm` or `nvm-windows` to manage versions
  - Verify: `node --version` should show v22.9.0+
- **Python**: 3.12+ with `uv` or `pip` for dependency management
- **Google API Key**: Required for ADK agent (https://makersuite.google.com/app/apikey)

### State Contract

**Python Side** ([agent/main.py](../agent/main.py)):

```python
tool_context.state["elements"] = [
    {"id": "revenue", "type": "StatCard", "props": {...}},
    {"id": "users", "type": "DataTable", "props": {...}}
]
```

**TypeScript Side** ([src/lib/types.ts](../src/lib/types.ts)):

```typescript
type AgentState = { elements: UIElement[] };
type UIElement = { id: string; type: string; props: any };
```

**Critical**: Keys must match exactly between Python dicts and TypeScript interfaces. Python uses snake_case internally, but exports match TypeScript camelCase expectations.

---

## Development Workflow

### Starting the System

```bash
npm run dev                  # Starts both runtimes concurrently
npm run dev:ui               # React only (localhost:3000)
npm run dev:agent            # Python only (localhost:8000)
npm run dev:debug            # With LOG_LEVEL=debug
```

**Important**: Ensure `.env` file exists with `GOOGLE_API_KEY`. Copy from `.env.example` if missing.

### Environment Setup

```bash
# Quick setup (Windows)
.\scripts\setup.ps1

# Quick setup (Unix/macOS)
./scripts/setup.sh

# Manual setup
npm install                           # Node dependencies
./scripts/setup-agent.sh             # Python venv + agent deps
cp .env.example .env                 # Configure environment
# Edit .env: Add GOOGLE_API_KEY
```

### Building & Linting

```bash
npm run build                # Build Next.js production bundle
npm run lint                 # ESLint (TS) + Ruff (Python)
npm run lint:fix             # Auto-fix issues
npm run format               # Prettier + Ruff format
npm run check                # Lint + format combined
```

### Adding New Components

1. **Create React Component** in [src/components/registry/](../src/components/registry/)

   - Export named component (e.g., `export function MyWidget({ ...props })`)
   - Keep props simple and JSON-serializable

2. **Register in Renderer** ([src/app/page.tsx](../src/app/page.tsx)):

   ```tsx
   const renderElement = (el: UIElement) => {
     switch (el.type) {
       case "MyWidget": return <MyWidget key={el.id} {...el.props} />;
   ```

3. **Update Agent Instructions** ([agent/main.py](../agent/main.py)):
   ```python
   instruction="""
   Available Components & Props:
   4. MyWidget: { title, config, items }
   """
   ```

### Modifying Agent Behavior

- **Tools**: Add functions decorated with `tool_context: ToolContext` parameter
- **State Injection**: Modify `before_model_modifier()` to inject canvas state into system prompt
- **Response Control**: Use `after_model_modifier()` to stop consecutive tool calls

**Example Tool Pattern** (see [docs/REFACTORING_PATTERNS.md](../docs/REFACTORING_PATTERNS.md) Pattern 1):

```python
def my_tool(tool_context: ToolContext, param: str) -> Dict[str, str]:
    """
    Tool description for agent instructions.

    Args:
        param: Description with type info

    Returns:
        Success/error dict with status and message
    """
    # 1. Validate inputs
    if not param or not isinstance(param, str):
        return {"status": "error", "message": "Invalid param"}

    # 2. Get state safely
    elements = tool_context.state.get("elements", [])

    # 3. Perform operation
    # ... your logic here ...

    # 4. Update state
    tool_context.state["elements"] = elements

    # 5. Return structured response
    return {"status": "success", "message": f"Operation completed"}
```

## Component Registry Conventions

### Component Structure

```tsx
// StatCard.tsx (example)
export function StatCard({
  title,
  value,
  trend,
  trendDirection,
}: {
  title: string;
  value: string | number;
  trend?: string;
  trendDirection?: "up" | "down";
}) {
  return <div className="stat-card">...</div>;
}
```

### Naming Patterns

- **File**: PascalCase (`StatCard.tsx`)
- **Export**: Named export matching filename
- **Type**: String literal in agent tools ("StatCard")

## Critical Conventions

### State Sync Pattern

```typescript
// ✅ CORRECT: Read-only consumption
const { state } = useCoAgent<AgentState>({ name: "WorkbenchAgent" });
const elements = state?.elements || [];

// ❌ WRONG: Never mutate or setState
setState((prev) => [...prev, newElement]); // DON'T DO THIS
```

### Tool Schema

```python
# Agent expects: id (unique), type (component name), props (JSON dict)
upsert_ui_element(tool_context,
    id="revenue_stat",              # Snake_case recommended
    type="StatCard",                # PascalCase matches component
    props={"title": "Revenue", ...} # Camelcase matches React props
)
```

### Theme System

- Global theme color controlled by `setThemeColor` frontend tool
- CSS custom property: `--copilot-kit-primary-color`
- Applied via CopilotKitCSSProperties on main element

## Debugging

### Check Agent State

```bash
curl http://localhost:8000/health  # Basic health check
curl http://localhost:8000/ready   # Readiness + toolset info
```

### Common Issues

1. **Element not rendering**: Verify type string matches switch case exactly in [src/app/page.tsx](../src/app/page.tsx)
2. **Props not showing**: Check JSON serialization - no functions, no circular refs
3. **State not updating**: Ensure agent tool returns success dict with `{"status": "success"}`
4. **Type errors**: State contract must match between Python dict and TypeScript interface
5. **Node version errors**: Run `node --version` → should be v22.9.0+ (use nvm if not)
6. **Python import errors**: Activate venv: `source agent/.venv/bin/activate` or `agent\.venv\Scripts\activate`

### Debugging Checklist

```bash
# 1. Check services are running
curl http://localhost:8000/health    # Agent should return healthy
curl http://localhost:3000           # UI should load

# 2. Check environment
cat .env | grep GOOGLE_API_KEY       # Must be set
node --version                       # Must be v22.9.0+
python --version                     # Must be 3.12+

# 3. Check logs
# Agent logs appear in terminal running npm run dev:agent
# UI logs appear in browser DevTools console

# 4. Validate state contract
# Compare agent/main.py state writes with src/lib/types.ts
```

## Common Tasks

### Clear Canvas

```python
clear_canvas(tool_context)
```

### Update Element

```python
# Same ID = update existing element
upsert_ui_element(tool_context, id="stat1", type="StatCard", props={"value": 999})
```

### Multi-Component Layout

```python
# Order matters - elements render in array order
tool_context.state["elements"] = [
    {"id": "header", "type": "StatCard", "props": {...}},
    {"id": "table", "type": "DataTable", "props": {...}},
    {"id": "chart", "type": "ChartCard", "props": {...}}
]
```

### Change Theme Color

User prompt: "Change theme to orange" → Agent calls frontend tool `setThemeColor({ themeColor: "#ff6600" })`

## Toolset Management

This project includes GitHub MCP-style toolset lifecycle automation:

- **Registry**: [agent/toolsets.json](../agent/toolsets.json) - Canonical toolset definitions
- **Aliases**: [agent/toolset_aliases.json](../agent/toolset_aliases.json) - Deprecation mappings
- **Scripts**: [scripts/toolset-management/](../scripts/toolset-management/) - Validation, detection, migration
- **Documentation**: [docs/TOOLSET_MANAGEMENT.md](../docs/TOOLSET_MANAGEMENT.md), [TOOLSET_README.md](../TOOLSET_README.md)

### Key Commands

```bash
npm run validate:toolsets    # JSON schema validation
npm run detect:changes       # Find new/modified toolsets
npm run test:aliases         # Test alias resolution
npm run docs:all             # Generate full documentation
npm run docs:sync            # Sync JSON ↔ Markdown
npm run docs:diagram:svg     # Generate toolset relationship diagram
```

### Workflow: Adding a New Toolset

1. **Define tool** in [agent/main.py](../agent/main.py)
2. **Run detection**: `npm run detect:changes` (auto-detects new tools)
3. **Validate**: `npm run validate:toolsets` (checks schema, naming, refs)
4. **Sync docs**: `npm run docs:all` (generates markdown)
5. **Commit changes**: Git add JSON + generated markdown files

### Workflow: Editing Documentation

```bash
# Option 1: Edit JSON directly
vim agent/toolsets.json
npm run docs:json-to-md      # Sync to markdown

# Option 2: Edit Markdown
vim docs/toolsets/ui_elements.md
npm run docs:md-to-json      # Sync to JSON

# Always validate after editing
npm run docs:sync --validate-only
```

## MCP Collections & Resources

### Active Collections

- **frontend-web-dev**: React 19+, Next.js patterns, TypeScript conventions
- **python-mcp-development**: FastMCP server patterns, official SDK practices
- **software-engineering-team**: Security reviewer, GitOps/CI specialist agents

### GitHub MCP Toolsets (Enabled)

- **code_security**: Code scanning alerts, security analysis
- **pull_requests**: PR operations, Copilot code reviews (`request_copilot_review`)
- **repos**: Code search, branch management, file operations

### Code Review Resources

- **Instructions**: `code-review-generic.instructions.md`, `github-actions-ci-cd-best-practices.instructions.md` (from awesome-copilot MCP)
- **Agents**: SE Security Reviewer (OWASP Top 10, Zero Trust), SE GitOps/CI Specialist (deployment debugging)
- **Refactoring**: Janitor agent (tech debt elimination), TDD Refactor agent (quality & security hardening)

## ChromaDB Integration

This project uses a **dual ChromaDB architecture** for semantic code indexing and session memory.

### Embedding Model

Uses **Google Gemini Embeddings** (`gemini-embedding-001`) with configurable dimensions:

- **768** (default): Standard semantic search
- **1536**: Higher fidelity
- **3072**: Maximum precision

Task types supported:

- `RETRIEVAL_DOCUMENT`: For indexing documents
- `RETRIEVAL_QUERY`: For search queries
- `SEMANTIC_SIMILARITY`: For comparing text similarity
- `CLASSIFICATION`: For classification tasks
- `CLUSTERING`: For clustering applications

### Part A: Session ChromaDB (HTTP Server)

Session-scoped storage for observability, metrics, and MCP server logs. Terminates with codespace.

```bash
# Start ChromaDB HTTP server
python scripts/start_chroma_server.py --port 8001

# Connect from Python
import chromadb
client = chromadb.HttpClient(host="localhost", port=8001)

# Collections available:
# - session_<run_id>_code_index: Semantic code search
# - session_<run_id>_agent_interactions: Agent queries/responses
# - session_<run_id>_observability_metrics: Performance metrics
# - session_<run_id>_mcp_server_logs: MCP tool execution logs
# - session_<run_id>_sandbox_executions: Code sandbox results
```

### Part B: In-Session Memory Artifact

Persistent ChromaDB artifact for state tracking across agents. Exported as downloadable artifact.

```bash
# Start session memory manager
python scripts/session_memory.py --serve --serve-port 8002

# Or use programmatically
from scripts.session_memory import SessionMemory

memory = SessionMemory(mode="persistent", embedding_dim=768)
memory.store_interaction("user_query", "Generate a dashboard")
memory.store_state_change("elements", [{"id": "card1", "type": "StatCard"}])

results = memory.search_context("dashboard creation")
```

### GitHub Actions Workflow

The `build-code-index.yml` workflow runs on push/schedule:

```bash
# Manual trigger with options
gh workflow run build-code-index.yml \
  -f full_reindex=true \
  -f chroma_mode=http \
  -f embedding_dim=768

# View workflow runs
gh run list --workflow=build-code-index.yml

# Download artifacts
gh run download <run_id> -n chromadb-memory-<sha>
```

### Required Secrets

Add these in GitHub repository settings:

- `GOOGLE_API_KEY`: For Gemini embeddings (gemini-embedding-001)

### Local Development

```bash
# Install dependencies
pip install chromadb google-generativeai pykomodo

# Run ingestion manually
python scripts/ingest_chunks.py \
  --mode persistent \
  --persist-dir ./chroma_data \
  --chunks-file output_chunks/chunks.jsonl \
  --create-collections code_index,agent_interactions \
  --embedding-dim 768

# With custom task type
python scripts/ingest_chunks.py \
  --mode persistent \
  --persist-dir ./chroma_data \
  --chunks-file output_chunks/chunks.jsonl \
  --task-type RETRIEVAL_DOCUMENT
```

## Anti-Patterns to Avoid

### ❌ Bidirectional State Sync

**Problem**: Trying to write to agent state from React

```typescript
// ❌ DON'T DO THIS
const { state, setState } = useCoAgent<AgentState>({ name: "WorkbenchAgent" });
setState((prev) => ({ elements: [...prev.elements, newElement] }));
```

**Solution**: State is read-only in React. Only Python agent writes to `tool_context.state`.

### ❌ Missing Key Props

```typescript
// ❌ Missing keys (React warnings, broken updates)
{
  elements.map((el) => <StatCard {...el.props} />);
}

// ✅ Unique keys
{
  elements.map((el) => <StatCard key={el.id} {...el.props} />);
}
```

### ❌ Unvalidated Props

```python
# ❌ No validation (XSS vulnerability)
def upsert_ui_element(tool_context, id, type, props):
    tool_context.state["elements"].append({"id": id, "type": type, "props": props})

# ✅ Validated with whitelist
ALLOWED_TYPES = {"StatCard", "DataTable", "ChartCard"}
if type not in ALLOWED_TYPES:
    return {"status": "error", "message": f"Unknown type: {type}"}
```

## External Documentation

- **CopilotKit Docs**: https://docs.copilotkit.ai/
- **Google ADK**: https://ai.google.dev/adk/docs
- **AG-UI Client**: https://www.npmjs.com/package/@ag-ui/client
- **Generative UI Architecture**: [Project_Overview.md](../Project_Overview.md)
- **Refactoring Patterns**: [docs/REFACTORING_PATTERNS.md](../docs/REFACTORING_PATTERNS.md)
- **Schema Crawler Tool**: [agent-generator/SCHEMA_CRAWLER_README.md](../agent-generator/SCHEMA_CRAWLER_README.md)
- **Node.js Version**: 22.9.0+ required (use nvm for version management)
- **Python Environment**: 3.12+ with uv or pip for dependency management

## Testing & Validation

### Running Tests

```bash
# TypeScript type checking
npx tsc --noEmit

# Linting (both TS and Python)
npm run lint
npm run lint:fix              # Auto-fix issues

# Python linting separately
cd agent
uv run ruff check .
uv run ruff format .
```

### Component Testing Pattern

```typescript
// src/components/registry/StatCard.test.tsx
import { render, screen } from "@testing-library/react";
import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders with valid props", () => {
    render(<StatCard title="Revenue" value={120000} />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("120,000")).toBeInTheDocument();
  });

  it("renders fallback for invalid props", () => {
    render(<StatCard title={123} value={null} />);
    expect(screen.getByText("Invalid StatCard props")).toBeInTheDocument();
  });
});
```

### Agent Tool Testing Pattern

```python
# tests/test_agent_tools.py
import pytest
from agent.main import upsert_ui_element
from unittest.mock import MagicMock

def test_upsert_ui_element_creates_new():
    mock_context = MagicMock()
    mock_context.state = {"elements": []}

    result = upsert_ui_element(
        mock_context,
        id="test_card",
        type="StatCard",
        props={"title": "Test", "value": 42}
    )

    assert result["status"] == "success"
    assert len(mock_context.state["elements"]) == 1
```

### Manual Testing Workflow

1. Start services: `npm run dev`
2. Open browser: http://localhost:3000
3. Test in CopilotSidebar: "Generate a KPI dashboard with revenue, users, and churn cards"
4. Verify elements render correctly
5. Check agent logs in terminal for errors
6. Inspect browser DevTools console for frontend errors

## Critical Workflows

### First-Time Setup

```bash
# 1. Install nvm (if not already)
# Windows: https://github.com/coreybutler/nvm-windows
# Unix/macOS: https://github.com/nvm-sh/nvm

# 2. Install Node.js 22.9.0+
nvm install 22.9.0
nvm use 22.9.0

# 3. Clone and setup
git clone <repo-url>
cd modme-ui-01
npm install

# 4. Setup Python environment (automatic via postinstall)
# Or manually:
./scripts/setup-agent.sh  # Unix/macOS
.\scripts\setup-agent.bat  # Windows

# 5. Configure environment
cp .env.example .env
# Edit .env and add GOOGLE_API_KEY

# 6. Start development
npm run dev
```

### Adding a New Component to Registry

```bash
# 1. Create component file
# src/components/registry/NewWidget.tsx
export function NewWidget({ title, data }: { title: string; data: any[] }) {
  return <div className="widget">{/* ... */}</div>;
}

# 2. Register in page.tsx renderer
# src/app/page.tsx
import { NewWidget } from "@/components/registry/NewWidget";

const renderElement = (el: UIElement) => {
  switch (el.type) {
    case "NewWidget": return <NewWidget key={el.id} {...el.props} />;
    // ... other cases
  }
};

# 3. Update agent instructions
# agent/main.py - Add to ALLOWED_TYPES and agent instruction
ALLOWED_TYPES = {"StatCard", "DataTable", "ChartCard", "NewWidget"}

# 4. Test
npm run dev
# Use sidebar: "Create a NewWidget with title 'Test' and sample data"
```

### Debugging State Synchronization Issues

```bash
# 1. Check agent state injection
curl http://localhost:8000/ready | jq

# 2. Add logging to before_model_modifier
# agent/main.py
def before_model_modifier(callback_context, llm_request):
    elements = callback_context.state.get("elements", [])
    print(f"[DEBUG] Current elements: {len(elements)}")
    print(f"[DEBUG] Elements: {json.dumps(elements, indent=2)}")
    # ... rest of function

# 3. Check React state consumption
# src/app/page.tsx
function YourMainContent() {
  const { state } = useCoAgent<AgentState>({ name: "WorkbenchAgent" });
  console.log("[DEBUG] React state:", state);
  console.log("[DEBUG] Elements:", state?.elements);
  // ... rest of component
}

# 4. Restart both services
npm run dev
# Watch both terminals for [DEBUG] output
```

### Schema Validation Workflow

```bash
# 1. Generate Zod schemas from JSON Schema
cd agent-generator
npm run generate:schemas

# 2. Use generated schemas in validation
# src/components/registry/StatCard.tsx
import { StatCardPropsSchema } from "@/schemas/StatCard.schema";

export function StatCard(rawProps: unknown) {
  const result = StatCardPropsSchema.safeParse(rawProps);
  if (!result.success) {
    console.error("Validation failed:", result.error);
    return <ErrorFallback />;
  }
  const props = result.data;  // Type-safe!
  // ... rest of component
}
```

### Upgrading Dependencies

```bash
# Check for updates
npm outdated

# Update Next.js (critical for compatibility)
npm install next@latest

# Update React (if needed)
npm install react@latest react-dom@latest

# Update CopilotKit (major version changes may require code updates)
npm install @copilotkit/react-core@latest @copilotkit/react-ui@latest @copilotkit/runtime@latest

# Update Python dependencies
cd agent
uv add google-adk@latest ag-ui-adk@latest
# or
pip install --upgrade google-adk ag-ui-adk

# Test after updates
npm run dev
npm run lint
npm run validate:toolsets
```

## Quick Reference

| Task                 | Command/File                                                                            |
| -------------------- | --------------------------------------------------------------------------------------- |
| Start dev            | `npm run dev`                                                                           |
| Add component        | [src/components/registry/](../src/components/registry/)                                 |
| Update agent tools   | [agent/main.py](../agent/main.py)                                                       |
| State type contract  | [src/lib/types.ts](../src/lib/types.ts)                                                 |
| API endpoint         | [src/app/api/copilotkit/route.ts](../src/app/api/copilotkit/route.ts)                   |
| Canvas renderer      | [src/app/page.tsx](../src/app/page.tsx)                                                 |
| Health check         | http://localhost:8000/health                                                            |
| Toolset validation   | `npm run validate:toolsets`                                                             |
| Documentation sync   | `npm run docs:all`                                                                      |
| Refactoring patterns | [docs/REFACTORING_PATTERNS.md](../docs/REFACTORING_PATTERNS.md)                         |
| Schema crawler       | [agent-generator/SCHEMA_CRAWLER_README.md](../agent-generator/SCHEMA_CRAWLER_README.md) |
| ChromaDB HTTP server | `python scripts/start_chroma_server.py --port 8001`                                     |
| Session memory       | `python scripts/session_memory.py --serve --serve-port 8002`                            |
| Code indexing        | `python scripts/ingest_chunks.py --mode persistent`                                     |
