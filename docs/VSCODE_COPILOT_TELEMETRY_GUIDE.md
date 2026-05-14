# VSCode GitHub Copilot Telemetry Integration Guide

**Purpose**: Capture GitHub Copilot chat conversations and code completions via VSCode telemetry API and log to GreptimeDB for observability.

## Architecture Overview

```
VSCode → VSCode Extension → FastAPI Endpoint → GreptimeDB
(Copilot)   (Telemetry)      (Agent Server)    (Time-Series DB)
```

**Flow**:

1. User interacts with GitHub Copilot Chat in VSCode
2. Custom VSCode extension captures telemetry events
3. Extension sends HTTP POST to FastAPI endpoint `/api/telemetry/copilot`
4. Python adapter logs to GreptimeDB `agent_conversations` table

---

## Prerequisites

- **VSCode**: Version 1.85+ (with Copilot installed)
- **GitHub Copilot**: Active subscription
- **Python Agent**: Running on `localhost:8000` with FastAPI
- **GreptimeDB**: Running on `localhost:4000-4004`
- **Node.js**: 18+ (for VSCode extension development)

---

## Step 1: Create VSCode Extension

### 1.1 Generate Extension Scaffold

```bash
cd .vscode/extensions
npx @vscode/create-extension copilot-telemetry-logger

# Choose:
# - Extension type: TypeScript
# - Initialize git: Yes
```

### 1.2 Implement Extension Code

Edit `.vscode/extensions/copilot-telemetry-logger/src/extension.ts`:

```typescript
import * as vscode from "vscode";
import axios from "axios";

const AGENT_URL = "http://localhost:8000/api/telemetry/copilot";

export function activate(context: vscode.ExtensionContext) {
  console.log("Copilot Telemetry Logger activated");

  // Track chat requests
  const chatRequestDisposable = vscode.chat.onDidChatRequest(async (e) => {
    console.log("Copilot chat request:", e);

    try {
      await axios.post(AGENT_URL, {
        event_type: "chat_request",
        request_id: e.request.id,
        conversation_id: e.conversation?.id,
        data: {
          user_query: e.request.prompt,
          context: {
            file_path: vscode.window.activeTextEditor?.document.uri.fsPath,
            language: vscode.window.activeTextEditor?.document.languageId,
            selection: vscode.window.activeTextEditor?.selection,
          },
        },
      });
    } catch (error) {
      console.error("Failed to log chat request:", error);
    }
  });

  // Track chat responses
  const chatResponseDisposable = vscode.chat.onDidChatResponse(async (e) => {
    console.log("Copilot chat response:", e);

    try {
      await axios.post(AGENT_URL, {
        event_type: "chat_response",
        request_id: e.request.id,
        conversation_id: e.conversation?.id,
        data: {
          agent_response: e.response.text,
          model: e.response.model || "gpt-4o",
          tokens_used: e.response.metadata?.tokens,
          latency_ms: Date.now() - e.request.timestamp,
        },
      });
    } catch (error) {
      console.error("Failed to log chat response:", error);
    }
  });

  // Track code completion acceptances
  const completionDisposable = vscode.workspace.onDidChangeTextDocument(async (e) => {
    // Check if change was from Copilot completion
    if (e.reason === vscode.TextDocumentChangeReason.Undo) return;

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== e.document) return;

    for (const change of e.contentChanges) {
      if (change.text.length > 10) {
        // Likely a completion
        try {
          await axios.post(AGENT_URL, {
            event_type: "completion_accepted",
            data: {
              completion_text: change.text,
              language: e.document.languageId,
              file_path: e.document.uri.fsPath,
            },
          });
        } catch (error) {
          console.error("Failed to log completion:", error);
        }
      }
    }
  });

  context.subscriptions.push(chatRequestDisposable, chatResponseDisposable, completionDisposable);
}

export function deactivate() {}
```

### 1.3 Update package.json

Add to `.vscode/extensions/copilot-telemetry-logger/package.json`:

```json
{
  "activationEvents": ["onStartupFinished"],
  "contributes": {
    "configuration": {
      "title": "Copilot Telemetry Logger",
      "properties": {
        "copilotTelemetry.agentUrl": {
          "type": "string",
          "default": "http://localhost:8000/api/telemetry/copilot",
          "description": "Agent server endpoint"
        }
      }
    }
  },
  "dependencies": {
    "axios": "^1.6.0"
  }
}
```

### 1.4 Build and Install Extension

```bash
cd .vscode/extensions/copilot-telemetry-logger
npm install
npm run compile

# Install in VSCode
code --install-extension .
```

---

## Step 2: Enable FastAPI Endpoint in Agent

### 2.1 Add Telemetry Route to agent/main.py

```python
from observability.vscode_copilot_telemetry import create_fastapi_endpoint

# ... existing imports ...

# After app = CopilotKit(...) line:
app.include_router(create_fastapi_endpoint())
```

### 2.2 Restart Agent Server

```bash
npm run dev:agent
```

Verify endpoint is live:

```bash
curl http://localhost:8000/api/telemetry/copilot
```

---

## Step 3: Test End-to-End

### 3.1 Open VSCode with Extension

1. Restart VSCode
2. Check extension is active: View → Output → "Copilot Telemetry Logger"

### 3.2 Generate Telemetry Events

1. Open Copilot Chat (Ctrl+Shift+I)
2. Ask a question: "How do I use async/await in Python?"
3. Accept a code completion suggestion

### 3.3 Verify in GreptimeDB

```bash
curl -X POST http://localhost:4000/v1/sql \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM agent_conversations WHERE provider = '\''copilot'\'' ORDER BY timestamp DESC LIMIT 5;"
  }'
```

Expected output:

```json
{
  "output": [
    {
      "records": {
        "rows": [
          {
            "conversation_id": "abc-123",
            "provider": "copilot",
            "user_query": "How do I use async/await in Python?",
            "agent_response": "In Python, async/await is used...",
            "timestamp": "2026-02-07T10:30:00Z"
          }
        ]
      }
    }
  ]
}
```

---

## Step 4: Dashboard Queries

### 4.1 Copilot Usage Summary

```sql
SELECT
  COUNT(*) as total_interactions,
  COUNT(DISTINCT conversation_id) as conversations,
  AVG(latency_ms) as avg_latency,
  SUM(total_tokens) as total_tokens
FROM agent_conversations
WHERE provider = 'copilot'
  AND timestamp >= NOW() - INTERVAL '7 days';
```

### 4.2 Most Common Questions

```sql
SELECT
  user_query,
  COUNT(*) as frequency
FROM agent_conversations
WHERE provider = 'copilot'
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY user_query
ORDER BY frequency DESC
LIMIT 10;
```

### 4.3 Completion Acceptance Rate

```sql
SELECT
  DATE(timestamp) as date,
  COUNT(*) FILTER (WHERE user_query LIKE '[CODE_COMPLETION]%') as completions,
  COUNT(*) FILTER (WHERE user_query NOT LIKE '[CODE_COMPLETION]%') as chats
FROM agent_conversations
WHERE provider = 'copilot'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

---

## Alternative: MCP-Based Approach (Future)

Instead of VSCode extension, use Model Context Protocol:

```typescript
// MCP Server for Copilot telemetry
import { McpServer } from "@modelcontextprotocol/sdk";

const server = new McpServer({
  name: "copilot-telemetry",
  version: "1.0.0",
});

server.tool({
  name: "log_copilot_event",
  description: "Log Copilot telemetry event",
  inputSchema: {
    /* ... */
  },
  async handler(input) {
    // Forward to agent/observability
  },
});
```

This is more portable but requires MCP infrastructure.

---

## Troubleshooting

### Issue: Extension not activating

**Check**: VSCode Output → "Copilot Telemetry Logger"

**Try**:

- Reload VSCode window (Ctrl+Shift+P → "Reload Window")
- Verify extension installed: Extensions → Filter "@installed"

### Issue: HTTP 404 on telemetry endpoint

**Check**: Agent server logs

```bash
npm run dev:agent
# Look for: "Registered route: POST /api/telemetry/copilot"
```

**Fix**:

- Ensure `app.include_router(create_fastapi_endpoint())` is in `agent/main.py`
- Restart agent server

### Issue: Events not logged to GreptimeDB

**Check**: GreptimeDB connection

```bash
curl http://localhost:4000/health
```

**Query logs**:

```sql
SELECT * FROM agent_conversations
WHERE provider = 'copilot'
ORDER BY timestamp DESC LIMIT 1;
```

### Issue: High latency or missing events

**Optimize**: Use async logging (non-blocking HTTP)

```python
# In vscode_copilot_telemetry.py, make log_conversation async
await self.greptime.log_conversation_async(...)
```

---

## Security Considerations

1. **Sensitive Code**: Filter completions that may contain secrets
2. **PII**: Sanitize user queries if they contain personal data
3. **Network**: Use HTTPS for production (agent on `https://agent.example.com`)
4. **Rate Limiting**: Add rate limits to FastAPI endpoint

---

## Next Steps

1. ✅ Install VSCode extension
2. ✅ Enable FastAPI telemetry route
3. ✅ Test with Copilot Chat
4. ⏳ Create Grafana dashboard for Copilot metrics
5. ⏳ Add filtering for sensitive data
6. ⏳ Implement MCP-based alternative

For more details, see:

- `agent/observability/vscode_copilot_telemetry.py`
- `docs/AGENT_OBSERVABILITY_IMPLEMENTATION.md`
