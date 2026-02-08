# Phoenix MCP Server Configuration Guide

This guide shows how to configure the Phoenix MCP Server for VSCode, Claude Desktop, and other AI assistants.

## Quick Links

- **Phoenix MCP Package**: [@arizeai/phoenix-mcp](https://www.npmjs.com/package/@arizeai/phoenix-mcp)
- **Phoenix Docs**: <https://docs.arize.com/phoenix/integrations/phoenix-mcp-server>
- **GitHub Repo**: <https://github.com/Arize-ai/phoenix/tree/main/js/packages/phoenix-mcp>

## What is Phoenix MCP Server?

The Phoenix MCP Server provides MCP tools for AI assistants to **query and analyze** data from your Phoenix instance:

- **Projects Management**: List and explore projects
- **Spans & Annotations**: Retrieve trace spans with filters
- **Prompts Management**: Create, list, update, and iterate on prompts
- **Datasets**: Explore datasets and synthesize examples
- **Experiments**: Pull experiment results and visualize them

**Note**: This is complementary to the instrumentation layer we implemented. Our custom instrumentation **sends traces TO Phoenix**, while the MCP server **queries data FROM Phoenix** for AI-assisted analysis.

## Configuration Examples

### 1. VSCode MCP Configuration

**File**: `.vscode/mcp.json`

```jsonc
{
  "servers": {
    "phoenix": {
      "command": "npx",
      "args": [
        "-y",
        "@arizeai/phoenix-mcp@latest",
        "--baseUrl",
        "http://localhost:6006",
        "--apiKey",
        "${env:PHOENIX_API_KEY}",
      ],
      "cwd": "${workspaceFolder}",
      "env": {
        "NODE_OPTIONS": "--no-warnings",
      },
    },
    "phoenix-docs": {
      "url": "https://arizeai-433a7140.mintlify.app/mcp",
    },
    "github-agentic-workflows": {
      "command": "gh",
      "args": ["aw", "mcp-server"],
      "cwd": "${workspaceFolder}",
    },
  },
}
```

### 2. Claude Desktop Configuration

**File**: `~/.config/claude/claude_desktop_config.json` (macOS/Linux) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "phoenix": {
      "command": "npx",
      "args": [
        "-y",
        "@arizeai/phoenix-mcp@latest",
        "--baseUrl",
        "http://localhost:6006",
        "--apiKey",
        "your-phoenix-api-key"
      ]
    },
    "phoenix-docs": {
      "url": "https://arizeai-433a7140.mintlify.app/mcp"
    }
  }
}
```

### 3. Cursor Configuration

**From Settings > MCP > Add new global MCP server**:

```json
{
  "mcpServers": {
    "phoenix": {
      "command": "npx",
      "args": [
        "-y",
        "@arizeai/phoenix-mcp@latest",
        "--baseUrl",
        "http://localhost:6006",
        "--apiKey",
        "your-phoenix-api-key"
      ]
    }
  }
}
```

**Or use Cursor Deeplink**: [Add to Cursor](https://cursor.sh/settings/mcp?add=phoenix)

### 4. Claude Code CLI

```bash
claude mcp add phoenix npx -y @arizeai/phoenix-mcp@latest \
  --baseUrl http://localhost:6006 \
  --apiKey your-api-key
```

## Configuration Parameters

| Parameter   | Description                          | Example                                                                    |
| ----------- | ------------------------------------ | -------------------------------------------------------------------------- |
| `--baseUrl` | Phoenix server endpoint              | `http://localhost:6006` (local) or `https://app.phoenix.arize.com` (cloud) |
| `--apiKey`  | Phoenix API key (optional for local) | Your Phoenix API key                                                       |
| `--project` | Default project name                 | `my-agent-project`                                                         |

## Using Environment Variables

You can avoid hardcoding the API key by using environment variables:

**.env file**:

```bash
PHOENIX_API_KEY=your-api-key-here
PHOENIX_ENDPOINT=http://localhost:6006
```

**VSCode MCP config with env vars**:

```jsonc
{
  "servers": {
    "phoenix": {
      "command": "npx",
      "args": [
        "-y",
        "@arizeai/phoenix-mcp@latest",
        "--baseUrl",
        "${env:PHOENIX_ENDPOINT}",
        "--apiKey",
        "${env:PHOENIX_API_KEY}",
      ],
      "env": {
        "PHOENIX_ENDPOINT": "http://localhost:6006",
        "PHOENIX_API_KEY": "${env:PHOENIX_API_KEY}",
      },
    },
  },
}
```

## Example MCP Queries

Once configured, you can ask your AI assistant:

### Prompts Management

- "What prompts do I have in Phoenix?"
- "Create a new prompt in Phoenix that classifies user intent"
- "Update my classification prompt with these new options"

### Experiments & Datasets

- "Summarize the Phoenix experiments run on my agent inputs dataset"
- "Visualize the results of my jailbreak dataset experiments"
- "Show me the latest experiment results for customer-support project"

### Spans & Traces

- "Show me failed spans from the last hour"
- "List all spans with status code error"
- "Get the most recent traces for my chatbot project"

### Projects

- "List all my Phoenix projects"
- "Show me details about the customer-support project"

## Verifying Installation

### VSCode

1. Restart VSCode after saving `.vscode/mcp.json`
2. Open GitHub Copilot Chat
3. Type `@phoenix` - you should see Phoenix MCP tools available
4. Ask: "List my Phoenix projects"

### Claude Desktop

1. Restart Claude Desktop after saving config
2. Check Settings > Developer > Connectors
3. Verify Phoenix server shows as "Connected"
4. Ask Claude: "What projects do I have in Phoenix?"

## Troubleshooting

### Server Not Connecting

```bash
# Test Phoenix is running
curl http://localhost:6006/healthz

# Test MCP server directly
npx @arizeai/phoenix-mcp@latest --baseUrl http://localhost:6006 --apiKey test
```

### VSCode Not Seeing Phoenix Tools

- Verify `.vscode/mcp.json` syntax is valid JSON
- Check VSCode Output > MCP Logs for errors
- Restart VSCode completely (close all windows)

### API Key Issues

- For local Phoenix: API key is optional, omit `--apiKey` parameter
- For Phoenix Cloud: Get API key from <https://app.phoenix.arize.com/settings>

## Architecture: Dual Purpose

```
┌─────────────────────────────────────────────────────────────┐
│                   AI Assistant (Claude/Copilot)             │
└─────────────────────────────────────────────────────────────┘
         │                                      │
         ▼                                      ▼
┌──────────────────────┐            ┌──────────────────────┐
│  Phoenix MCP Server  │            │  Our Instrumentation  │
│  (Query FROM)        │            │  (Send TO)            │
│  - List projects     │            │  - OpenTelemetry      │
│  - Get spans         │            │  - Copilot telemetry  │
│  - Manage prompts    │            │  - Custom tracers     │
│  - View experiments  │            │  - SDK instrumentors  │
└──────────────────────┘            └──────────────────────┘
         │                                      │
         │                                      ▼
         │                          ┌──────────────────────┐
         └─────────────────────────►│   Phoenix Server     │
                                    │   localhost:6006     │
                                    │   - OTLP Collector   │
                                    │   - GraphQL API      │
                                    │   - SQLite Storage   │
                                    └──────────────────────┘
```

**Both systems work together**:

1. **Our Implementation**: Instruments LLM calls and sends traces to Phoenix via OpenTelemetry
2. **Phoenix MCP Server**: Lets AI assistants query and analyze those traces via GraphQL

## Next Steps

1. ✅ Add Phoenix to VSCode MCP config
2. ✅ Test with AI assistant
3. See [PHOENIX_COPILOT_VERIFICATION.md](./PHOENIX_COPILOT_VERIFICATION.md) for testing the instrumentation layer
4. See [PHOENIX_AI_PROVIDER_INTEGRATION.md](./PHOENIX_AI_PROVIDER_INTEGRATION.md) for full architecture

## References

- [Phoenix MCP Server Docs](https://docs.arize.com/phoenix/integrations/phoenix-mcp-server)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Phoenix OpenTelemetry Tracing](https://docs.arize.com/phoenix/tracing/how-to-tracing/setup-tracing)
