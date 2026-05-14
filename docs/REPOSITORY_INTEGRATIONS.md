# Repository Integrations

**Date**: 2026-01-19
**Version**: 0.3.0

## Overview

This document describes the integrations implemented from analyzing four key repositories:

1. **Containarium** - Container management with MCP integration
2. **OpenWork** - AI agent workflow application
3. **Goose** - Autonomous AI development agent
4. **MCP-Use** - Model Context Protocol framework

## Integrated Features

### 1. MCP (Model Context Protocol) Server

**Source**: mcp-use, Containarium

**What it does**: Exposes all agent tools via the standardized Model Context Protocol, enabling interoperability with other MCP-compatible clients.

**Files**:
- `agent/mcp_server.py` - MCP server wrapper
- `src/lib/mcp-client.ts` - Frontend MCP client SDK

**API Endpoints**:
- `GET /api/mcp/info` - Get MCP server information
- `POST /api/mcp/call` - Call an MCP tool
- `POST /api/mcp/resource` - Read an MCP resource

**Usage**:
```python
from mcp_server import get_mcp_server, register_agent_tools_as_mcp

# Register tools with MCP server
register_agent_tools_as_mcp([tool1, tool2, tool3])

# Get server info
mcp_server = get_mcp_server()
print(f"Registered {len(mcp_server.tools_registry)} tools")
```

```typescript
import { getMCPClient } from '@/lib/mcp-client';

const client = getMCPClient();
const info = await client.getServerInfo();
const result = await client.callTool('upsert_ui_element', {
  id: 'test',
  type: 'StatCard',
  props: { title: 'Test' }
});
```

---

### 2. Permission Management System

**Source**: OpenWork

**What it does**: Provides granular permission controls for agent operations, ensuring safe execution of destructive or sensitive actions.

**Files**:
- `agent/permissions.py` - Permission system implementation
- `src/components/registry/PermissionDialog.tsx` - Permission UI component

**Permission Levels**:
- `READ` - Read-only operations (auto-approved)
- `WRITE` - State modifications
- `EXECUTE` - Code execution
- `NETWORK` - Network access
- `DESTRUCTIVE` - Delete/clear operations
- `FILE_SYSTEM` - File system access

**API Endpoints**:
- `GET /api/permissions/pending` - List pending permission requests
- `POST /api/permissions/approve` - Approve a permission request

**Usage**:
```python
from permissions import requires_permission, PermissionLevel

@requires_permission(PermissionLevel.DESTRUCTIVE, "Clear all canvas elements")
def clear_canvas(tool_context: ToolContext) -> Dict[str, str]:
    tool_context.state["elements"] = []
    return {"status": "success"}
```

```tsx
import { PermissionDialog } from '@/components/registry/PermissionDialog';

<PermissionDialog
  onApprove={(req) => console.log('Approved:', req)}
  onDeny={(req) => console.log('Denied:', req)}
/>
```

---

### 3. SSE (Server-Sent Events) Streaming

**Source**: OpenWork

**What it does**: Provides real-time streaming of agent progress, tool execution, and intermediate results to the frontend.

**Files**:
- `agent/sse_handler.py` - SSE event bus and message handling
- `src/lib/sse-client.ts` - Frontend SSE client

**Event Types**:
- `tool_start` - Tool execution started
- `tool_progress` - Tool execution progress update
- `tool_complete` - Tool execution completed
- `tool_error` - Tool execution error
- `agent_thinking` - Agent reasoning/thinking step
- `state_update` - State change notification

**API Endpoints**:
- `GET /api/events?channel=default` - SSE stream endpoint

**Usage**:
```python
from sse_handler import get_event_bus

event_bus = get_event_bus()
await event_bus.publish_tool_start("upsert_ui_element", {"id": "test"})
await event_bus.publish_tool_complete("upsert_ui_element", {"status": "success"})
```

```typescript
import { getSSEClient } from '@/lib/sse-client';

const client = getSSEClient();
client.connect('default');

client.on('tool_start', (event) => {
  console.log('Tool started:', event.data);
});

client.on('tool_complete', (event) => {
  console.log('Tool completed:', event.data);
});
```

---

### 4. Multi-Model LLM Support

**Source**: Goose

**What it does**: Enables switching between multiple LLM providers (Gemini, OpenAI, Anthropic, local models) for cost optimization and fallback strategies.

**Files**:
- `agent/llm_providers.py` - Multi-provider abstraction
- `src/components/registry/ModelSelector.tsx` - Model selection UI

**Supported Providers**:
- **Google Gemini** - gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-pro
- **OpenAI** - gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo
- **Anthropic** - claude-3-5-sonnet, claude-3-opus, claude-3-sonnet, claude-3-haiku
- **Ollama** - Local models (llama3, mistral, etc.)

**API Endpoints**:
- `GET /api/llm/providers` - List available providers
- `GET /api/llm/usage` - Get usage statistics and costs
- `POST /api/llm/generate` - Generate text with specified provider

**Usage**:
```python
from llm_providers import LLMConfig, LLMProvider, get_provider_manager

manager = get_provider_manager()

# Generate with OpenAI
config = LLMConfig(provider=LLMProvider.OPENAI, model="gpt-4o-mini")
response = await manager.generate("Hello", config=config)

# Check usage
summary = manager.get_usage_summary()
print(f"Total cost: ${summary['total_cost']}")
```

```tsx
import { ModelSelector } from '@/components/registry/ModelSelector';

<ModelSelector
  onModelChange={(provider, model) => {
    console.log('Switched to:', provider, model);
  }}
/>
```

---

### 5. Workflow Templates (Recipes)

**Source**: Goose

**What it does**: Provides template-based automation for reusable workflows, enabling save, edit, and replay of common consulting tasks.

**Files**:
- `agent/recipes.py` - Recipe engine and manager
- `agent/recipes/*.json` - Recipe definitions
- `src/components/registry/RecipeCard.tsx` - Recipe display component
- `src/app/recipes/page.tsx` - Recipe marketplace UI

**Default Recipes**:
- `data-analysis.json` - Create analysis dashboard with KPIs and charts
- `report-generation.json` - Generate executive summary with metrics

**API Endpoints**:
- `GET /api/recipes` - List all recipes
- `GET /api/recipes/{id}` - Get specific recipe
- `POST /api/recipes/{id}/execute` - Execute recipe with variables

**Recipe Structure**:
```json
{
  "id": "unique-id",
  "name": "Recipe Name",
  "description": "What this recipe does",
  "category": "data_analysis",
  "steps": [
    {
      "id": "step_1",
      "tool_name": "upsert_ui_element",
      "description": "Create KPI card",
      "parameters": {
        "id": "kpi_card",
        "type": "StatCard",
        "props": {
          "title": "${variable_name}",
          "value": "${another_variable}"
        }
      },
      "on_error": "continue"
    }
  ],
  "tags": ["analysis", "dashboard"],
  "version": "1.0.0"
}
```

**Usage**:
```python
from recipes import get_recipe_manager, Recipe, RecipeStep

manager = get_recipe_manager()

# Create recipe
recipe = manager.create_recipe(
    name="My Workflow",
    description="Custom workflow",
    category="custom",
    steps=[RecipeStep(id="s1", tool_name="tool", description="Step 1", parameters={})]
)

# Execute recipe
executor = RecipeExecutor(tool_registry)
result = await executor.execute_recipe(recipe, tool_context, variables={"var": "value"})
```

---

## Configuration

### Environment Variables

Add to `.env`:

```bash
# Existing
GOOGLE_API_KEY=your_gemini_key

# New - Multi-Model LLM Support
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# New - JWT Authentication (optional)
JWT_SECRET=your_secret_key

# New - Ollama (if using local models)
OLLAMA_BASE_URL=http://localhost:11434
```

### Python Dependencies

Updated in `agent/pyproject.toml`:

```toml
dependencies = [
    # ... existing dependencies ...
    "mcp>=0.9.0",              # MCP integration
    "openai>=1.30.0",          # OpenAI support
    "anthropic>=0.25.0",       # Anthropic support
    "pyjwt>=2.8.0",            # JWT auth
    "python-jose[cryptography]>=3.3.0",  # JWT utilities
]
```

Install new dependencies:
```bash
cd agent
pip install -e .
```

### TypeScript Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0"
  }
}
```

---

## Usage Examples

### 1. Complete Data Analysis Workflow

```typescript
// Execute data analysis recipe
const response = await fetch('http://localhost:8000/api/recipes/data-analysis-001/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    variables: {
      record_count: "1,234",
      table_columns: ["Name", "Value"],
      table_data: [{ name: "Item 1", value: 100 }],
      chart_data: [{ x: 1, y: 10 }]
    }
  })
});

const result = await response.json();
console.log('Recipe status:', result.status);
```

### 2. Real-Time Agent Monitoring

```typescript
import { getSSEClient } from '@/lib/sse-client';

const client = getSSEClient();
client.connect('default');

client.on('tool_start', (event) => {
  showNotification(`Started: ${event.data.tool_name}`);
});

client.on('tool_progress', (event) => {
  updateProgressBar(event.data.progress);
});

client.on('tool_complete', (event) => {
  showSuccess(`Completed: ${event.data.tool_name}`);
});
```

### 3. Multi-Model Cost Optimization

```python
from llm_providers import LLMProvider, get_provider_manager

manager = get_provider_manager()

# Try cheap model first, fallback to more expensive
try:
    response = await manager.generate(
        prompt,
        config=LLMConfig(provider=LLMProvider.OPENAI, model="gpt-4o-mini"),
        fallback_providers=[LLMProvider.GEMINI, LLMProvider.ANTHROPIC]
    )
except Exception:
    # All providers failed
    pass

# Check costs
summary = manager.get_usage_summary()
print(f"Total spent: ${summary['total_cost']:.4f}")
```

---

## Architecture Impact

### Before Integration
```
User Browser
└── Next.js UI
    └── WebSocket → Python ADK Agent (Gemini only)
```

### After Integration
```
User Browser
├── Next.js UI
│   ├── SSE Client (real-time updates)
│   ├── MCP Client (tool access)
│   ├── Permission Dialog
│   ├── Recipe Marketplace
│   └── Model Selector
│
└── FastAPI Agent
    ├── MCP Server (tool exposure)
    ├── SSE Event Bus (streaming)
    ├── Permission Manager
    ├── Recipe Engine
    ├── Multi-LLM Manager
    │   ├── Gemini
    │   ├── OpenAI
    │   ├── Anthropic
    │   └── Ollama
    └── Google ADK (existing)
```

---

## Testing

### Backend Tests
```bash
cd agent
pytest tests/test_mcp_server.py
pytest tests/test_permissions.py
pytest tests/test_recipes.py
pytest tests/test_llm_providers.py
```

### Frontend Tests
```bash
npm run test:components
```

### Integration Tests
```bash
npm run test:integration
```

---

## Migration Notes

### Backward Compatibility
✅ All new features are **opt-in** and **additive**
✅ Existing CopilotKit integration **unchanged**
✅ No breaking changes to current workflows

### Gradual Adoption
1. Start using recipes for common workflows
2. Enable SSE for real-time monitoring
3. Add permission controls for production
4. Experiment with multi-model support
5. Integrate MCP for external tool access

---

## Troubleshooting

### MCP Server Not Responding
- Check `pip install mcp` was successful
- Verify agent is running on port 8000
- Check `/api/mcp/info` endpoint

### SSE Connection Issues
- Check browser supports EventSource API
- Verify CORS allows SSE connections
- Check agent logs for SSE errors

### Permission Dialogs Not Appearing
- Verify polling is enabled in PermissionDialog component
- Check `/api/permissions/pending` returns data
- Ensure tools have `@requires_permission` decorator

### Model Switching Fails
- Verify API keys in `.env`
- Check provider is available at `/api/llm/providers`
- Review usage limits/quotas

---

## Future Enhancements

### Planned
- [ ] JWT authentication for agent endpoints
- [ ] Session persistence and recovery
- [ ] MCP Inspector UI for debugging
- [ ] Skills marketplace for dynamic installation
- [ ] Container-based sandboxing (LXC integration)

### Under Consideration
- [ ] GraphQL API for complex queries
- [ ] WebRTC for low-latency streaming
- [ ] Distributed agent orchestration
- [ ] Built-in observability (traces, metrics, logs)

---

## References

- [MCP-Use Documentation](https://github.com/mcp-use/mcp-use)
- [OpenWork Patterns](https://github.com/different-ai/openwork)
- [Goose Architecture](https://github.com/block/goose)
- [Containarium MCP](https://github.com/Ditto190/Containarium)

---

## Support

For issues or questions:
- Check `/api/health` for system status
- Review agent logs: `npm run dev:agent`
- Check browser console for frontend errors
- File issues at GitHub repository
