# Quick Start: AI Tool Maker for Awesome Copilot

**Time to implement**: ~30 minutes
**Result**: Type-safe, auto-generated MCP tools for all awesome-copilot collections

## 🚀 TL;DR

```bash
# 1. Generate OpenAPI spec
python scripts/generate_awesome_copilot_openapi.py

# 2. Generate type-safe tools
npx aitm ./agent/tools/generated \
  ./openapi-specs/awesome-copilot-mcp.json \
  -c ./openapi-ts.config.ts

# 3. Use them!
# TypeScript: import { listAwesomeCopilotCollections } from './tool'
# Python: Call FastAPI endpoints at http://localhost:8000/mcp
```

## 📋 Prerequisites

- [x] Node.js 22.9.0+ (you have this)
- [x] Python 3.12+ with FastAPI agent running (you have this)
- [x] AI Tool Maker: `npm install -g aitm` (install this)

## 🎯 What You Get

### Before (Manual)

```python
# agent/main.py - manually define every tool
def list_collections(tool_context):
    # 50+ lines of boilerplate
    # Manual JSON parsing
    # No type safety
    # Copy-paste for each tool
```

### After (Generated)

```typescript
// Auto-generated, type-safe, validated
import { listAwesomeCopilotCollections } from "@/agent/tools/generated/tool";

const { data, error } = await listAwesomeCopilotCollections();
// TypeScript knows exact shape!
// Zod validates request/response!
// Update with one command!
```

## 📁 Files Created

| File                                          | Purpose          | Keep in Git?             |
| --------------------------------------------- | ---------------- | ------------------------ |
| `scripts/generate_awesome_copilot_openapi.py` | Spec generator   | ✅ Yes                   |
| `openapi-specs/awesome-copilot-mcp.json`      | OpenAPI 3.0 spec | ✅ Yes                   |
| `openapi-ts.config.ts`                        | Client config    | ✅ Yes                   |
| `agent/tools/generated/**/*.ts`               | Generated tools  | ⚠️ Optional (regenerate) |
| `scripts/integrate_aitm_tools.md`             | Full guide       | ✅ Yes                   |
| `agent/tests/test_openapi_spec.py`            | Tests            | ✅ Yes                   |

## 🔄 Workflow

### First Time Setup

```bash
# 1. Install AI Tool Maker
npm install -g aitm

# 2. Generate OpenAPI spec
python scripts/generate_awesome_copilot_openapi.py
# ✓ Creates openapi-specs/awesome-copilot-mcp.json

# 3. Review the spec (optional)
code openapi-specs/awesome-copilot-mcp.json

# 4. Generate tools
npx aitm ./agent/tools/generated \
  ./openapi-specs/awesome-copilot-mcp.json \
  -c ./openapi-ts.config.ts
# ✓ Creates agent/tools/generated/tool/*.ts
```

### Daily Development

```typescript
// Just import and use!
import {
  listAwesomeCopilotCollections,
  getToolsetTools,
  enableToolset,
} from "@/agent/tools/generated/tool";

// Example 1: List all collections
const collections = await listAwesomeCopilotCollections();
console.log(collections.data?.collections);

// Example 2: Get tools in a toolset
const tools = await getToolsetTools({
  path: { toolset_name: "github-issues" },
});

// Example 3: Enable a toolset
await enableToolset({
  path: { toolset_name: "github-issues" },
});
```

### When OpenAPI Changes

```bash
# Regenerate everything in 2 commands
python scripts/generate_awesome_copilot_openapi.py
npx aitm ./agent/tools/generated ./openapi-specs/awesome-copilot-mcp.json -c ./openapi-ts.config.ts

# All TypeScript code automatically updates!
```

## 🧪 Testing

```bash
# Run OpenAPI spec tests
pytest agent/tests/test_openapi_spec.py -v

# Test generated TypeScript (after generation)
# Create agent/tools/generated/__tests__/mcp-tools.test.ts
```

## 🔗 Integration Points

### 1. With Your Existing MCP Tools

```python
# These Python functions already exist:
# - mcp_awesome-copil_list_collections
# - mcp_github2_get_toolset_tools
# - mcp_github2_enable_toolset
#
# Just add FastAPI routes to expose them!
```

### 2. With Your Schema Crawler

```bash
# Extend to generate OpenAPI from UI components
cd agent-generator
npm run generate:schemas -- --format openapi
npx aitm ./src/components/generated ./schemas/ui-components.json
```

### 3. With Your Toolsets

```python
# Auto-generate OpenAPI from toolsets.json
# Already have the registry, just need converter
from toolset_manager import load_toolsets
spec = generate_openapi_from_toolsets("agent/toolsets.json")
```

## 🎨 Example Use Cases

### Use Case 1: Dynamic Tool Discovery

```typescript
// Discover what MCP tools are available
const collections = await listAwesomeCopilotCollections();

// Show in UI dropdown
collections.data?.collections.forEach((c) => {
  console.log(`${c.name}: ${c.description}`);
});
```

### Use Case 2: Collection-Based Agent

```typescript
// Build UI that lets users pick collections
const selectedCollection = "azure-cloud-development";

const tools = await getCollectionTools({
  path: { collection_name: selectedCollection },
});

// Show available agents/prompts/instructions
tools.data?.items.forEach((item) => {
  console.log(`${item.type}: ${item.title}`);
});
```

### Use Case 3: Enable Toolsets on Demand

```typescript
// User clicks "Enable GitHub Integration"
const result = await enableToolset({
  path: { toolset_name: "github-issues" },
});

if (result.data?.status === "success") {
  showNotification("GitHub tools enabled!");
}
```

## 🐛 Troubleshooting

### Error: `aitm: command not found`

```bash
npm install -g aitm
# Or use npx:
npx aitm ./agent/tools/generated ./openapi-specs/awesome-copilot-mcp.json
```

### Error: `Cannot find module '@hey-api/client-fetch'`

```bash
npm install @hey-api/client-fetch
```

### Error: `Module not found: Can't resolve './tool'`

```bash
# Generate tools first!
npx aitm ./agent/tools/generated ./openapi-specs/awesome-copilot-mcp.json
```

### Generated tools have wrong base URL

```typescript
// Update openapi-ts.config.ts
export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: "http://localhost:8000", // <-- Change this
});

// Regenerate
npx aitm ./agent/tools/generated ./openapi-specs/awesome-copilot-mcp.json -c ./openapi-ts.config.ts
```

## 📚 Next Steps

1. ✅ Generate OpenAPI spec
2. ✅ Generate tools with aitm
3. ⏳ Add FastAPI routes (see `scripts/integrate_aitm_tools.md`)
4. ⏳ Test integration
5. ⏳ Add to CI/CD pipeline
6. ⏳ Document for team

## 🔗 References

- **AI Tool Maker**: https://github.com/nihaocami/ai-tool-maker
- **Full Integration Guide**: [scripts/integrate_aitm_tools.md](./integrate_aitm_tools.md)
- **OpenAPI Spec**: https://spec.openapis.org/oas/v3.0.3
- **Your MCP Tools**: [agent/toolsets.json](../agent/toolsets.json)

---

**Questions?** Check the full guide: `scripts/integrate_aitm_tools.md`
