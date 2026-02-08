# Phoenix Observability Guide

**Status**: ✅ Production Ready
**Last Updated**: February 8, 2026

## Overview

Phoenix (Arize AI) provides LLM observability with OpenInference semantic conventions for tracing AI agent conversations.

## Quick Start

```bash
# Automated setup
npm run phoenix:setup

# Or manual
pip install -r agent/requirements-phoenix.txt
docker-compose -f docker-compose.phoenix.yml up -d
```

**Initialize in your agent:**

```python
from observability import initialize_phoenix, instrument_all_providers

tracer, config = initialize_phoenix(enable_greptime=True)
instrumentors = instrument_all_providers()
```

**View traces:** <http://localhost:6006>

## Supported Providers

**Auto-Instrumented** (zero code changes):

- ✅ Anthropic/Claude (Python SDK)
- ✅ OpenAI (Python SDK)
- ✅ Google Generative AI (Python SDK + genai-toolbox)

**Manual Integration**:

- 🔧 GitHub Copilot (VSCode extension)
- 📝 Claude Desktop, Windsurf, Cursor (custom spans)

## Architecture

```
AI Providers → OpenInference Auto-Instrumentation → OpenTelemetry
  → Multi-Exporter → [Phoenix (6006) + GreptimeDB (optional)]
  → Phoenix UI (traces, tokens, latency, errors)
```

**Key Components:**

| Component         | Purpose                          | Endpoint                |
| ----------------- | -------------------------------- | ----------------------- |
| Phoenix Server    | OTLP collector + storage         | :6006                   |
| Phoenix Collector | OTLP trace endpoint              | :6006/v1/traces         |
| Phoenix UI        | Visualization dashboard          | <http://localhost:6006> |
| GreptimeDB        | Time-series analytics (optional) | :4000                   |

## Features

**Dual Export:**

- Primary: Phoenix (LLM-specific observability)
- Optional: GreptimeDB (time-series analytics)

**Captured Metrics:**

- Token usage (input/output/total)
- Model name and version
- Latency (wall clock, first token, throughput)
- Cost estimation
- Error tracking
- Tool calls and responses

**Storage:**

- Dev: SQLite (`phoenix.db`)
- Prod: PostgreSQL

## Usage Examples

### Basic Tracing

```python
# Initialize once at startup
from observability import initialize_phoenix

tracer, config = initialize_phoenix()

# All SDK calls are automatically traced
import anthropic
client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    messages=[{"role": "user", "content": "Hello"}]
)
# Trace appears in Phoenix UI automatically
```

### Multi-Provider

```python
from observability import instrument_all_providers

# Auto-instrument all supported providers
instrumentors = instrument_all_providers()

# Use any provider - traces appear in Phoenix
from anthropic import Anthropic
from openai import OpenAI
from google.generativeai import GenerativeModel

claude = Anthropic().messages.create(...)  # Traced
gpt = OpenAI().chat.completions.create(...)  # Traced
gemini = GenerativeModel("gemini-pro").generate_content(...)  # Traced
```

### Manual Spans

```python
from opentelemetry import trace
from openinference.semconv.trace import SpanAttributes

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("custom_operation") as span:
    span.set_attribute(SpanAttributes.LLM_MODEL_NAME, "custom-model")
    span.set_attribute(SpanAttributes.LLM_INPUT_MESSAGES, [{"role": "user", "content": "test"}])
    # Your logic here
    span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_TOTAL, 150)
```

### Query Traces

```bash
# List projects
npx @arizeai/phoenix-cli projects --endpoint http://localhost:6006

# Get traces
npx @arizeai/phoenix-cli traces --project github-copilot --limit 10

# Export traces
npx @arizeai/phoenix-cli traces ./exports --project github-copilot
```

## Configuration

**Environment variables** (`.env.local`):

```bash
# Phoenix endpoints
PHOENIX_ENDPOINT=http://localhost:6006
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006/v1/traces
PHOENIX_PROJECT=github-copilot

# Service metadata
SERVICE_NAME=modme-agent
SERVICE_VERSION=0.1.0
ENVIRONMENT=development

# Feature flags
ENABLE_PHOENIX=true
ENABLE_GREPTIME_EXPORT=true  # Dual export
ENABLE_CONSOLE_EXPORT=false  # Debug mode
```

## Phoenix UI Features

**Trace Explorer:**

- Filter by model, status, date range
- Search by trace ID or content
- Drill down into span details

**Token Analytics:**

- Input/output token distribution
- Cost estimation by model
- Token usage trends over time

**Latency Analysis:**

- P50/P95/P99 latency metrics
- First token time (streaming)
- Time to completion

**Error Tracking:**

- Failed requests grouped by error type
- Stack traces with context
- Retry analysis

## Troubleshooting

**Phoenix not receiving traces:**

```powershell
# Check Phoenix is running
docker ps | Select-String phoenix

# Test endpoint
curl http://localhost:6006
Invoke-WebRequest http://localhost:6006/v1/traces

# Check environment
python -c "from observability import initialize_phoenix; t,c = initialize_phoenix(); print(c.phoenix_endpoint)"
```

**Port conflicts:**

```bash
# Use different port
docker run -p 6007:6006 --name phoenix arizephoenix/phoenix:latest
# Update .env.local: PHOENIX_ENDPOINT=http://localhost:6007
```

**Missing traces:**

```python
# Enable debug console export
tracer, config = initialize_phoenix(enable_console=True)
# Traces will print to stdout for verification
```

## Resources

- **Setup**: [PHOENIX_SETUP.md](PHOENIX_SETUP.md)
- **Reference**: [PHOENIX_REFERENCE.md](PHOENIX_REFERENCE.md)
- **Phoenix Docs**: <https://docs.arize.com/phoenix>
- **OpenInference**: <https://github.com/Arize-ai/openinference>
- **Discord**: <https://discord.gg/Dmm69peqjh>

Quick Reference — Ports & URLs
Service URL Purpose
Phoenix UI <http://localhost:6006> View traces, projects
Phoenix OTLP <http://localhost:6006/v1/traces> Protobuf trace receiver
Trace Bridge <http://localhost:8787> JSON → OTLP bridge
Bridge Swagger <http://localhost:8787/docs> Interactive API docs
n8n UI <http://localhost:5678> Workflow editor
n8n Webhook <http://localhost:5678/webhook/universal-chat-ingest> Pipeline entry point
n8n MCP <http://localhost:3000> MCP server for n8n
Quick Reference — Test Commands

# 1. Run TypeScript pipeline tests (no services needed)

cd agent-generator && npx tsx src/chat-formats/test-pipeline.ts

# 2. Regenerate OpenAPI spec + client SDK

cd agent-generator && npm run generate:all

# 3. Test bridge directly (bypass n8n)

cd agent-generator && npx tsx src/chat-formats/test-pipeline.ts datasets/chat.json

# Then POST the payload from test output to <http://localhost:8787/ingest>

# 4. Check bridge health

curl <http://localhost:8787/health>

# 5. Check n8n workflow status

curl -H "X-N8N-API-KEY: $N8N_API_KEY" <http://localhost:5678/api/v1/workflows>
