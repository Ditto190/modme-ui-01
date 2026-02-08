# Phoenix CLI Quick Reference

**Project Created**: ✅ `github-copilot` (ID: `UHJvamVjdDoy`)
**Updated**: `.env` now contains `PHOENIX_PROJECT=github-copilot`

## What Just Happened

You tried `python -m phoenix.cli project create` which **doesn't exist**. Phoenix has:

- ✅ **TypeScript CLI** (`@arizeai/phoenix-cli`) - for terminal commands
- ✅ **Python Client SDK** (`phoenix.client.Client`) - for programmatic access
- ✅ **REST API** - for direct HTTP calls
- ❌ **No Python CLI module** - `python -m phoenix.cli` is not valid

## Correct Commands Reference

### List Projects

```bash
# TypeScript CLI (recommended for terminal)
npx @arizeai/phoenix-cli projects --endpoint http://localhost:6006

# PowerShell (REST API)
Invoke-WebRequest -Uri "http://localhost:6006/v1/projects" | ConvertFrom-Json

# Python SDK
python scripts/phoenix_project_manager.py
```

### Create Project

```powershell
# PowerShell (REST API) - What we just used
Invoke-WebRequest -Uri "http://localhost:6006/v1/projects" -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"name":"my-project","description":"My project description"}'
```

```python
# Python SDK
from phoenix.client import Client
client = Client(endpoint="http://localhost:6006")
project = client.projects.create(
    name="my-project",
    description="My project description"
)
```

### Fetch Traces

```bash
# TypeScript CLI - get traces from your project
npx @arizeai/phoenix-cli traces --project github-copilot --limit 10

# Export to directory
npx @arizeai/phoenix-cli traces ./traces --project github-copilot --limit 50

# Get specific trace details
npx @arizeai/phoenix-cli trace <trace-id>
```

### VSCode Copilot Chat Integration

```
# Once VSCode is reloaded with MCP configured:
@phoenix list projects
@phoenix get spans --project github-copilot --limit 10
@phoenix get trace <trace-id>
```

## Environment Variables

Your `.env` now has:

```env
PHOENIX_ENDPOINT=http://localhost:6006
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006/v1/traces
PHOENIX_PROJECT=github-copilot
OTEL_SERVICE_NAME=github-copilot
ENABLE_PHOENIX=true
```

## Next Steps

1. **Reload VSCode** to activate MCP Phoenix tools
   - Press `Ctrl+Shift+P` → "Developer: Reload Window"

2. **Test MCP Integration**:
   - Open GitHub Copilot Chat
   - Type `@phoenix` and see if Phoenix tools appear

3. **Send Test Trace** (if you have Python SDK installed):

   ```bash
   cd d:\Github_Projects\Modme_2026\modme-ui-01-test-worktree
   python scripts/check_phoenix.py
   ```

4. **View Traces**:
   - Open http://localhost:6006
   - Select "github-copilot" project
   - Watch for traces arriving

## Installation Requirements

### For TypeScript CLI (Already works via npx):

```bash
npm install -g @arizeai/phoenix-cli
```

### For Python Client SDK (Optional):

```bash
pip install arize-phoenix
# or in your venv:
.venv\Scripts\python.exe -m pip install arize-phoenix
```

## Common Commands Cheat Sheet

| Task             | Command                                                    |
| ---------------- | ---------------------------------------------------------- |
| List projects    | `npx @arizeai/phoenix-cli projects`                        |
| Create project   | PowerShell REST API (see above)                            |
| Fetch traces     | `npx @arizeai/phoenix-cli traces --project github-copilot` |
| View trace       | `npx @arizeai/phoenix-cli trace <id>`                      |
| Export traces    | `npx @arizeai/phoenix-cli traces ./output --limit 100`     |
| List datasets    | `npx @arizeai/phoenix-cli datasets`                        |
| View experiments | `npx @arizeai/phoenix-cli experiments --dataset <name>`    |

## Why the Confusion?

The documentation mentions "Phoenix CLI" but that refers to the **TypeScript package** `@arizeai/phoenix-cli`, NOT a Python module. The Python package (`arize-phoenix`) provides:

- Client SDK for programmatic access
- Auto-instrumentation for LLM frameworks
- No CLI interface

For command-line operations, use:

1. TypeScript CLI (`npx @arizeai/phoenix-cli`)
2. PowerShell/curl with REST API
3. Python scripts using Client SDK

## Resources

- TypeScript CLI Docs: https://arize.com/docs/phoenix/sdk-api-reference/typescript/arizeai-phoenix-cli
- Python Client SDK: https://arize.com/docs/phoenix/sdk-api-reference/python/arize-phoenix-client
- REST API Reference: https://arize.com/docs/phoenix/sdk-api-reference/rest-api
- MCP Server: https://github.com/Arize-ai/phoenix/tree/main/js/packages/phoenix-mcp
