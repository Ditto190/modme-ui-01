# n8n → Phoenix Trace Upload Pipeline

**Status:** ✅ Production-ready
**Last Updated:** February 8, 2026

## Architecture Overview

```
                    POST /webhook/copilot-chat-upload
User/Script ──────────────► n8n (Docker :5678)
                              │
                              ├─ Receive Chat JSON (webhook)
                              ├─ Prepare Bridge Payload (code)
                              ├─ Send to Trace Bridge (HTTP)
                              └─ Respond to Webhook
                              │
                              ▼  POST /upload (JSON)
                         Trace Bridge API (:8787)
                              │
                              ├─ Reuses upload_chat_traces.py
                              ├─ OTel SDK → Protobuf serialization
                              └─ OTLPSpanExporter
                              │
                              ▼  POST /v1/traces (Protobuf)
                         Phoenix (:6006)
                              │
                              └─ Spans visible in UI
                                 (AGENT + LLM + TOOL spans)
```

## Components

### 1. n8n Workflow (Self-Service Upload)

**File:** `agent/observability/n8n_workflow_chat_to_phoenix.json`

**Nodes:**

1. **Webhook Trigger** - Receives POST requests at `/webhook/copilot-chat-upload`
2. **Code Node** - Extracts `chatData` and `projectName` from request body
3. **HTTP Request** - Forwards to Trace Bridge at `http://host.docker.internal:8787/upload`
4. **Respond to Webhook** - Returns bridge response to caller

**Features:**

- Simple 4-node pipeline
- No complex OTLP logic in n8n (handled by bridge)
- Timeout: 120 seconds
- Automatic error handling

### 2. Trace Bridge API

**File:** `agent/observability/trace_bridge_api.py`

**Purpose:** FastAPI service that bridges JSON → OTLP protobuf

**Endpoints:**

- `POST /upload` - Main upload endpoint
  - Body: `{ "chatData": {...}, "projectName": "..." }`
  - Returns: `{ "message": "...", "spans_uploaded": N }`
- `GET /health` - Health check

**Features:**

- Reuses battle-tested `upload_chat_traces.py` logic
- OTel SDK for proper span hierarchy
- Protobuf serialization via `OTLPSpanExporter`
- Handles AGENT, LLM, and TOOL spans with proper parent/child relationships

### 3. Phoenix Server

**Compose:** `docker-compose.phoenix.yml`

**Ports:**

- 6006: Phoenix UI
- 4317: OTLP gRPC collector

**Storage:** `phoenix-data` volume (SQLite)

## Quick Start

### 1. Start Services

```bash
# Phoenix + Copilot Proxy
docker-compose -f docker-compose.phoenix.yml up -d

# n8n
docker-compose -f docker-compose.n8n.yml up -d

# Trace Bridge (Python)
python -m agent.observability.trace_bridge_api
```

**Verify:**

```bash
# Phoenix UI
open http://localhost:6006

# n8n UI
open http://localhost:5678

# Bridge health
curl http://localhost:8787/health
```

### 2. Import n8n Workflow

1. Open n8n: http://localhost:5678 (admin/admin123)
2. Click **"Import from File"**
3. Select: `agent/observability/n8n_workflow_chat_to_phoenix.json`
4. Activate the workflow

### 3. Upload Traces

**Option A: Via n8n Webhook (Recommended)**

```bash
curl -X POST http://localhost:5678/webhook/copilot-chat-upload \
  -H "Content-Type: application/json" \
  -d @datasets/chat.json
```

**Option B: Directly to Bridge (Skip n8n)**

```bash
curl -X POST http://localhost:8787/upload \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "my-project",
    "chatData": <contents of chat.json>
  }'
```

**Option C: Python Script**

```bash
python agent/observability/copilot_chat_parser.py datasets/chat.json --upload
```

## Configuration

### Environment Variables (.env)

```bash
# Phoenix endpoints (for host applications)
PHOENIX_ENDPOINT=http://localhost:6006
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006/v1/traces

# n8n Phoenix integration (Docker containers)
N8N_PHOENIX_URL=http://host.docker.internal:6006
N8N_PHOENIX_COLLECTOR_ENDPOINT=http://host.docker.internal:6006/v1/traces

# n8n Security (allow Code nodes to access env vars)
N8N_BLOCK_ENV_ACCESS_IN_NODE=false

# n8n Authentication
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin123

# n8n API key (get from Settings > API in n8n UI)
N8N_API_KEY=<generated-after-startup>
```

### Docker Network Config

**Key:** n8n runs in Docker, so it uses `host.docker.internal` to reach services on the host machine.

- `localhost:6006` → Phoenix (from host)
- `localhost:8787` → Trace Bridge (from host)
- `host.docker.internal:6006` → Phoenix (from n8n container)
- `host.docker.internal:8787` → Trace Bridge (from n8n container)

## Workflow Details

### Webhook Input Format

```json
{
  "projectName": "copilot-research",
  "chatData": {
    "requests": [
      {
        "turn": {...},
        "completionEvent": {...},
        "toolInvocations": [...]
      }
    ]
  }
}
```

**Simplified:**

```json
{
  "requests": [...]
}
```

(projectName defaults to "copilot-research")

### Bridge Response Format

```json
{
  "message": "Successfully uploaded 111 spans to Phoenix",
  "spans_uploaded": 111,
  "project_name": "copilot-research"
}
```

### Error Handling

**Bridge errors:**

- Invalid JSON → 422 Unprocessable Entity
- Missing chatData → 400 Bad Request
- Phoenix connection failure → 500 Internal Server Error

**n8n errors:**

- Automatically retries on timeout (up to 120s)
- Returns error JSON from bridge if upload fails

## Span Types & Hierarchy

### Span Structure

```
AGENT (session-level)
├─ LLM (request-level)
│  ├─ TOOL (tool1)
│  ├─ TOOL (tool2)
│  └─ TOOL (tool3)
├─ LLM (request-level)
│  ├─ TOOL (tool4)
│  └─ TOOL (tool5)
...
```

### Span Attributes

**AGENT spans:**

- `span_kind`: AGENT
- `llm.model_name`: Model used
- `session.id`: Unique session identifier

**LLM spans:**

- `span_kind`: LLM
- `llm.input_messages`: User prompt
- `llm.output_messages`: Assistant response
- `llm.token_count.prompt`: Input tokens
- `llm.token_count.completion`: Output tokens

**TOOL spans:**

- `span_kind`: TOOL
- `tool.name`: Tool identifier
- `tool.parameters`: JSON input
- `tool.result`: JSON output

## Verification

### Check Uploaded Spans

```bash
# Quick verification script
python scripts/check_phoenix_spans.py

# Or via Phoenix Client
python -c "
from phoenix.client import Client
c = Client()
traces = c.get_traces(limit=10)
for t in traces:
    print(f'{t.project_name}: {len(list(t.spans))} spans')
"
```

### Phoenix UI

1. Open http://localhost:6006
2. Navigate to **Traces** tab
3. Filter by project: `copilot-research`
4. Inspect span details, timeline, and relationships

## Troubleshooting

### n8n Can't Reach Bridge

**Symptom:** HTTP 502/503 errors in n8n workflow

**Fix:**

```bash
# Verify bridge is running
curl http://localhost:8787/health

# Check from n8n container
docker exec -it n8n-local wget -qO- http://host.docker.internal:8787/health
```

### Bridge Can't Reach Phoenix

**Symptom:** "Connection refused" in bridge logs

**Fix:**

```bash
# Verify Phoenix is running
docker ps | grep phoenix-server

# Check Phoenix health
curl http://localhost:6006
```

### Spans Not Appearing

**Symptom:** Upload succeeds but no spans in Phoenix UI

**Fixes:**

1. Check project name matches: `copilot-research`
2. Verify span timestamps are within Phoenix retention window
3. Check Phoenix logs: `docker logs phoenix-server`
4. Refresh Phoenix UI (hard refresh: Ctrl+Shift+R)

### Environment Variable Access Denied

**Symptom:** n8n Code node can't access `$env.PHOENIX_URL`

**Fix:**

```bash
# Add to .env
N8N_BLOCK_ENV_ACCESS_IN_NODE=false

# Restart n8n
docker-compose -f docker-compose.n8n.yml restart
```

## Performance Notes

- **Batch size:** Bridge handles full chat.json in one request
- **Timeout:** 120s default (configurable in n8n HTTP node)
- **Phoenix capacity:** SQLite backend handles ~10k spans/project comfortably
- **Network:** Docker bridge adds ~10ms latency vs localhost

## Production Considerations

### Security

1. **Enable n8n authentication:** Already configured (admin/admin123)
2. **Use HTTPS:** Add Caddy/nginx reverse proxy
3. **Restrict webhook access:** Add API token validation
4. **Lock down env vars:** Set `N8N_BLOCK_ENV_ACCESS_IN_NODE=true` in production
5. **Phoenix auth:** Add authentication layer if exposing publicly

### Scaling

1. **Phoenix backend:** Switch from SQLite to PostgreSQL
2. **n8n:** Use n8n queue mode for high-volume uploads
3. **Bridge:** Run multiple bridge instances behind load balancer
4. **Retention:** Configure Phoenix data retention policies

### Monitoring

```bash
# Bridge logs
tail -f agent/observability/trace_bridge_api.log

# Phoenix logs
docker logs -f phoenix-server

# n8n workflow executions
# View in n8n UI: http://localhost:5678/workflow/<workflow-id>/executions
```

## Files Reference

| File                                                    | Purpose                        |
| ------------------------------------------------------- | ------------------------------ |
| `agent/observability/trace_bridge_api.py`               | FastAPI bridge service         |
| `agent/observability/upload_chat_traces.py`             | Core trace upload logic        |
| `agent/observability/n8n_workflow_chat_to_phoenix.json` | n8n workflow definition        |
| `agent/observability/copilot_chat_parser.py`            | CLI tool for manual uploads    |
| `scripts/check_phoenix_spans.py`                        | Span verification utility      |
| `docker-compose.n8n.yml`                                | n8n + n8n-mcp config           |
| `docker-compose.phoenix.yml`                            | Phoenix + copilot-proxy config |

## Maintenance

### Update n8n Workflow

```bash
# Export from n8n UI
# Import updated JSON via UI
# Or: Use n8n API to programmatically update
```

### Update Bridge Code

```bash
# Edit agent/observability/trace_bridge_api.py
# Restart bridge
pkill -f trace_bridge_api
python -m agent.observability.trace_bridge_api
```

### Upgrade Phoenix

```bash
docker-compose -f docker-compose.phoenix.yml pull
docker-compose -f docker-compose.phoenix.yml up -d
```

## Related Documentation

- [Phoenix Client API](../agent/observability/README.md)
- [Copilot Chat Parser](../agent/observability/copilot_chat_parser.py)
- [n8n Documentation](https://docs.n8n.io)
- [OpenInference Spec](https://github.com/Arize-ai/openinference)

---

**Questions?** Check [CUSTOMIZATION_QUICK_REF.md](./CUSTOMIZATION_QUICK_REF.md) or raise an issue.
