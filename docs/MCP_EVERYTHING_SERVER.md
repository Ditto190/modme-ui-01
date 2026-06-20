# MCP "Everything" Server Integration

## Overview

The **MCP "Everything" Server** is a comprehensive reference implementation from the official Model Context Protocol servers repository. It demonstrates **all features** of the MCP protocol and serves as an ideal starter/learning server for this project.

**Repository**: [`modelcontextprotocol/servers`](https://github.com/modelcontextprotocol/servers/tree/main/src/everything)  
**Package**: `@modelcontextprotocol/server-everything`

## Why Use This Server?

### Purpose

- **Educational**: Shows how to implement tools, resources, prompts, sampling, logging, and more
- **Testing**: Useful for testing MCP clients and validating protocol implementations
- **Reference**: Provides working examples of every MCP capability
- **Foundation**: Can be forked/extended to build custom MCP servers for this project

### Features Demonstrated

1. **Tools** (callable functions):
   - Simple data operations
   - Long-running operations with progress notifications
   - Environment variable inspection
   - Server metadata retrieval

2. **Resources** (data sources):
   - Static file resources
   - Dynamic resource templates with URI parameters
   - Resource subscriptions with change notifications
   - File-based resource loading from `docs/`

3. **Prompts** (conversation templates):
   - Simple text prompts
   - Parameterized prompts with arguments
   - Completion support for prompt arguments

4. **Logging**:
   - Simulated logging at multiple levels (debug, info, warning, error, etc.)
   - Client-controlled log levels via `logging/setLevel`

5. **Sampling** (LLM requests):
   - Server can request completions from connected clients
   - Demonstrates client-server LLM interaction patterns

6. **Roots Protocol**:
   - Demonstrates workspace context awareness
   - Shows how servers can access client-provided roots

7. **Multi-Transport Support**:
   - **stdio** (standard input/output) — default, for local integrations
   - **HTTP+SSE** (Server-Sent Events) — for browser/HTTP clients
   - **Streamable HTTP** — modern HTTP-based transport

## Configuration

### VS Code Integration (Recommended)

Add to `.vscode/mcp.json` (workspace config):

```json
{
  "servers": {
    "everything": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"]
    }
  }
}
```

Or use the one-click install button:  
[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-NPM-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=everything&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40modelcontextprotocol%2Fserver-everything%22%5D%7D)

### User-Level Configuration

Add to your user `mcp.json`:

1. Open Command Palette: `Ctrl+Shift+P`
2. Run: `MCP: Open User Configuration`
3. Add the server config above

### Starter Scripts

Use the provided starter scripts in `.copilot/mcp-servers/`:

**PowerShell** (Windows):

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .copilot\mcp-servers\start-everything.ps1
```

**Bash** (Linux/macOS):

```bash
bash .copilot/mcp-servers/start-everything.sh
```

Or trigger the workspace task `Start MCP servers if stopped` to auto-start.

## Architecture Reference

The everything server follows a modular architecture:

```
everything/
├── server/          # Core server factory
│   ├── index.ts     # McpServer setup, capabilities, registrations
│   └── logging.ts   # Simulated logging implementation
├── tools/           # Tool implementations (one file per tool)
├── resources/       # Resource implementations
├── prompts/         # Prompt implementations
├── transports/      # Transport managers (stdio, sse, streamableHttp)
├── docs/            # Server instructions and documentation
└── index.ts         # CLI entry point
```

**Key Patterns**:

- **Server Factory**: Creates `McpServer` with capabilities and registers features
- **Registration**: Tools/resources/prompts registered during server initialization
- **Transport Separation**: Transports are separate entry points (stdio, HTTP, etc.)
- **Documentation Shipping**: `docs/` folder is copied to `dist/` during build
- **Multi-Client Support**: Server tracks per-session state for subscriptions/logging

See [`docs/architecture.md`](https://github.com/modelcontextprotocol/servers/blob/main/src/everything/docs/architecture.md) in the upstream repo for full details.

## Usage Patterns

### Exploring Available Tools

When connected via VS Code or another MCP client, the server exposes tools that can be called by the LLM:

- `get-env` — Returns all environment variables
- `get-roots-list` — Returns roots provided by the client
- `trigger-long-running-operation` — Demonstrates progress notifications
- `toggle-simulated-logging` — Starts/stops simulated log messages

### Querying Resources

Resources are exposed via URIs:

- `resource://instructions` — Server instructions (from `docs/instructions.md`)
- `resource://file/{filename}` — Dynamic file resources

Clients can read resources to provide context to the LLM.

### Using Prompts

Prompts provide conversation templates:

- `simple-prompt` — Basic prompt example
- `complex-prompt` — Parameterized prompt with arguments

## Extending This Server

To build custom functionality:

1. **Fork the repository**: Clone [`modelcontextprotocol/servers`](https://github.com/modelcontextprotocol/servers)
2. **Navigate to `src/everything`**: `cd src/everything`
3. **Install dependencies**: `npm install`
4. **Add custom tools**: Create new files in `tools/` following existing patterns
5. **Register tools**: Update `tools/index.ts` to register your new tools
6. **Build**: `npm run build`
7. **Run locally**: `npm run start:stdio` or `node dist/index.js stdio`

### Adding a Custom Tool

Example: Add `tools/my-tool.ts`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const name = "my-tool";
const config = {
  title: "My Custom Tool",
  description: "Does something useful",
  inputSchema: { param: "string" },
};

export const registerMyTool = (server: McpServer) => {
  server.registerTool(name, config, async (args): Promise<CallToolResult> => {
    return {
      content: [
        {
          type: "text",
          text: `You called my-tool with: ${args.param}`,
        },
      ],
    };
  });
};
```

Register in `tools/index.ts`:

```typescript
import { registerMyTool } from "./my-tool.js";

export const registerTools = (server: McpServer) => {
  // ... existing registrations ...
  registerMyTool(server);
};
```

## Integration with This Project

### Current Setup

- **Starter scripts** are in `.copilot/mcp-servers/start-everything.{ps1,sh}`
- **Auto-start task**: The workspace task `Start MCP servers if stopped` will launch the everything server if the script is present
- **Logs**: Written to `.logs/mcp-start-everything.log`

### Recommended Workflow

1. **Start the server**: Run the workspace task or starter script
2. **Open GitHub Copilot Chat**: Open the chat panel in VS Code
3. **Test tools**: Ask Copilot to call tools like `get-env` or `get-roots-list`
4. **Explore resources**: Ask Copilot to read `resource://instructions`
5. **Try prompts**: Use prompts to see templated conversations
6. **Observe logs**: Check `.logs/` for server output

### Building Custom Servers

Use the everything server as a template to build custom MCP servers for this project's specific needs:

- **Agent toolsets**: Create tools that interact with `agent/toolset_manager.py`
- **GenUI operations**: Create tools to manipulate the UI canvas state
- **Data access**: Create resources that expose project data
- **Workflow prompts**: Create prompts for common development workflows

## References

- **Official README**: <https://github.com/modelcontextprotocol/servers/blob/main/src/everything/README.md>
- **Architecture**: <https://github.com/modelcontextprotocol/servers/blob/main/src/everything/docs/architecture.md>
- **Features**: <https://github.com/modelcontextprotocol/servers/blob/main/src/everything/docs/features.md>
- **MCP Specification**: <https://modelcontextprotocol.io>
- **TypeScript MCP SDK**: <https://github.com/modelcontextprotocol/typescript-sdk>

## Next Steps

1. **Run the server**: Use the starter scripts to launch it
2. **Explore the codebase**: Clone the repo and read the source
3. **Build custom features**: Fork and extend with project-specific tools
4. **Integrate with agents**: Connect to the Python ADK agent or CopilotKit runtime
5. **Test thoroughly**: Use MCP Inspector (`npx @modelcontextprotocol/inspector`) to debug

---

**Note**: The everything server is a **reference implementation** for learning and testing. For production use, build focused servers with only the tools/resources needed for specific tasks.
