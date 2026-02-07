# Architecture Update: VT Code MCP Integration

## Overview

This document describes the integration of VT Code as an MCP (Model Context Protocol) server into the ModMe GenUI workspace, enabling advanced code editing capabilities for the Python ADK agent.

## Architecture Before Integration

```
┌─────────────────────────────────────┐
│   Next.js Frontend (localhost:3000) │
│   - React 19 + Tailwind CSS 4      │
│   - CopilotKit UI Components        │
└──────────────┬──────────────────────┘
               │
               │ HTTP/WebSocket
               ▼
┌─────────────────────────────────────┐
│   Python ADK Agent (localhost:8000) │
│   - Google Agent Development Kit    │
│   - GenUI Tools (UI State Mgmt)     │
│   - FastAPI Server                  │
└─────────────────────────────────────┘
```

## Architecture After Integration

```
┌─────────────────────────────────────┐
│   Next.js Frontend (localhost:3000) │
│   - React 19 + Tailwind CSS 4      │
│   - CopilotKit UI Components        │
└──────────────┬──────────────────────┘
               │
               │ HTTP/WebSocket
               ▼
┌─────────────────────────────────────┐
│   Python ADK Agent (localhost:8000) │
│   - Google Agent Development Kit    │
│   - GenUI Tools (UI State Mgmt)     │
│   - Code Tools (VT Code MCP) ◄──────┼────┐
│   - FastAPI Server                  │    │
└─────────────────────────────────────┘    │
                                            │ MCP Protocol
                                            │ (HTTP JSON-RPC)
                                            ▼
                           ┌────────────────────────────────┐
                           │ VT Code MCP (localhost:8080)   │
                           │ - Semantic Code Editing        │
                           │ - Tree-sitter Parsing          │
                           │ - PTY Shell Sessions           │
                           │ - Symbol Search                │
                           └────────────────────────────────┘
```

## New Components

### 1. MCP Client (`agent/mcp_vtcode.py`)

- **Purpose**: HTTP client for communicating with VT Code's MCP server
- **Key Features**:
  - Async HTTP client using `httpx`
  - Singleton pattern for connection reuse
  - Type-safe requests/responses with Pydantic models
  - Methods for file editing, search, PTY sessions, symbol search

### 2. Health Check (`agent/health.py`)

- **Purpose**: Verify VT Code server availability
- **Key Features**:
  - Connection health checks
  - Retry logic for startup delays
  - User-friendly status messages

### 3. Code Tools (`agent/tools/code_tools.py`)

- **Purpose**: High-level tools that delegate to VT Code
- **Tools Implemented**:
  1. `edit_component` - Semantic editing of GenUI components
  2. `analyze_component_props` - TypeScript interface inspection
  3. `create_new_component` - Scaffold new components
  4. `run_build_check` - TypeScript compilation verification

### 4. Agent Integration (`agent/main.py`)

- **Updates**:
  - Import code tools
  - Register tools with LlmAgent
  - Add cleanup handler for MCP connections
  - Update system instructions with code editing capabilities

## Data Flow Example: Edit Component

```
User Request: "Add dark mode to StatCard"
    │
    ▼
ADK Agent LLM decides to use edit_component tool
    │
    ▼
edit_component(
    component_name="StatCard",
    changes_description="Add dark mode support"
)
    │
    ▼
VTCodeMCPClient.edit_file(
    path="src/components/registry/StatCard.tsx",
    edits=[{
        "type": "refactor",
        "instructions": "Add dark mode support"
    }]
)
    │
    ▼
HTTP POST to http://localhost:8080/mcp/invoke
{
    "tool": "edit_file",
    "params": {
        "path": "...",
        "edits": [...]
    }
}
    │
    ▼
VT Code processes request:
  1. Parses TypeScript with Tree-sitter
  2. Uses LLM to understand changes
  3. Applies semantic edits
  4. Returns updated code
    │
    ▼
Response flows back through layers
    │
    ▼
Agent returns success message to frontend
```

## Configuration

### Environment Variables

**Root `.env`:**

```bash
VTCODE_MCP_URL=http://localhost:8080
VTCODE_ENABLED=true
VTCODE_TIMEOUT_SECONDS=30
```

**Agent `.env`:**

```bash
VTCODE_MCP_URL=http://localhost:8080
VTCODE_ENABLED=true
```

### Startup Scripts

**Updated `package.json`:**

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:ui\" \"npm run dev:agent\" \"npm run dev:vtcode\"",
    "dev:vtcode": "vtcode --mcp-server --port 8080"
  }
}
```

## Security Considerations

1. **Local-Only Communication**: All MCP communication happens over localhost
2. **No External Network Access**: VT Code doesn't send data outside the machine
3. **Path Validation**: File paths are validated before operations
4. **Timeout Protection**: All HTTP requests have timeout limits
5. **Error Handling**: Graceful degradation if VT Code is unavailable

## Performance Characteristics

- **Connection Pooling**: Single HTTP client reused for all requests
- **Async Operations**: Non-blocking I/O throughout the stack
- **Caching**: VT Code caches parse trees for faster edits
- **Lazy Initialization**: MCP client created on first use

## Error Handling

### VT Code Not Running

- Tools return error status with descriptive messages
- Agent can gracefully continue with other tools
- Frontend displays helpful error to user

### Connection Timeout

- Configurable timeout (default 30s)
- Failed requests return error status
- No cascading failures

### Parse Errors

- VT Code validates syntax before edits
- Returns specific error messages
- Agent can retry or ask for clarification

## Future Enhancements

1. **Multi-File Edits**: Atomic changes across multiple files
2. **Undo/Redo**: Track edit history
3. **Diff Preview**: Show changes before applying
4. **Test Generation**: Auto-generate tests for new components
5. **Refactoring**: Large-scale code restructuring
6. **Code Analysis**: Security scanning, best practices

## Testing Strategy

### Unit Tests (Future)

- Mock VT Code server responses
- Test error handling
- Validate data transformations

### Integration Tests (Future)

- Spin up real VT Code instance
- Test full workflow
- Verify file changes

### CI/CD Integration

- Existing CI workflow (`uv sync`) will install new dependencies
- Syntax validation runs on every commit
- Build checks verify no breaking changes

## Rollback Plan

If issues arise, VT Code integration can be disabled by:

1. Setting `VTCODE_ENABLED=false` in `.env`
2. Removing tool registration from `agent/main.py`
3. Agent falls back to UI-only tools

The integration is designed to be non-invasive and optional.

## Documentation

- **Main Guide**: `docs/VT_CODE_INTEGRATION.md`
- **Architecture**: This document
- **Copilot Instructions**: `copilot-instructions.md` (updated)
- **Environment Examples**: `.env.example`, `agent/.env.example`

## Dependencies Added

**Python** (`agent/pyproject.toml`):

- `httpx>=0.27.0` - Async HTTP client
- `pydantic>=2.0.0` - Type validation (upgraded from v1)

## Summary

This integration enables the ModMe GenUI agent to perform sophisticated code operations by delegating to VT Code's MCP server. The architecture maintains the local-first, privacy-focused principles while adding powerful code editing capabilities. The integration is optional, non-invasive, and can be disabled without affecting core functionality.
