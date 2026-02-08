# Copilot Observability - Automated Startup Guide

## 🎯 Automatic Startup (Zero Configuration)

The system now starts **automatically** when you open the workspace! No manual intervention required.

### How It Works

1. **VSCode Task**: Configured to run on workspace open
2. **Docker Compose**: Manages service dependencies
3. **Health Checks**: Ensures Phoenix is ready before proxy starts

**Default Behavior:**

- Opens workspace → Phoenix starts → Proxy waits for Phoenix health check → Proxy starts
- Services restart automatically if they fail
- Silent startup (notifications appear only on errors)

## 🛠️ Manual Control Options

### NPM Scripts (Recommended for Development)

Complete control through simple commands:

```bash
# Start everything
npm run copilot:start

# Start and open Phoenix UI
npm run copilot:dev

# Stop everything
npm run copilot:stop

# Restart proxy only
npm run copilot:restart

# Rebuild proxy container
npm run copilot:build

# View proxy logs (follow mode)
npm run copilot:logs

# View all logs (Phoenix + Proxy)
npm run copilot:logs:all

# Check health
npm run copilot:health

# Export dataset (last 7 days, all formats)
npm run copilot:export

# Export for fine-tuning (JSONL, OpenAI format)
npm run copilot:export:finetune

# Open Phoenix UI
npm run copilot:ui
```

### VSCode Tasks (GUI)

Press `Ctrl+Shift+P` → "Tasks: Run Task":

| Task                                | Purpose                                   |
| ----------------------------------- | ----------------------------------------- |
| **Start Copilot Observability**     | Start Phoenix + Proxy (auto-runs on open) |
| **Stop Copilot Observability**      | Stop all services                         |
| **Restart Copilot Proxy**           | Restart proxy only                        |
| **View Copilot Proxy Logs**         | Stream proxy logs                         |
| **View All Observability Logs**     | Stream Phoenix + Proxy logs               |
| **Export Copilot Dataset (7 days)** | Export to all formats                     |
| **Export Fine-tuning Dataset**      | Export in OpenAI format                   |
| **Check Copilot Proxy Health**      | Test health endpoint                      |

### Docker Compose (Direct Control)

For advanced users who want full Docker control:

```bash
# Start with build
docker-compose -f docker-compose.phoenix.yml up -d --build

# Start in foreground (see logs)
docker-compose -f docker-compose.phoenix.yml up

# Stop
docker-compose -f docker-compose.phoenix.yml down

# View logs
docker-compose -f docker-compose.phoenix.yml logs -f

# Restart specific service
docker-compose -f docker-compose.phoenix.yml restart copilot-proxy

# Rebuild without cache
docker-compose -f docker-compose.phoenix.yml build --no-cache copilot-proxy
```

### Shell Scripts (Legacy)

Original startup scripts (still work, but npm/Docker Compose is preferred):

**Windows:**

```powershell
.\scripts\start-copilot-observability.ps1
```

**macOS/Linux:**

```bash
./scripts/start-copilot-observability.sh
```

## 🔍 Verification

### Check System Status

```bash
# Quick health check
npm run copilot:health

# Check running containers
docker ps

# View proxy logs
docker logs copilot-telemetry-proxy

# View Phoenix logs
docker logs phoenix-server
```

### Expected Output

**Health Check:**

```json
{
  "status": "healthy",
  "openinference_available": true,
  "uptime": "5m 23s"
}
```

**Docker Containers:**

```
CONTAINER ID   IMAGE                    STATUS       PORTS
abc123         copilot-proxy:latest     Up 5 mins    0.0.0.0:8080->8080/tcp
def456         phoenix:latest           Up 5 mins    0.0.0.0:6006->6006/tcp
```

## ⚙️ Configuration

### Environment Variables

Optional customization in `agent/.env`:

```bash
# Phoenix Configuration
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006/v1/traces
PHOENIX_PROJECT_NAME=copilot-research

# Proxy Configuration
PROXY_PORT=8080
PROXY_HOST=0.0.0.0
LOG_LEVEL=INFO
```

### VSCode Workspace Settings

Already configured in `.vscode/settings.json`:

```json
{
  "tzCopilotTelemetry.enabled": true,
  "tzCopilotTelemetry.exportEndpoint": "http://localhost:8080/telemetry",
  "tzCopilotTelemetry.captureChat": true,
  "tzCopilotTelemetry.captureCompletions": true,
  "tzCopilotTelemetry.includePrompts": true,
  "tzCopilotTelemetry.includeResponses": true
}
```

## 🐛 Troubleshooting

### Services Won't Start

**Check Docker:**

```bash
docker info
```

**Check Ports:**

```bash
# Windows
netstat -ano | findstr "6006 8080"

# macOS/Linux
lsof -i :6006,8080
```

**Fix:** Stop conflicting services or change ports in `docker-compose.phoenix.yml`

### Auto-Start Not Working

**Check Task Configuration:**
`.vscode/tasks.json` should have:

```json
{
  "label": "Start Copilot Observability",
  "runOptions": {
    "runOn": "folderOpen"
  }
}
```

**Fix:**

- Reload VSCode: `Ctrl+Shift+P` → "Developer: Reload Window"
- Manually run task: `Ctrl+Shift+P` → "Tasks: Run Task" → "Start Copilot Observability"

### Proxy Not Receiving Telemetry

**Check:**

1. Extension enabled: `.vscode/settings.json`
2. Proxy running: `npm run copilot:health`
3. Correct endpoint: `http://localhost:8080/telemetry`

**Fix:**

```bash
# Restart VSCode
# Check Developer Console: Help → Toggle Developer Tools
# Look for network errors when using Copilot
```

### No Traces in Phoenix

**Check:**

1. Proxy forwarding to Phoenix: Check logs `npm run copilot:logs`
2. Phoenix project name: Should be "copilot-research"
3. Traces being sent: Use Copilot, then refresh Phoenix UI

**Fix:**

```bash
# Send test telemetry
curl -X POST http://localhost:8080/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "chat",
    "role": "workspace",
    "user": "test-user",
    "messages": [
      {"role": "user", "content": "Test message"}
    ]
  }'
```

## 🎓 Best Practices

### Development Workflow

1. **Morning:** Workspace opens → Services start automatically
2. **During Work:** Use Copilot normally
3. **Check Traces:** `npm run copilot:ui` to open Phoenix UI
4. **View Logs:** `npm run copilot:logs` if issues
5. **Evening:** Services stop when workspace closes (optional)

### Data Collection

- **Casual Use:** Auto-start, let it run in background
- **Active Research:** Monitor logs occasionally
- **Dataset Export:** Weekly export for analysis
- **Fine-tuning:** Export with filters for high-quality interactions

### Resource Management

**Stop when not needed:**

```bash
npm run copilot:stop
```

**Restart after updates:**

```bash
npm run copilot:build
npm run copilot:start
```

**Clean up disk space:**

```bash
docker system prune -a --volumes
```

## 📊 Quick Reference

| What             | Command                  |
| ---------------- | ------------------------ |
| Start everything | `npm run copilot:start`  |
| Stop everything  | `npm run copilot:stop`   |
| View logs        | `npm run copilot:logs`   |
| Check health     | `npm run copilot:health` |
| Export data      | `npm run copilot:export` |
| Open UI          | `npm run copilot:ui`     |
| Rebuild          | `npm run copilot:build`  |

## 🚀 Next Steps

1. **Let it run:** Auto-start handles everything
2. **Use Copilot:** Work normally, data captures automatically
3. **Check Phoenix:** Periodically review traces
4. **Export data:** Weekly analysis and dataset generation
5. **Iterate:** Refine prompts based on insights

---

**Need help?** See [COPILOT_OBSERVABILITY_QUICKSTART.md](COPILOT_OBSERVABILITY_QUICKSTART.md) or [COPILOT_OBSERVABILITY_GUIDE.md](COPILOT_OBSERVABILITY_GUIDE.md)
