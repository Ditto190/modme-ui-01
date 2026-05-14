# n8n → Phoenix Pipeline - Quick Reference

## 🚀 Start Services

```bash
# All services
docker-compose -f docker-compose.phoenix.yml up -d && \
docker-compose -f docker-compose.n8n.yml up -d && \
python -m agent.observability.trace_bridge_api

# Individual services
docker-compose -f docker-compose.phoenix.yml up -d   # Phoenix
docker-compose -f docker-compose.n8n.yml up -d       # n8n
python -m agent.observability.trace_bridge_api       # Bridge (port 8787)
```

## 📤 Upload Traces

### Via n8n Webhook (Recommended)

```bash
curl -X POST http://localhost:5678/webhook/copilot-chat-upload \
  -H "Content-Type: application/json" \
  -d @datasets/chat.json
```

### Via Bridge Directly

```bash
curl -X POST http://localhost:8787/upload \
  -H "Content-Type: application/json" \
  -d '{"projectName": "my-project", "chatData": <chat.json>}'
```

### Via Python Script

```bash
python agent/observability/copilot_chat_parser.py datasets/chat.json --upload
```

## 🔍 Verify & Debug

### Check Services

```bash
# Phoenix UI
open http://localhost:6006

# n8n UI (admin/admin123)
open http://localhost:5678

# Bridge health
curl http://localhost:8787/health

# Docker status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Check Spans

```bash
# Quick verification
python scripts/check_phoenix_spans.py

# Phoenix Client
python -c "from phoenix.client import Client; print(len(list(Client().get_spans())))"
```

### View Logs

```bash
docker logs -f phoenix-server              # Phoenix
docker logs -f n8n-local                   # n8n
docker logs -f copilot-telemetry-proxy     # Copilot proxy
tail -f agent/observability/bridge.log     # Trace bridge (if logging enabled)
```

## 🛠️ Configuration

### Key Environment Variables

```bash
# Host applications
PHOENIX_ENDPOINT=http://localhost:6006

# Docker containers (n8n)
N8N_PHOENIX_URL=http://host.docker.internal:6006

# n8n security
N8N_BLOCK_ENV_ACCESS_IN_NODE=false
```

### Restart Services

```bash
docker-compose -f docker-compose.phoenix.yml restart
docker-compose -f docker-compose.n8n.yml restart
pkill -f trace_bridge_api && python -m agent.observability.trace_bridge_api &
```

## 📊 Common Tasks

### Import n8n Workflow

1. Open <http://localhost:5678>
2. Click "Import from File"
3. Select `agent/observability/n8n_workflow_chat_to_phoenix.json`
4. Activate workflow

### Export Dataset from Phoenix

```bash
python agent/observability/copilot_chat_parser.py datasets/chat.json \
  --upload --dataset-name my-session
```

### Clean Up Old Spans

```bash
# Phoenix UI → Settings → Data Retention
# Or: Delete SQLite database
docker-compose -f docker-compose.phoenix.yml down -v
```

## 🐛 Troubleshooting

| Issue                      | Fix                                                   |
| -------------------------- | ----------------------------------------------------- |
| n8n can't reach bridge     | Check bridge is running: `curl localhost:8787/health` |
| Bridge can't reach Phoenix | Check Phoenix: `curl localhost:6006`                  |
| No spans in UI             | Verify project name = "copilot-research"              |
| Env var access denied      | Set `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`              |
| 502 errors                 | Use `host.docker.internal` not `localhost` in n8n     |

## 🔗 Key Endpoints

| Service           | URL                                                 | Purpose                |
| ----------------- | --------------------------------------------------- | ---------------------- |
| Phoenix UI        | <http://localhost:6006>                             | View traces/spans      |
| Phoenix Collector | <http://localhost:6006/v1/traces>                   | OTLP endpoint          |
| n8n UI            | <http://localhost:5678>                             | Workflow management    |
| n8n Webhook       | <http://localhost:5678/webhook/copilot-chat-upload> | Upload endpoint        |
| Trace Bridge      | <http://localhost:8787/upload>                      | JSON → Protobuf bridge |
| Copilot Proxy     | <http://localhost:8080>                             | Telemetry proxy        |

## 📁 Key Files

| File                                                    | Purpose               |
| ------------------------------------------------------- | --------------------- |
| `agent/observability/trace_bridge_api.py`               | FastAPI bridge        |
| `agent/observability/n8n_workflow_chat_to_phoenix.json` | n8n workflow          |
| `docker-compose.phoenix.yml`                            | Phoenix config        |
| `docker-compose.n8n.yml`                                | n8n config            |
| `.env`                                                  | Environment variables |

## 🎯 Typical Workflow

```bash
# 1. Start everything
docker-compose -f docker-compose.phoenix.yml up -d
docker-compose -f docker-compose.n8n.yml up -d
python -m agent.observability.trace_bridge_api

# 2. Verify services
curl http://localhost:6006          # Phoenix
curl http://localhost:5678          # n8n
curl http://localhost:8787/health   # Bridge

# 3. Upload traces
curl -X POST http://localhost:5678/webhook/copilot-chat-upload \
  -H "Content-Type: application/json" \
  -d @datasets/chat.json

# 4. View in Phoenix
open http://localhost:6006
```

---

**Full docs:** [N8N_PHOENIX_PIPELINE.md](./N8N_PHOENIX_PIPELINE.md)
