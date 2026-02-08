# AI Tool Maker Integration Guide

**Goal**: Auto-generate type-safe Vercel AI SDK tools from OpenAPI specs for awesome-copilot MCP collections

## Architecture

```
Awesome Copilot MCP Tools
         ↓
OpenAPI 3.0 Spec (generated)
         ↓
AI Tool Maker (aitm)
         ↓
Type-safe Zod + AI SDK Tools
         ↓
Import into agent/main.py
```

## Step 1: Generate OpenAPI Spec

```bash
# From modme-ui-01-test-worktree root
python scripts/generate_awesome_copilot_openapi.py
```

**Output**: `openapi-specs/awesome-copilot-mcp.json`

This spec includes:

- `/mcp/awesome-copilot/collections` - List collections
- `/mcp/awesome-copilot/collections/{name}` - Get collection tools
- `/mcp/github/toolsets` - List GitHub toolsets
- `/mcp/github/toolsets/{name}/tools` - Get toolset tools
- `/mcp/github/toolsets/{name}/enable` - Enable toolset
- `/mcp/collections/scan` - Auto-discover collections
- `/mcp/collections/create` - Create new collections

## Step 2: Generate AI SDK Tools

```bash
# Install AI Tool Maker
npm install -g aitm

# Generate tools
npx aitm ./agent/tools/generated ./openapi-specs/awesome-copilot-mcp.json \
  -c ./openapi-ts.config.ts
```

**Generated files**:

```
agent/tools/generated/
├── awesome-copilot-mcp.gen.ts  # API client (hey-api)
└── tool/
    ├── awesome-copilot.tool.ts # AI SDK tools
    ├── github-mcp.tool.ts
    ├── collection-manager.tool.ts
    └── aitm.schema.ts          # Zod schemas
```

## Step 3: Configure API Client

Create `openapi-ts.config.ts`:

```typescript
import type { CreateClientConfig } from "@hey-api/client-fetch";

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: process.env.AGENT_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
    ...(process.env.MCP_AUTH_TOKEN && {
      Authorization: `Bearer ${process.env.MCP_AUTH_TOKEN}`,
    }),
  },
});
```

## Step 4: Python Bridge (FastAPI Endpoints)

Add FastAPI routes in `agent/routes/mcp_bridge.py`:

```python
from fastapi import APIRouter, HTTPException
from pathlib import Path
import json

router = APIRouter(prefix="/mcp", tags=["mcp-bridge"])

@router.get("/awesome-copilot/collections")
async def list_collections():
    """Bridge to MCP awesome-copilot list_collections tool"""
    # This calls your existing MCP tool
    from tools.mcp_awesome_copilot import list_collections

    try:
        result = list_collections(tool_context)
        return {"collections": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/awesome-copilot/collections/{collection_name}")
async def get_collection_tools(collection_name: str):
    """Bridge to MCP get_toolset_tools"""
    from tools.mcp_awesome_copilot import get_toolset_tools

    result = get_toolset_tools(tool_context, collection_name)
    return result

@router.get("/github/toolsets")
async def list_toolsets():
    """List available GitHub MCP toolsets"""
    from tools.mcp_github import list_available_toolsets

    return list_available_toolsets(tool_context)

@router.get("/github/toolsets/{toolset_name}/tools")
async def get_toolset_tools(toolset_name: str):
    """Get tools in GitHub toolset"""
    from tools.mcp_github import get_toolset_tools

    return get_toolset_tools(tool_context, toolset_name)

@router.post("/github/toolsets/{toolset_name}/enable")
async def enable_toolset(toolset_name: str):
    """Enable GitHub toolset"""
    from tools.mcp_github import enable_toolset

    return enable_toolset(tool_context, toolset_name)

@router.post("/collections/scan")
async def scan_collections(request: dict):
    """Scan repository for collections"""
    from tools.collection_manager import scan_repository_for_collection_items

    return scan_repository_for_collection_items(
        tool_context,
        repo_root=request["repo_root"],
        tag_filter=request.get("tag_filter"),
        kind_filter=request.get("kind_filter")
    )

@router.post("/collections/create")
async def create_collection(request: dict):
    """Create new collection"""
    from tools.collection_manager import create_collection

    return create_collection(
        tool_context,
        collection_id=request["collection_id"],
        name=request["name"],
        description=request["description"],
        items=request["items"],
        tags=request.get("tags"),
        output_path=request.get("output_path")
    )
```

Register router in `agent/main.py`:

```python
from routes.mcp_bridge import router as mcp_router

app.include_router(mcp_router)
```

## Step 5: Use Generated Tools in TypeScript/React

```typescript
// In your frontend components
import {
  listAwesomeCopilotCollections,
  getCollectionTools,
  enableToolset,
} from "@/agent/tools/generated/tool";

// Type-safe calls with Zod validation
const collections = await listAwesomeCopilotCollections();

// Zod ensures response matches schema
collections.data.collections.forEach((collection) => {
  console.log(collection.name); // Type-safe!
});

// Enable a toolset
await enableToolset({
  path: { toolset_name: "github-issues" },
});
```

## Step 6: Use in Agent Workflows (Python)

```python
# agent/main.py - Import as Python-callable tools

import requests
from typing import Dict, Any

def call_mcp_tool(endpoint: str, method: str = "GET", data: Dict = None) -> Any:
    """Helper to call FastAPI MCP bridge"""
    base_url = "http://localhost:8000"
    url = f"{base_url}{endpoint}"

    if method == "GET":
        response = requests.get(url)
    elif method == "POST":
        response = requests.post(url, json=data)

    return response.json()

# Now your Python agent can call these
def discover_collections_tool(tool_context: ToolContext) -> Dict[str, Any]:
    """ADK tool that uses auto-generated API"""
    collections = call_mcp_tool("/mcp/awesome-copilot/collections")
    return {
        "status": "success",
        "collections": collections["collections"]
    }

# Register with ADK
toolkit.register_tool("discover_collections", discover_collections_tool)
```

## Benefits Achieved

### 1. Type-Safe Clients ✅

```typescript
// Compile-time errors if schema changes
const result = await getToolsetTools({
  path: { toolset_name: "invalid" },
});
// TypeScript knows exact response shape
```

### 2. Auto-Updated from OpenAPI ✅

```bash
# Regenerate when schema changes
python scripts/generate_awesome_copilot_openapi.py
npx aitm ./agent/tools/generated ./openapi-specs/awesome-copilot-mcp.json
# All client code stays in sync!
```

### 3. Zod Validation ✅

```typescript
// Input validation automatic
import { listAwesomeCopilotCollections } from "./tool";
// Request/response validated against OpenAPI schema
```

### 4. Decomposed Agent Structure ✅

```
Instructions (markdown)
  ↓
Prompts (templates)
  ↓
Tools (OpenAPI → aitm)
  ↓
Skills (composable workflows)
```

### 5. MCP Skills as API Endpoints ✅

```python
# Each skill becomes discoverable via OpenAPI
/mcp/skills/create-react-component  # From awesome-copilot
/mcp/skills/generate-api-client     # From github toolset
/mcp/skills/write-test-suite        # From collection
```

## Integration with Existing Systems

### With schema-crawler

```bash
# schema-crawler outputs JSON Schema
# Convert to OpenAPI components for aitm

python agent-generator/src/index.ts --output openapi
npx aitm ./agent/tools/ui-components ./openapi-specs/ui-components.json
```

### With toolsets.json

```python
# Auto-generate OpenAPI from toolsets.json registry
def generate_openapi_from_toolsets(toolsets_path: str):
    with open(toolsets_path) as f:
        toolsets = json.load(f)

    spec = {"paths": {}}
    for toolset in toolsets:
        for tool in toolset["tools"]:
            path = f"/toolsets/{toolset['name']}/tools/{tool['name']}"
            spec["paths"][path] = {
                "post": {
                    "operationId": f"{toolset['name']}_{tool['name']}",
                    "summary": tool.get("description", ""),
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": tool.get("inputSchema", {})
                            }
                        }
                    }
                }
            }

    return spec
```

## Testing

```bash
# Start agent server
npm run dev:agent

# Test endpoints
curl http://localhost:8000/mcp/awesome-copilot/collections
curl http://localhost:8000/mcp/github/toolsets

# Test generated TypeScript client
npm run test:mcp-tools
```

## Maintenance

### When OpenAPI Spec Changes

```bash
# 1. Update Python tool definitions
# 2. Regenerate OpenAPI spec
python scripts/generate_awesome_copilot_openapi.py

# 3. Regenerate client tools
npx aitm ./agent/tools/generated ./openapi-specs/awesome-copilot-mcp.json

# 4. Run tests
npm run test
pytest agent/tests/
```

### Version Control

```gitignore
# Track OpenAPI specs
openapi-specs/*.json

# Generated code can be gitignored or tracked
agent/tools/generated/*.gen.ts  # gitignore (regenerate)
agent/tools/generated/tool/*.ts # gitignore (regenerate)
```

## Next Steps

1. **Generate OpenAPI spec**: Run the Python script
2. **Test manually**: Review `openapi-specs/awesome-copilot-mcp.json`
3. **Add FastAPI routes**: Create the MCP bridge endpoints
4. **Generate tools**: Run `npx aitm ...`
5. **Test integration**: Call from both TypeScript and Python
6. **Extend**: Add more MCP tools to the OpenAPI spec

## References

- [AI Tool Maker (aitm)](https://github.com/nihaocami/ai-tool-maker)
- [hey-api/openapi-ts](https://github.com/hey-api/openapi-ts)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [OpenAPI 3.0 Spec](https://spec.openapis.org/oas/v3.0.3)
