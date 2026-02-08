# Copilot Observability - Quick Start

> **Implementation Complete!** ✅ All components are ready to use.

## What Was Built

A complete system to capture GitHub Copilot interactions from VSCode and send them to Phoenix for observability, analysis, and dataset generation.

### Components Created

1. **✅ FastAPI Proxy Server** (`agent/observability/copilot_phoenix_proxy.py`)
   - Receives telemetry from TZ extension
   - Transforms to OpenInference format
   - Forwards to Phoenix via OTLP

2. **✅ Dataset Export Utility** (`agent/observability/export_copilot_dataset.py`)
   - Exports to JSONL, CSV, Parquet
   - Fine-tuning format support
   - Flexible time-range queries

3. **✅ Startup Scripts**
   - Windows: `scripts/start-copilot-observability.ps1`
   - Unix/macOS: `scripts/start-copilot-observability.sh`

4. **✅ VSCode Configuration** (`.vscode/settings.json`)
   - TZ extension pre-configured
   - Endpoint: `http://localhost:8080/telemetry`

5. **✅ Documentation** (`docs/COPILOT_OBSERVABILITY_GUIDE.md`)
   - Complete usage guide
   - Analysis examples
   - Troubleshooting

## Get Started in 3 Steps

### Step 1: Install Dependencies

```bash
cd agent
pip install -r requirements-phoenix.txt
```

### Step 2: Start the System

**🎯 Recommended: Automatic Startup (Docker Compose)**

The system will now start automatically when you open the workspace in VSCode! The Docker Compose setup ensures Phoenix and the proxy start together with proper dependency management.

**Manual Startup Options:**

**Option A: NPM Scripts (Easiest)**

```bash
# Start everything (Phoenix + Proxy)
npm run copilot:start

# Stop everything
npm run copilot:stop

# View logs
npm run copilot:logs

# Export dataset
npm run copilot:export
```

**Option B: Shell Scripts**

**Windows:**

```powershell
.\scripts\start-copilot-observability.ps1
```

**macOS/Linux:**

```bash
chmod +x ./scripts/start-copilot-observability.sh
./scripts/start-copilot-observability.sh
```

**Option C: Docker Compose (Direct)**

```bash
# Start with auto-build
docker-compose -f docker-compose.phoenix.yml up -d --build

# View logs
docker-compose -f docker-compose.phoenix.yml logs -f

# Stop
docker-compose -f docker-compose.phoenix.yml down
```

**What Happens Automatically:**

- ✅ Phoenix starts and becomes healthy
- ✅ Proxy waits for Phoenix health check
- ✅ Proxy starts on port 8080
- ✅ Both services restart automatically if they fail

### Step 3: Use Copilot

- Open Copilot Chat in VSCode
- Ask any question
- Watch traces appear in Phoenix UI: <http://localhost:6006>

## Verify It's Working

1. **Check Proxy:** <http://localhost:8080/health>
   - Should return: `{"status": "healthy"}`

2. **Check Phoenix:** <http://localhost:6006>
   - Should show Phoenix dashboard
   - Select project: "copilot-research"

3. **Test Capture:**
   - Ask Copilot: "How do I use async/await in Python?"
   - Refresh Phoenix UI
   - You should see a new trace

## Available VSCode Tasks

Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) and search for "Tasks: Run Task":

- **Start Copilot Observability** - Starts Phoenix + Proxy (auto-runs on workspace open)
- **Stop Copilot Observability** - Stops all services
- **Restart Copilot Proxy** - Restart just the proxy
- **View Copilot Proxy Logs** - Stream proxy logs
- **View All Observability Logs** - Stream Phoenix + Proxy logs
- **Export Copilot Dataset (7 days)** - Export last 7 days to all formats
- **Export Fine-tuning Dataset** - Export in OpenAI fine-tuning format
- **Check Copilot Proxy Health** - Test proxy health endpoint

## Export Your First Dataset

```bash
# Export last 7 days to JSONL (fine-tuning format)
python -m agent.observability.export_copilot_dataset \
    --output-dir ./datasets \
    --format jsonl \
    --finetune-format \
    --days-back 7
```

Output: `datasets/copilot_telemetry_YYYYMMDD_HHMMSS_finetune.jsonl`

## What Gets Captured

- ✅ Chat messages (user prompts + responses)
- ✅ Code completions
- ✅ Agent roles (e.g., workspace, terminal)
- ✅ Instructions & prompts
- ✅ Tools used
- ✅ Token counts
- ✅ Latency metrics
- ✅ User feedback (thumbs up/down)

## Analysis Use Cases

### 1. Prompt Engineering

- Which prompts get better responses?
- What instructions are most effective?
- Which agent roles work best?

### 2. Tool Effectiveness

- Which tools are used most?
- Which tools get positive feedback?
- Tool usage patterns

### 3. Fine-Tuning Datasets

- Export high-quality interactions
- Filter by feedback (positive only)
- Generate training examples

## File Locations

```
modme-ui-01-test-worktree/
├── agent/
│   ├── observability/
│   │   ├── copilot_phoenix_proxy.py      # Proxy server
│   │   ├── export_copilot_dataset.py     # Dataset export
│   │   ├── vscode_copilot_telemetry.py   # Telemetry adapter
│   │   └── README.md                      # Module docs
│   └── requirements-phoenix.txt           # Dependencies
├── scripts/
│   ├── start-copilot-observability.ps1    # Windows startup
│   └── start-copilot-observability.sh     # Unix startup
├── docs/
│   └── COPILOT_OBSERVABILITY_GUIDE.md     # Complete guide
└── .vscode/
    └── settings.json                       # TZ extension config
```

## Environment Variables

Optional customization (add to `agent/.env`):

```bash
# Phoenix
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006/v1/traces
PHOENIX_PROJECT_NAME=copilot-research

# Proxy
PROXY_PORT=8080
PROXY_HOST=0.0.0.0
LOG_LEVEL=INFO
```

## Troubleshooting

### Problem: Proxy won't start

**Error:** "Address already in use"
**Fix:**

```bash
# Use different port
PROXY_PORT=9090 python -m agent.observability.copilot_phoenix_proxy
```

### Problem: No traces in Phoenix

**Check:**

1. Extension enabled: `.vscode/settings.json` → `tzCopilotTelemetry.enabled: true`
2. Proxy running: `curl http://localhost:8080/health`
3. Phoenix running: `docker ps | grep phoenix`

**Fix:**

- Reload VSCode (Ctrl+Shift+P → "Reload Window")
- Check Developer Console: Help → Toggle Developer Tools

### Problem: Export finds no data

**Check:**

- Traces exist in Phoenix UI
- Project name is "copilot-research"
- Date range includes your usage

**Fix:**

```bash
# Use wider date range
python -m agent.observability.export_copilot_dataset --days-back 30
```

## Next Steps

1. **Collect Data:** Use Copilot normally for 1-2 weeks
2. **Analyze Patterns:** Export and analyze with pandas/Jupyter
3. **Iterate Prompts:** Refine based on what works
4. **Generate Datasets:** Export for fine-tuning
5. **Monitor Impact:** Track improvements over time

## Full Documentation

📖 **Complete Guide:** [docs/COPILOT_OBSERVABILITY_GUIDE.md](../docs/COPILOT_OBSERVABILITY_GUIDE.md)

- Detailed setup
- Analysis examples
- Best practices
- Integration guides

## Support

- **Phoenix Docs:** <https://docs.arize.com/phoenix>
- **OpenInference:** <https://github.com/Arize-ai/openinference>
- **Issues:** Create issue in repository

---

**Ready to start?** Run the startup script and start using Copilot! 🚀
