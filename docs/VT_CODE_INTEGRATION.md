# VT Code MCP Integration

## Overview

This project integrates VT Code as an MCP (Model Context Protocol) server to enable advanced code editing and analysis capabilities in the GenUI agent workflow.

## Architecture

```
ModMe GenUI Agent (Python ADK)
    ↓ (MCP Protocol)
VT Code MCP Server (Rust)
    ↓
Code Operations (Edit/Search/Execute)
```

## Setup

### 1. Install VT Code

```bash
# Via cargo
cargo install vtcode

# Via npm
npm install -g vtcode

# Via homebrew (macOS)
brew install vtcode
```

### 2. Start VT Code MCP Server

```bash
vtcode --mcp-server --port 8080
```

Or configure in `vtcode.toml`:

```toml
[mcp]
enabled = true
startup_timeout_seconds = 60

[[mcp.server]]
port = 8080
host = "localhost"
```

### 3. Configure ModMe Agent

Add to `.env`:

```bash
VTCODE_MCP_URL=http://localhost:8080
VTCODE_ENABLED=true
```

### 4. Start Both Services

```bash
# Terminal 1: VT Code
vtcode --mcp-server

# Terminal 2: ModMe
npm run dev
```

## Usage Examples

### Edit a Component

```python
# Agent automatically calls VT Code
result = await edit_component(
    component_name="StatCard",
    changes_description="Add dark mode support with tailwind classes"
)
```

### Create New Component

```python
result = await create_new_component(
    component_name="GaugeChart",
    component_type="chart",
    props_schema={
        "value": "number",
        "max": "number",
        "label": "string"
    }
)
```

### Analyze Component

```python
props = await analyze_component_props("DataTable")
# Returns TypeScript interface definition
```

### Run Build Check

```python
result = await run_build_check()
# Returns TypeScript compilation results
```

## Troubleshooting

### VT Code Not Running

Check if the server is accessible:

```bash
curl http://localhost:8080/health
```

### Connection Timeout

Increase timeout in `.env`:

```bash
VTCODE_TIMEOUT_SECONDS=60
```

### MCP Protocol Errors

Check VT Code logs:

```bash
vtcode --mcp-server --log-level debug
```

## Security

- VT Code runs locally (localhost only)
- No data leaves your machine
- MCP protocol validates all tool calls
- Agent can only access allowed file paths

## Performance

- VT Code caches Tree-sitter parse trees
- Semantic editing is faster than regex replacements
- PTY sessions are reused across tool calls

## References

- [VT Code GitHub](https://github.com/vinhnx/vtcode)
- [MCP Specification](https://modelcontextprotocol.io/specification/)
- [ModMe Architecture](../copilot-instructions.md)
