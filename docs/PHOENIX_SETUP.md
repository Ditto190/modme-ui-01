# Phoenix Setup Guide

**Last Updated**: February 8, 2026

Complete setup instructions for Phoenix observability in development and production environments.

## Prerequisites

- Python 3.8+
- Docker (for containerized Phoenix server)
- pip or uv (Python package manager)

## Quick Setup (Automated)

```bash
# Unix/macOS
./scripts/setup-phoenix.sh

# Windows
.\scripts\setup-phoenix.ps1

# Or via npm
npm run phoenix:setup
```

The script installs dependencies, configures environment, and starts Phoenix server.

## Manual Setup

### Step 1: Install Python Dependencies

```bash
cd agent
pip install arize-phoenix \
  openinference-instrumentation-anthropic \
  openinference-instrumentation-openai \
  openinference-instrumentation-google-generativeai \
  opentelemetry-api \
  opentelemetry-sdk \
  opentelemetry-exporter-otlp-proto-http

# Or from requirements file
pip install -r requirements-phoenix.txt
```

### Step 2: Configure Environment

Create `.env.local` in project root:

```bash
# Phoenix server endpoints
PHOENIX_ENDPOINT=http://localhost:6006
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006/v1/traces
PHOENIX_PROJECT=github-copilot

# Service identification
SERVICE_NAME=modme-agent
SERVICE_VERSION=0.1.0
ENVIRONMENT=development

# Feature toggles
ENABLE_PHOENIX=true
ENABLE_GREPTIME_EXPORT=true
ENABLE_CONSOLE_EXPORT=false
```

### Step 3: Start Phoenix Server

**Option A: Docker Compose (Recommended)**

```bash
docker-compose -f docker-compose.phoenix.yml up -d
```

**Option B: Docker Run**

```bash
docker run -d \
  --name phoenix-server \
  -p 6006:6006 \
  -p 4317:4317 \
  -v phoenix-data:/data \
  -e PHOENIX_SQL_DATABASE_URL=sqlite:////data/phoenix.db \
  arizephoenix/phoenix:latest
```

**Option C: Python (No Docker)**

```bash
pip install arize-phoenix
python -m phoenix.server.main serve
```

Server starts on http://localhost:6006

### Step 4: Verify Installation

```bash
# Check server health
curl http://localhost:6006

# Test from Python
python -c "from observability import initialize_phoenix; t,c = initialize_phoenix(); print(f'✅ Phoenix: {c.phoenix_endpoint}')"
```

Open http://localhost:6006 in browser - you should see Phoenix UI.

### Step 5: Initialize in Agent

Add to your agent entry point (`agent/main.py`):

```python
from observability import initialize_phoenix, instrument_all_providers

# Initialize Phoenix tracing
tracer, config = initialize_phoenix(
    enable_greptime=True,   # Dual export to GreptimeDB
    enable_console=False     # Debug console output
)

# Auto-instrument AI providers
instrumentors = instrument_all_providers()

print(f"✅ Phoenix ready: {config.phoenix_endpoint}")
```

### Step 6: Test Tracing

Create `test_phoenix.py`:

```python
from observability import initialize_phoenix, instrument_all_providers
import anthropic

# Initialize
tracer, config = initialize_phoenix(enable_console=True)
instrumentors = instrument_all_providers()

# Make a test call
client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    messages=[{"role": "user", "content": "Say hello"}],
    max_tokens=50
)

print(f"✅ Response: {response.content[0].text}")
print(f"📊 Check traces at: {config.phoenix_endpoint}")
```

Run:

```bash
python test_phoenix.py
```

Check http://localhost:6006 for the traced request.

## Production Setup

### PostgreSQL Backend

**1. Install PostgreSQL:**

```bash
# Ubuntu/Debian
sudo apt-get install postgresql

# macOS
brew install postgresql

# Or use Docker
docker run -d \
  --name phoenix-postgres \
  -e POSTGRES_PASSWORD=phoenix \
  -e POSTGRES_DB=phoenix \
  -p 5432:5432 \
  postgres:15
```

**2. Update Phoenix configuration:**

```bash
docker run -d \
  --name phoenix-server \
  -p 6006:6006 \
  -e PHOENIX_SQL_DATABASE_URL=postgresql://postgres:phoenix@host.docker.internal:5432/phoenix \
  arizephoenix/phoenix:latest
```

**3. Enable persistence:**

```bash
# Mount volumes for Phoenix data
docker run -d \
  --name phoenix-server \
  -p 6006:6006 \
  -v phoenix-config:/config \
  -v phoenix-logs:/logs \
  -e PHOENIX_SQL_DATABASE_URL=postgresql://... \
  arizephoenix/phoenix:latest
```

### GreptimeDB Integration

Phoenix can dual-export to GreptimeDB for time-series analytics.

**1. Start GreptimeDB:**

```bash
docker-compose -f docker-compose.greptime.yml up -d
```

**2. Configure dual export:**

```python
from observability import initialize_phoenix

tracer, config = initialize_phoenix(
    enable_greptime=True,  # Enable dual export
    greptime_endpoint="http://localhost:4000/v1/otlp/v1/traces"
)
```

**3. Verify export:**

```bash
# Check GreptimeDB received traces
curl http://localhost:4000/v1/sql -d "SELECT COUNT(*) FROM spans"
```

### MCP Server Configuration

Configure Phoenix as MCP tool in `.copilot/mcp-servers/phoenix-mcp.json`:

```json
{
  "server_name": "phoenix",
  "server_type": "http",
  "endpoint": "http://localhost:6006/v1/mcp",
  "capabilities": {
    "traces": true,
    "projects": true,
    "spans": true
  }
}
```

Use in Copilot Chat:

```
@phoenix list projects
@phoenix get traces --project github-copilot --limit 5
@phoenix get span <span-id>
```

## GitHub Copilot Integration

Phoenix traces GitHub Copilot via VSCode extension that captures telemetry.

**1. Install dependencies:**

```bash
npm install @vscode/extension-telemetry
npm install @opentelemetry/api
```

**2. Create extension** (see [VSCode Extension Template](https://code.visualstudio.com/api/get-started/your-first-extension))

**3. Capture Copilot events:**

```typescript
// extension.ts
import * as vscode from "vscode";
import TelemetryReporter from "@vscode/extension-telemetry";
import { trace } from "@opentelemetry/api";

export function activate(context: vscode.ExtensionContext) {
  const tracer = trace.getTracer("copilot-phoenix-extension");

  // Listen to Copilot events
  vscode.chat.onDidPerformAction((event) => {
    const span = tracer.startSpan("copilot.request");
    span.setAttribute("llm.model_name", event.model);
    span.setAttribute("llm.input_messages", JSON.stringify(event.messages));
    // ... capture response
    span.end();
  });
}
```

**4. Configure OTLP export:**

```typescript
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

const exporter = new OTLPTraceExporter({
  url: "http://localhost:6006/v1/traces",
});
```

## Troubleshooting

**Dependencies not installing:**

```bash
# Upgrade pip
python -m pip install --upgrade pip

# Install with verbose output
pip install -v arize-phoenix
```

**Port 6006 in use:**

```bash
# Find process
netstat -ano | findstr :6006  # Windows
lsof -i :6006                 # Unix

# Kill process or use different port
docker run -p 6007:6006 --name phoenix arizephoenix/phoenix:latest
```

**Phoenix not receiving traces:**

```python
# Enable console debug output
tracer, config = initialize_phoenix(enable_console=True)

# Check environment
print(config.phoenix_collector_endpoint)

# Test OTLP endpoint
import requests
response = requests.post(config.phoenix_collector_endpoint, json={})
print(response.status_code)  # Should be 405 or 400, not connection error
```

**Module not found: observability:**

```bash
# Ensure you're in agent directory
cd agent

# Add to Python path
export PYTHONPATH="."  # Unix
$env:PYTHONPATH="."    # PowerShell
```

## Next Steps

- **Usage Guide**: [PHOENIX_GUIDE.md](PHOENIX_GUIDE.md)
- **API Reference**: [PHOENIX_REFERENCE.md](PHOENIX_REFERENCE.md)
- **Phoenix Docs**: https://docs.arize.com/phoenix
