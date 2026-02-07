# VSCode Extension for Copilot Telemetry

**Last Updated**: February 8, 2026

## Overview

This guide explains how to create a VSCode extension that captures GitHub Copilot telemetry and forwards it to the Phoenix observability platform.

**What it does**:

- Captures Copilot chat requests and responses
- Tracks code completion acceptances
- Sends telemetry to Phoenix via HTTP endpoint
- Enables full observability for Copilot interactions

---

## Architecture

```
┌───────────────────────────────────────────────────┐
│ VSCode with GitHub Copilot Extension              │
│                                                   │
│  User ──> Copilot Chat ──> LLM Response          │
│              │                    │               │
│              │                    │               │
│              ▼                    ▼               │
│        [VSCode Events]      [VSCode Events]       │
│              │                    │               │
│              └────────┬───────────┘               │
│                       │                           │
│                       ▼                           │
│            [Custom Extension]                     │
│             (copilot-telemetry)                   │
└───────────────────────┬───────────────────────────┘
                        │
                        │ HTTP POST /api/telemetry/copilot
                        │ {event_type, data, request_id}
                        ▼
┌───────────────────────────────────────────────────┐
│ Python Agent (FastAPI)                            │
│  http://localhost:8000                            │
│                                                   │
│  ┌─────────────────────────────────────┐         │
│  │ VSCodeCopilotTelemetryAdapter       │         │
│  │  - Creates OpenTelemetry spans      │         │
│  │  - Adds OpenInference attributes    │         │
│  │  - Exports to Phoenix               │         │
│  └──────────┬──────────────────────────┘         │
└─────────────┼────────────────────────────────────┘
              │
              │ OTLP
              ▼
┌───────────────────────────────────────────────────┐
│ Phoenix Server (http://localhost:6006)            │
│  - Stores traces in SQLite/PostgreSQL             │
│  - Provides web UI for visualization              │
└───────────────────────────────────────────────────┘
```

---

## Prerequisites

- Node.js 18+ and npm
- VSCode 1.85+
- GitHub Copilot extension installed
- Python agent running on localhost:8000

---

## Quick Start

### Step 1: Create Extension

```bash
# Install Yeoman and VS Code Extension generator
npm install -g yo generator-code

# Generate extension
yo code

# Select:
# - New Extension (TypeScript)
# - Name: copilot-telemetry
# - Identifier: copilot-telemetry
# - Description: Captures Copilot telemetry for Phoenix observability
# - Enable TypeScript: Yes
# - Initialize git: Yes
```

### Step 2: Install Dependencies

```bash
cd copilot-telemetry
npm install axios
npm install @types/vscode --save-dev
```

### Step 3: Update `package.json`

```json
{
  "name": "copilot-telemetry",
  "displayName": "Copilot Telemetry",
  "description": "Captures GitHub Copilot telemetry for Phoenix observability",
  "version": "0.1.0",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Other"],
  "activationEvents": ["onStartupFinished"],
  "main": "./out/extension.js",
  "contributes": {
    "configuration": {
      "title": "Copilot Telemetry",
      "properties": {
        "copilotTelemetry.agentUrl": {
          "type": "string",
          "default": "http://localhost:8000",
          "description": "Phoenix agent URL"
        },
        "copilotTelemetry.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable Copilot telemetry capture"
        },
        "copilotTelemetry.logToConsole": {
          "type": "boolean",
          "default": false,
          "description": "Log telemetry events to console"
        }
      }
    },
    "commands": [
      {
        "command": "copilotTelemetry.toggleEnabled",
        "title": "Copilot Telemetry: Toggle Enable/Disable"
      }
    ]
  },
  "dependencies": {
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "^20.x",
    "typescript": "^5.3.0"
  }
}
```

### Step 4: Implement Extension (`src/extension.ts`)

```typescript
import * as vscode from "vscode";
import axios, { AxiosError } from "axios";
import { v4 as uuidv4 } from "uuid";

let enabled = true;
let agentUrl = "http://localhost:8000";
let logToConsole = false;

// Store pending requests to match responses
const pendingRequests = new Map<string, string>();

export function activate(context: vscode.ExtensionContext) {
  console.log("Copilot Telemetry extension activated");

  // Load configuration
  const config = vscode.workspace.getConfiguration("copilotTelemetry");
  enabled = config.get("enabled", true);
  agentUrl = config.get("agentUrl", "http://localhost:8000");
  logToConsole = config.get("logToConsole", false);

  // Register toggle command
  const toggleCommand = vscode.commands.registerCommand("copilotTelemetry.toggleEnabled", () => {
    enabled = !enabled;
    vscode.window.showInformationMessage(`Copilot Telemetry ${enabled ? "enabled" : "disabled"}`);
  });

  // Listen for Copilot chat interactions
  setupCopilotListeners(context);

  context.subscriptions.push(toggleCommand);
}

function setupCopilotListeners(context: vscode.ExtensionContext) {
  // Note: VSCode doesn't expose official Copilot telemetry APIs yet
  // This is a conceptual implementation

  // Listen for chat panel visibility changes
  const chatPanelWatcher = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    if (!enabled || !editor) return;

    // Check if Copilot chat is active
    // In real implementation, you'd hook into Copilot's actual events
    // This is a placeholder showing the pattern

    const selection = editor.selection;
    if (!selection.isEmpty) {
      // User has selected code - potential Copilot interaction
      logDebug("Selection detected - potential Copilot use case");
    }
  });

  // Listen for text changes that might be Copilot completions
  const textChangeWatcher = vscode.workspace.onDidChangeTextDocument(async (event) => {
    if (!enabled) return;

    // Detect if change was from Copilot
    // In real implementation, check event source
    if (isCopilotCompletion(event)) {
      await logCompletionAccepted(event);
    }
  });

  context.subscriptions.push(chatPanelWatcher, textChangeWatcher);
}

function isCopilotCompletion(event: vscode.TextDocumentChangeEvent): boolean {
  // In real implementation, check if change came from Copilot
  // This requires hooking into Copilot's internal events or using
  // undocumented APIs

  // Heuristic: Large insertions that aren't from user typing
  for (const change of event.contentChanges) {
    if (change.text.length > 20 && change.text.includes("\n")) {
      return true;
    }
  }
  return false;
}

async function logChatRequest(requestId: string, userQuery: string, context?: any): Promise<void> {
  try {
    const document = vscode.window.activeTextEditor?.document;

    await axios.post(`${agentUrl}/api/telemetry/copilot`, {
      event_type: "chat_request",
      request_id: requestId,
      data: {
        user_query: userQuery,
        context: {
          file_path: document?.fileName,
          language: document?.languageId,
          workspace: vscode.workspace.name,
          ...context,
        },
      },
    });

    logDebug(`Logged chat request: ${requestId}`);
  } catch (error) {
    handleError("chat request", error);
  }
}

async function logChatResponse(
  requestId: string,
  agentResponse: string,
  model: string = "gpt-4o",
  inputTokens?: number,
  outputTokens?: number
): Promise<void> {
  try {
    await axios.post(`${agentUrl}/api/telemetry/copilot`, {
      event_type: "chat_response",
      request_id: requestId,
      data: {
        agent_response: agentResponse,
        model: model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
    });

    logDebug(`Logged chat response: ${requestId}`);
  } catch (error) {
    handleError("chat response", error);
  }
}

async function logCompletionAccepted(event: vscode.TextDocumentChangeEvent): Promise<void> {
  try {
    const document = event.document;
    const change = event.contentChanges[0];

    await axios.post(`${agentUrl}/api/telemetry/copilot`, {
      event_type: "completion_accepted",
      data: {
        completion_text: change.text,
        language: document.languageId,
        file_path: document.fileName,
        input_tokens: Math.ceil(change.text.length / 4), // Rough estimate
        output_tokens: Math.ceil(change.text.length / 4),
      },
    });

    logDebug(`Logged completion for ${document.fileName}`);
  } catch (error) {
    handleError("completion", error);
  }
}

function handleError(operation: string, error: any) {
  const message = error instanceof AxiosError ? error.message : String(error);

  console.error(`[Copilot Telemetry] Error logging ${operation}:`, message);

  // Don't show error messages to user unless logging is enabled
  if (logToConsole) {
    vscode.window.showWarningMessage(`Copilot Telemetry: Failed to log ${operation}`);
  }
}

function logDebug(message: string) {
  if (logToConsole) {
    console.log(`[Copilot Telemetry] ${message}`);
  }
}

export function deactivate() {
  console.log("Copilot Telemetry extension deactivated");
  pendingRequests.clear();
}
```

### Step 5: Build and Install

```bash
# Compile TypeScript
npm run compile

# Package extension
npm install -g vsce
vsce package

# Install in VSCode
code --install-extension copilot-telemetry-0.1.0.vsix
```

### Step 6: Configure Extension

1. Open VSCode settings (Ctrl+,)
2. Search for "Copilot Telemetry"
3. Configure:
   - **Agent URL**: `http://localhost:8000` (or your agent URL)
   - **Enabled**: `true`
   - **Log to Console**: `false` (set to `true` for debugging)

---

## Testing

### Test 1: Verify Extension Activation

1. Open VSCode Developer Console (Help → Toggle Developer Tools)
2. Should see: `"Copilot Telemetry extension activated"`

### Test 2: Test Telemetry Endpoint

```bash
# Test ping to agent
curl -X POST http://localhost:8000/api/telemetry/copilot \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "chat_request",
    "request_id": "test-123",
    "data": {
      "user_query": "Hello test",
      "context": {}
    }
  }'
```

### Test 3: Verify Traces in Phoenix

1. Open Phoenix UI: [http://localhost:6006](http://localhost:6006)
2. Use Copilot in VSCode
3. Check Phoenix for new traces with `llm.provider = "github-copilot"`

---

## Important Limitations

⚠️ **GitHub Copilot does not currently expose official telemetry APIs**

This guide provides a **conceptual implementation**. In practice, you would need to:

1. **Use undocumented VSCode APIs** (not recommended, may break)
2. **Wait for official Copilot telemetry APIs** (GitHub/Microsoft may add these)
3. **Use alternative approaches**:
   - Proxy Copilot network requests
   - Hook into VSCode extension host
   - Use language server protocol monitoring

### Alternative Approaches

**Option 1: Network Proxy**

```typescript
// Intercept Copilot's HTTP requests
import { Agent } from "https";

const originalAgent = (global as any).https.globalAgent;
const proxyAgent = new Agent({
  // Intercept requests to copilot.github.com
});
```

**Option 2: Language Server Monitoring**

```typescript
// Monitor LSP traffic between VSCode and Copilot
const client = new LanguageClient(...);
client.onNotification('$/copilot/completion', (params) => {
    // Log completion event
});
```

**Option 3: Wait for Official APIs**

- Track: https://github.com/microsoft/vscode/issues
- Subscribe to Copilot extension changelog

---

## Security Considerations

1. **API Key Storage**: Never log Copilot API keys
2. **Code Privacy**: Sanitize code snippets before logging
3. **Local Only**: Keep telemetry local (don't send to external services)
4. **User Consent**: Add disclaimer that telemetry is collected
5. **Data Retention**: Configure Phoenix to rotate old traces

### Recommended Settings

```json
{
  "copilotTelemetry.sanitizeCode": true,
  "copilotTelemetry.maxCodeLength": 500,
  "copilotTelemetry.excludeFiles": ["*.env", "*.key", "secrets/*"]
}
```

---

## Production Deployment

### Package Extension

```bash
# Build production
npm run compile

# Package
vsce package

# Publish to marketplace (optional)
vsce publish
```

###Install Across Team

**Option 1: Manual Install**

```bash
code --install-extension copilot-telemetry-0.1.0.vsix
```

**Option 2: Shared Extension**
Place `.vsix` in shared folder, document installation steps

**Option 3: Private Registry**
Host on internal VSCode marketplace

---

## Troubleshooting

### Extension Not Activating

**Check**:

1. VSCode version >= 1.85
2. Extension appears in Extensions panel
3. Developer console for errors

**Solution**:

```bash
# Reload VSCode
Ctrl+Shift+P → "Developer: Reload Window"
```

### Telemetry Not Sent

**Check**:

1. Agent running: `curl http://localhost:8000/health`
2. Endpoint accessible: `curl http://localhost:8000/api/telemetry/copilot`
3. Extension enabled: Settings → Copilot Telemetry → Enabled

**Debug**:

```bash
# Enable console logging
# Settings → Copilot Telemetry → Log to Console: true

# Check Developer Console
# Help → Toggle Developer Tools
```

### Copilot Events Not Captured

**Issue**: Official APIs not available

**Workaround**:

1. Use text change heuristics
2. Monitor LSP messages
3. Wait for official API release

---

## Future Enhancements

1. **Real Copilot API Integration** (when available)
2. **Token Usage Tracking** (from Copilot API)
3. **Cost Estimation** (based on token usage)
4. **Multi-User Support** (team-wide telemetry)
5. **Dashboard Integration** (Phoenix custom widgets)

---

## Related Documentation

- [PHOENIX_AI_PROVIDER_INTEGRATION.md](./PHOENIX_AI_PROVIDER_INTEGRATION.md) - Main integration guide
- [agent/observability/vscode_copilot_telemetry.py](../agent/observability/vscode_copilot_telemetry.py) - Python adapter
- [Phoenix Documentation](https://docs.arize.com/phoenix)

---

**Questions?** Open an issue or check the troubleshooting section.
