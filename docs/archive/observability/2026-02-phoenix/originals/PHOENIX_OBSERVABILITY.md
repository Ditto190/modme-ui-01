# Phoenix + OpenInference Observability Integration

**Last Updated**: February 8, 2026

## Overview

This guide explains how to use **Phoenix** (Arize's AI observability platform) with **OpenInference** semantic conventions to collect, store, and visualize AI agent conversations from **all AI providers**.

### Supported Providers

✅ **Auto-Instrumented** (SDK-based): Anthropic, OpenAI, Google Generative AI
🔧 **Extension-Based**: GitHub Copilot (via VSCode extension)
📝 **Manual Tracing**: Claude Desktop, Windsurf, Cursor, any custom LLM

### Quick Navigation

- **[AI Provider Integration Guide](./PHOENIX_AI_PROVIDER_INTEGRATION.md)** - How to integrate any AI provider
- **[VSCode Copilot Extension](./VSCODE_COPILOT_EXTENSION.md)** - Create extension for Copilot telemetry
- **[Implementation Summary](./PHOENIX_PROVIDER_INTEGRATION_SUMMARY.md)** - Quick reference
- **[Quick Reference](./PHOENIX_QUICK_REFERENCE.md)** - Command cheat sheet
- **[Architecture](./PHOENIX_ARCHITECTURE.md)** - System design

### Architecture

```
┌─────────────────────────────────────────────────────┐
│ AI Agent Providers                                  │
│  ├─ Anthropic/Claude (Python SDK)                   │
│  ├─ Google/Gemini (genai-toolbox + Python SDK)      │
│  └─ GitHub Copilot (VSCode Extension)               │
└────────────────┬────────────────────────────────────┘
                 │
                 │ OpenInference Auto-Instrumentation
                 ▼
┌─────────────────────────────────────────────────────┐
│ OpenTelemetry Layer                                 │
│  ├─ OpenInference Semantic Conventions              │
│  ├─ Span Processors (Batch)                         │
│  └─ Multi-Exporter (Phoenix + GreptimeDB)           │
└───────┬──────────────────────┬──────────────────────┘
        │                      │
        ▼                      ▼
   ┌─────────┐          ┌──────────────┐
   │ Phoenix │          │ GreptimeDB   │
   │ Server  │          │ (optional)   │
   │ (6006)  │          │ (4000)       │
   └────┬────┘          └──────────────┘
        │
        ▼
   ┌─────────────┐
   │ SQLite/PG   │
   │ (traces DB) │
   └─────────────┘
        │
        ▼
   ┌─────────────┐
   │ Phoenix UI  │
   │ localhost:  │
   │   6006      │
   └─────────────┘
```

### Key Features

- **Dual Backend Support**: Export traces to both Phoenix (for LLM-specific observability) and GreptimeDB (for time-series analytics)
- **Multi-Provider Instrumentation**: Auto-instrument Anthropic, OpenAI, and Google Generative AI SDKs
- **OpenInference Standards**: LLM-specific span attributes (tokens, model, cost, latency)
- **Rich UI**: Phoenix web interface for trace visualization and analysis
- **Local Storage**: SQLite for development, PostgreSQL for production
- **Zero Code Changes**: Auto-instrumentation requires minimal integration

---

## Quick Start

### 1. Install Dependencies

```bash
cd agent
pip install -r requirements-phoenix.txt
```

### 2. Start Phoenix Server

**Option A: Docker (Recommended)**

```bash
docker-compose -f docker-compose.phoenix.yml up -d
```

**Option B: Python**

```bash
python -m phoenix.server.main serve
```

Phoenix UI will be available at: **http://localhost:6006**

### 3. Configure Environment

```bash
cp .env.phoenix.example .env.local
# Edit .env.local with your settings
```

### 4. Initialize in Your Agent

```python
# agent/main.py
from observability.phoenix_config import initialize_phoenix
from observability.phoenix_instrumentors import instrument_all_providers

# Initialize Phoenix
tracer, config = initialize_phoenix(
    enable_greptime=True,  # Dual export to GreptimeDB
    enable_console=False    # Debug mode
)

# Auto-instrument all providers
instrumentors = instrument_all_providers()

# Your agent code continues...
```

### 5. View Traces

Open **http://localhost:6006** in your browser to view traces, analyze performance, and debug issues.

---

## Configuration

### Environment Variables

| Variable                     | Default                           | Description               |
| ---------------------------- | --------------------------------- | ------------------------- |
| `PHOENIX_ENDPOINT`           | `http://localhost:6006`           | Phoenix UI endpoint       |
| `PHOENIX_COLLECTOR_ENDPOINT` | `http://localhost:6006/v1/traces` | OTLP collector endpoint   |
| `SERVICE_NAME`               | `modme-agent`                     | Service identifier        |
| `ENABLE_PHOENIX`             | `true`                            | Enable Phoenix tracing    |
| `ENABLE_GREPTIME_EXPORT`     | `true`                            | Dual export to GreptimeDB |
| `ENABLE_CONSOLE_EXPORT`      | `false`                           | Console debugging         |

### Phoenix Configuration

```python
from observability.phoenix_config import PhoenixConfig, initialize_phoenix

# Custom configuration
config = PhoenixConfig(
    phoenix_endpoint="http://localhost:6006",
    collector_endpoint="http://localhost:6006/v1/traces",
    service_name="my-agent",
    enable_console_export=True,  # Debug mode
    enable_greptime_export=True  # Dual export
)

tracer = setup_phoenix_tracing(config)
```

---

## Provider Instrumentation

### Anthropic (Claude)

Auto-instruments the Anthropic Python SDK:

```python
from anthropic import Anthropic
from observability.phoenix_instrumentors import AnthropicInstrumentor

# Instrument (one-time setup)
instrumentor = AnthropicInstrumentor()
instrumentor.instrument()

# Use Anthropic SDK normally - traces are captured automatically
client = Anthropic(api_key="your-key")
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)

# Traces include:
# - Model name, temperature, max_tokens
# - Token usage (input/output)
# - Message content
# - Latency and errors
```

### OpenAI (GitHub Copilot)

Auto-instruments OpenAI SDK (used by GitHub Copilot):

```python
from openai import OpenAI
from observability.phoenix_instrumentors import OpenAIInstrumentor

# Instrument
instrumentor = OpenAIInstrumentor()
instrumentor.instrument()

# Use OpenAI SDK normally
client = OpenAI(api_key="your-key")
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)

# Traces include:
# - Model name, parameters
# - Token counts and costs
# - Function/tool calls
# - Streaming responses
```

### Google Generative AI (Gemini)

Auto-instruments Google's generative AI SDK:

```python
import google.generativeai as genai
from observability.phoenix_instrumentors import GoogleGenerativeAIInstrumentor

# Instrument
instrumentor = GoogleGenerativeAIInstrumentor()
instrumentor.instrument()

# Use Google SDK normally
genai.configure(api_key="your-key")
model = genai.GenerativeModel('gemini-2.0-flash')
response = model.generate_content("Hello!")

# Traces include:
# - Model name
# - Token counts
# - Safety ratings
# - Function calling
```

### Instrument All Providers

```python
from observability.phoenix_instrumentors import instrument_all_providers

# Auto-instrument all available providers
instrumentors = instrument_all_providers()

# Returns dict: {"anthropic": ..., "openai": ..., "google": ...}
```

---

## Manual Span Attributes

For custom spans or providers not auto-instrumented:

```python
from observability.phoenix_instrumentors import add_llm_span_attributes
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("custom_llm_call") as span:
    add_llm_span_attributes(
        span,
        provider="anthropic",
        model="claude-3-5-sonnet-20241022",
        input_tokens=150,
        output_tokens=75,
        latency_ms=1234,
        temperature=0.7,
        max_tokens=2048
    )

    # Your LLM call logic...
```

### OpenInference Semantic Attributes

| Attribute                    | Type   | Description                                 |
| ---------------------------- | ------ | ------------------------------------------- |
| `llm.provider`               | string | Provider name (e.g., "anthropic", "openai") |
| `llm.model`                  | string | Model name (e.g., "claude-3-5-sonnet")      |
| `llm.token_count.prompt`     | int    | Input tokens                                |
| `llm.token_count.completion` | int    | Output tokens                               |
| `llm.latency_ms`             | float  | Call latency in milliseconds                |
| `llm.temperature`            | float  | Temperature parameter                       |
| `llm.max_tokens`             | int    | Max tokens parameter                        |

---

## Database Storage Options

### SQLite (Default - Development)

Phoenix uses SQLite by default:

```yaml
# docker-compose.phoenix.yml
environment:
  - PHOENIX_SQL_DATABASE_URL=sqlite:////data/phoenix.db
```

**Pros**: Zero configuration, local file storage
**Cons**: Single-process access, limited scale

### PostgreSQL (Production)

For production deployments:

```yaml
# docker-compose.phoenix.yml
services:
  phoenix:
    environment:
      - PHOENIX_SQL_DATABASE_URL=postgresql://user:password@postgres:5432/phoenix

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=phoenix
      - POSTGRES_PASSWORD=phoenix_password
      - POSTGRES_DB=phoenix
```

**Pros**: Concurrent access, scalable, production-ready
**Cons**: Requires PostgreSQL instance

---

## Dual Export (Phoenix + GreptimeDB)

Export traces to both Phoenix and GreptimeDB for different use cases:

- **Phoenix**: LLM-specific observability, rich UI, trace analysis
- **GreptimeDB**: Time-series analytics, long-term storage, metrics

```python
from observability.phoenix_config import initialize_phoenix

# Enable dual export
tracer, config = initialize_phoenix(
    enable_greptime=True  # Exports to both backends
)
```

### When to Use Each Backend

| Use Case                | Backend    |
| ----------------------- | ---------- |
| LLM trace visualization | Phoenix    |
| Token usage analytics   | Phoenix    |
| Debugging agent flows   | Phoenix    |
| Long-term metrics       | GreptimeDB |
| Time-series queries     | GreptimeDB |
| Cost analysis           | Both       |

---

## Genai-Toolbox Integration

The genai-toolbox (Go-based MCP server) has built-in telemetry support. Configure it to send traces to Phoenix:

### 1. Configure OTLP Endpoint

```bash
# When starting genai-toolbox
cd agent/genai-toolbox
go run main.go \
  --telemetry-otlp http://localhost:6006/v1/traces \
  --telemetry-service-name genai-toolbox
```

### 2. Docker Configuration

```yaml
# docker-compose.yml
services:
  genai-toolbox:
    environment:
      - TELEMETRY_OTLP_ENDPOINT=http://phoenix:6006/v1/traces
      - TELEMETRY_SERVICE_NAME=genai-toolbox
```

### 3. Trace Database Tool Calls

genai-toolbox automatically traces:

- SQL query execution
- Connection pooling
- Query latency
- Error rates

All traces appear in Phoenix UI under service: `genai-toolbox`

---

## VSCode Copilot Integration

Capture GitHub Copilot interactions via the existing telemetry adapter:

### 1. Update VSCode Copilot Telemetry

```python
# agent/observability/vscode_copilot_telemetry.py
from observability.phoenix_instrumentors import add_llm_span_attributes
from opentelemetry import trace

class VSCodeCopilotTelemetryAdapter:
    def __init__(self):
        self.tracer = trace.get_tracer(__name__)

    def log_chat_request(self, request_id: str, prompt: str):
        with self.tracer.start_as_current_span("copilot_chat_request") as span:
            add_llm_span_attributes(
                span,
                provider="openai",  # GitHub Copilot uses OpenAI
                model="gpt-4",
                # Add more attributes...
            )
            # Log to GreptimeDB or Phoenix
```

### 2. VSCode Extension Setup

See: `docs/VSCODE_COPILOT_TELEMETRY_GUIDE.md` for VSCode extension integration.

---

## Phoenix UI Features

### Trace Explorer

- View all traces by service, model, or time range
- Filter by provider, latency, errors
- Drill down into span details

### Token Analytics

- Token usage by model and endpoint
- Cost estimation
- Usage trends over time

### Latency Analysis

- P50, P95, P99 latencies
- Identify slow calls
- Compare models

### Error Tracking

- Exception traces
- Error rates by model
- Root cause analysis

---

## Troubleshooting

### Phoenix Server Not Starting

```bash
# Check if port 6006 is in use
lsof -i :6006  # macOS/Linux
netstat -ano | findstr :6006  # Windows

# Check Docker logs
docker logs phoenix-server
```

### Traces Not Appearing

1. **Check Phoenix is running**: Visit http://localhost:6006
2. **Verify instrumentation**: Ensure `instrument_all_providers()` is called
3. **Check collector endpoint**: Should be `http://localhost:6006/v1/traces`
4. **Enable console export**: Set `enable_console_export=True` to debug

### OpenInference Installation Issues

```bash
# Upgrade pip
pip install --upgrade pip

# Install specific versions
pip install arize-phoenix==4.0.0
pip install openinference-instrumentation-anthropic==0.1.0
```

### GreptimeDB Dual Export Not Working

```bash
# Check GreptimeDB is running
curl http://localhost:4000/health

# Verify environment variables
echo $GREPTIME_HOST
echo $GREPTIME_DB
```

---

## Performance Considerations

### Sampling

For high-volume production workloads, implement sampling:

```python
from opentelemetry.sdk.trace.sampling import ParentBasedTraceIdRatio

# Sample 10% of traces
sampler = ParentBasedTraceIdRatio(0.1)

provider = TracerProvider(
    sampler=sampler,
    resource=config.get_resource()
)
```

### Batch Processing

Traces are batched by default (5 seconds or 512 spans):

```python
from opentelemetry.sdk.trace.export import BatchSpanProcessor

processor = BatchSpanProcessor(
    exporter,
    max_queue_size=2048,
    schedule_delay_millis=5000,
    max_export_batch_size=512
)
```

### Storage Management

**SQLite**: Periodically archive or delete old traces
**PostgreSQL**: Use partitioning for large datasets
**GreptimeDB**: Automatic time-based retention policies

---

## Security & Privacy

### Sensitive Data

OpenInference instrumenters may capture:

- Prompts and responses
- User inputs
- API keys (in headers)

**Mitigation**:

1. Use Phoenix's data redaction features
2. Configure instrumenters to exclude message content:

```python
from openinference.instrumentation.anthropic import AnthropicInstrumentor

instrumentor = AnthropicInstrumentor()
instrumentor.instrument(
    tracer_provider=provider,
    skip_dep_check=True,
    # Exclude message content
    capture_message_content=False
)
```

### Network Security

- Use HTTPS for remote Phoenix deployments
- Secure PostgreSQL with TLS
- Implement authentication for Phoenix UI (enterprise feature)

---

## Additional Provider Integrations

Phoenix now supports **all AI providers** beyond just SDK-based ones:

### VSCode Copilot Integration

Capture GitHub Copilot interactions via custom VSCode extension:

```python
# agent/main.py
from observability.vscode_copilot_telemetry import create_fastapi_endpoint

app.include_router(create_fastapi_endpoint())
# Endpoint: POST /api/telemetry/copilot
```

**Guide**: [VSCODE_COPILOT_EXTENSION.md](./VSCODE_COPILOT_EXTENSION.md)

### Custom Provider Tracing

For Claude Desktop, Windsurf, Cursor, or any custom LLM:

```python
from observability.custom_provider_tracer import CustomProviderTracer

tracer = CustomProviderTracer(provider="claude-desktop")

with tracer.trace_llm_call(model="claude-3-5-sonnet") as span:
    response = your_llm_api.chat("Hello!")
    tracer.set_output(span, response["text"])
    tracer.set_tokens(span, input_tokens=5, output_tokens=20)
```

**Guide**: [PHOENIX_AI_PROVIDER_INTEGRATION.md](./PHOENIX_AI_PROVIDER_INTEGRATION.md)

---

## Documentation Index

### Getting Started

- **[PHOENIX_OBSERVABILITY.md](./PHOENIX_OBSERVABILITY.md)** (This file) - Core setup
- **[PHOENIX_MANUAL_SETUP.md](./PHOENIX_MANUAL_SETUP.md)** - Step-by-step installation
- **[PHOENIX_QUICK_REFERENCE.md](./PHOENIX_QUICK_REFERENCE.md)** - Command cheat sheet

### Provider Integration

- **[PHOENIX_AI_PROVIDER_INTEGRATION.md](./PHOENIX_AI_PROVIDER_INTEGRATION.md)** - All provider integrations
- **[VSCODE_COPILOT_EXTENSION.md](./VSCODE_COPILOT_EXTENSION.md)** - VSCode extension guide
- **[PHOENIX_PROVIDER_INTEGRATION_SUMMARY.md](./PHOENIX_PROVIDER_INTEGRATION_SUMMARY.md)** - Quick reference

### Architecture & Implementation

- **[PHOENIX_ARCHITECTURE.md](./PHOENIX_ARCHITECTURE.md)** - System design
- **[PHOENIX_IMPLEMENTATION_SUMMARY.md](./PHOENIX_IMPLEMENTATION_SUMMARY.md)** - Implementation details

### Source Code

- **[agent/observability/phoenix_config.py](../agent/observability/phoenix_config.py)** - Phoenix setup
- **[agent/observability/phoenix_instrumentors.py](../agent/observability/phoenix_instrumentors.py)** - Auto-instrumentors
- **[agent/observability/vscode_copilot_telemetry.py](../agent/observability/vscode_copilot_telemetry.py)** - Copilot adapter
- **[agent/observability/custom_provider_tracer.py](../agent/observability/custom_provider_tracer.py)** - Custom provider tracer

---

## Next Steps

1. ✅ **Phoenix is running** - http://localhost:6006
2. ✅ **Dependencies installed** - All Python packages ready
3. ⏳ **Integrate with your agent** - Add initialization code to `agent/main.py`
4. ⏳ **Test with AI providers** - Make LLM calls and view traces
5. ⏳ **Explore advanced features** - Custom providers, VSCode Copilot, dashboards

**Ready to integrate?** Start with [PHOENIX_AI_PROVIDER_INTEGRATION.md](./PHOENIX_AI_PROVIDER_INTEGRATION.md)

---

## Next Steps (Original)

1. **Explore Phoenix UI**: http://localhost:6006
2. **Instrument Your Providers**: Add auto-instrumentation for all AI providers
3. **Configure Storage**: Choose SQLite (dev) or PostgreSQL (prod)
4. **Enable Dual Export**: Send traces to both Phoenix and GreptimeDB
5. **Monitor genai-toolbox**: Configure OTLP endpoint for database tool traces
6. **Capture VSCode Copilot**: Integrate with existing telemetry adapter

---

## Resources

- **Phoenix Docs**: https://docs.arize.com/phoenix
- **OpenInference Spec**: https://github.com/Arize-ai/openinference
- **OpenTelemetry**: https://opentelemetry.io/docs/
- **GreptimeDB Integration**: `docs/GREPTIME_OBSERVABILITY.md`
- **VSCode Integration**: `docs/VSCODE_COPILOT_TELEMETRY_GUIDE.md`

---

## Support

- **Discord**: Join the [Phoenix Discord](https://discord.gg/Dmm69peqjh)
- **GitHub Issues**: [Arize-ai/phoenix](https://github.com/Arize-ai/phoenix/issues)
- **Community**: [OpenInference Community](https://github.com/Arize-ai/openinference/discussions)
