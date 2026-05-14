# GitHub Copilot Observability with Phoenix

**Status**: ✅ Production Ready
**Last Updated**: February 8, 2026

## Overview

Capture GitHub Copilot chat and completion interactions from VSCode and send to Phoenix for observability, analysis, and dataset export for fine-tuning.

## Architecture

```
VSCode + GitHub Copilot → TZ Extension (telemetry capture)
  → Telemetry Proxy (FastAPI + OpenInference) → Phoenix (OTLP/HTTP)
  → Phoenix UI (traces, analytics) → Dataset Export (JSONL, CSV, Parquet)
```

**Components:**

| Component       | Purpose                              | Port |
| --------------- | ------------------------------------ | ---- |
| TZ Extension    | Captures Copilot telemetry in VSCode | N/A  |
| Telemetry Proxy | Transforms JSON → OTLP traces        | 8080 |
| Phoenix         | Stores and displays traces           | 6006 |

## Quick Start

**1. Install dependencies:**

```bash
cd agent
pip install -r requirements-phoenix.txt
```

**2. Start observability stack:**

```bash
# Windows
.\scripts\start-copilot-observability.ps1

# Unix/macOS
./scripts/start-copilot-observability.sh
```

Script starts Phoenix Docker container and telemetry proxy on port 8080.

**3. Verify:**

- Phoenix UI: http://localhost:6006
- Proxy health: http://localhost:8080/health
- Extension: Check VSCode status bar (TZ icon should be green)

**4. Test capture:**

Open Copilot chat in VSCode, send a message, then check Phoenix UI for trace.

## TZ Extension Configuration

Extension is pre-configured to send telemetry to proxy server.

**Verify settings** (`.vscode/settings.json`):

```json
{
  "tz.telemetry.endpoint": "http://localhost:8080/telemetry",
  "tz.telemetry.enabled": true,
  "tz.telemetry.includeCompletions": true,
  "tz.telemetry.includeChat": true
}
```

**Extension features:**

- Auto-detect Copilot completions and chat events
- Send to proxy in real-time
- Status indicator in VSCode status bar
- Health check on telemetry endpoint

## Telemetry Proxy

FastAPI server that transforms Copilot telemetry → OpenTelemetry traces.

**Start manually:**

```bash
cd agent
python -m observability.telemetry_proxy
```

**Endpoints:**

- `POST /telemetry` - Receive telemetry from extension
- `GET /health` - Health check
- `GET /stats` - Proxy statistics

**Configuration** (`.env.local`):

```bash
TELEMETRY_PROXY_PORT=8080
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006/v1/traces
```

**Captured attributes:**

- `copilot.event_type`: "completion" or "chat"
- `copilot.model`: Model used (e.g., "gpt-4")
- `copilot.prompt`: User prompt or code context
- `copilot.completion`: Generated code or chat response
- `copilot.accepted`: Whether completion was accepted
- `copilot.language`: Programming language
- `copilot.file_path`: Current file
- `copilot.timestamp`: Event timestamp

## Dataset Export

Export Copilot interactions for analysis or fine-tuning.

**Quick export (last 7 days):**

```bash
npm run copilot:export
# Creates: exports/copilot_dataset_YYYYMMDD.jsonl
```

**Custom export:**

```bash
python agent/scripts/export_copilot_dataset.py \
  --start-date 2026-02-01 \
  --end-date 2026-02-08 \
  --format jsonl \
  --output exports/custom_dataset.jsonl
```

**Export formats:**

- `jsonl` - JSON Lines (default, for fine-tuning)
- `csv` - Spreadsheet analysis
- `parquet` - Large datasets with compression

**Fine-tuning format:**

```json
{
  "messages": [
    { "role": "system", "content": "You are GitHub Copilot..." },
    { "role": "user", "content": "Write a function to..." },
    { "role": "assistant", "content": "def function_name():..." }
  ],
  "metadata": {
    "language": "python",
    "accepted": true,
    "model": "gpt-4"
  }
}
```

**Filter options:**

```bash
# Only accepted completions
--accepted-only

# Specific language
--language python

# Minimum characters
--min-length 50

# Exclude chat (completions only)
--exclude-chat
```

## Automation

**Automated startup** (runs on VSCode launch):

Task: "Start Copilot Observability" in `.vscode/tasks.json`

**Scheduled exports** (GitHub Actions):

```yaml
# .github/workflows/export-copilot-data.yml
on:
  schedule:
    - cron: "0 0 * * 0" # Weekly on Sunday
  workflow_dispatch:

jobs:
  export:
    steps:
      - name: Export dataset
        run: npm run copilot:export
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: copilot-dataset
          path: exports/*.jsonl
```

**npm scripts:**

```bash
npm run copilot:start     # Start proxy + Phoenix
npm run copilot:stop      # Stop services
npm run copilot:restart   # Restart proxy
npm run copilot:logs      # View proxy logs
npm run copilot:health    # Check health
npm run copilot:export    # Export last 7 days
```

## Testing & Verification

**Health checks:**

```bash
# Check all components
npm run copilot:health

# Manual checks
curl http://localhost:6006              # Phoenix
curl http://localhost:8080/health       # Proxy
curl http://localhost:8080/stats        # Proxy stats
```

**Test telemetry flow:**

```bash
# Send test event
curl -X POST http://localhost:8080/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "completion",
    "prompt": "def hello():",
    "completion": "    return \"Hello World\"",
    "accepted": true,
    "language": "python",
    "model": "gpt-4"
  }'

# Check Phoenix UI for trace
```

**Verify extension:**

1. Open VSCode
2. Open Copilot chat
3. Send message: "Write a hello world function"
4. Check status bar: TZ icon should show green checkmark
5. Open Phoenix UI: http://localhost:6006
6. Filter traces: `copilot.event_type = "chat"`
7. Should see trace with your message

## Integration with Universal Chat Pipeline

Copilot telemetry integrates with the Universal Chat Ingestion Pipeline (ADR-006).

**Data flow:**

```
Copilot → Telemetry Proxy → Phoenix → Chat Parser
  → Zod Fingerprinting → TypeScript Pipeline → n8n Workflow
```

**Fingerprinting example:**

```typescript
// Copilot chat message fingerprint
const copilotChatSchema = z.object({
  event_type: z.literal("chat"),
  prompt: z.string(),
  completion: z.string(),
  model: z.string(),
  timestamp: z.string().datetime(),
});

// Used by Universal Chat Parser to identify Copilot traces
```

See [N8N_PHOENIX_QUICK_REF.md](N8N_PHOENIX_QUICK_REF.md) for n8n integration details.

## Troubleshooting

**Extension not sending telemetry:**

1. Check extension is enabled: Extensions → TZ Telemetry Collector
2. Verify settings: `.vscode/settings.json`
3. Check status bar: TZ icon should be visible
4. Reload VSCode: `Ctrl+Shift+P` → "Reload Window"
5. Check proxy logs: `npm run copilot:logs`

**Proxy not receiving events:**

```bash
# Check proxy is running
curl http://localhost:8080/health

# View logs
npm run copilot:logs

# Restart proxy
npm run copilot:restart
```

**Phoenix not showing traces:**

```bash
# Check Phoenix is running
docker ps | Select-String phoenix

# Check collector endpoint
curl http://localhost:6006/v1/traces

# Enable console export for debugging
# In .env.local: ENABLE_CONSOLE_EXPORT=true
```

**Port conflicts:**

```bash
# Proxy port 8080 in use
# Change in .env.local: TELEMETRY_PROXY_PORT=8081
# Update extension settings: "tz.telemetry.endpoint": "http://localhost:8081/telemetry"

# Phoenix port 6006 in use
docker run -p 6007:6006 --name phoenix arizephoenix/phoenix:latest
# Update .env.local: PHOENIX_ENDPOINT=http://localhost:6007
```

## Best Practices

**Data privacy:**

- Telemetry captures code snippets - ensure compliance with company policies
- Exclude sensitive files via `.gitignore` patterns in extension settings
- Review exported datasets before sharing

**Performance:**

- Proxy uses async processing - minimal impact on VSCode
- Batch exports during off-hours for large datasets
- Use Parquet format for datasets > 100MB

**Dataset quality:**

- Filter by `accepted: true` for fine-tuning datasets
- Include language-specific datasets for targeted training
- Exclude short completions (< 50 chars) to reduce noise

## Resources

- **Technical Reference**: [COPILOT_OBSERVABILITY_REFERENCE.md](COPILOT_OBSERVABILITY_REFERENCE.md)
- **Phoenix Setup**: [PHOENIX_SETUP.md](PHOENIX_SETUP.md)
- **n8n Integration**: [N8N_PHOENIX_QUICK_REF.md](N8N_PHOENIX_QUICK_REF.md)
- **Chat Parser**: [CHAT_PARSER_INTEGRATION.md](CHAT_PARSER_INTEGRATION.md)
