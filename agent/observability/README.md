# ModMe GenUI Observability Package

> OpenTelemetry + GreptimeDB + Phoenix observability for Python ADK agents and React/Next.js frontends

## Overview

This package provides unified observability (metrics, logs, traces) for the ModMe GenUI Workbench dual-runtime architecture:

- **Python Agent** (FastAPI + Google ADK) → OpenTelemetry → GreptimeDB
- **React Frontend** (Next.js 16) → OpenTelemetry → GreptimeDB
- **GitHub Copilot** (VSCode) → Phoenix → Dataset Export

## Features

- ✅ **Metrics**: Counter, Gauge, Histogram (Prometheus-compatible)
- ✅ **Traces**: Distributed tracing across Python and TypeScript
- ✅ **Logs**: Structured log ingestion (planned)
- ✅ **Authentication**: Basic Auth support
- ✅ **Auto-instrumentation**: FastAPI, React hooks
- ✅ **Copilot Telemetry**: GitHub Copilot interaction capture
- ✅ **Dataset Export**: JSONL, CSV, Parquet for fine-tuning
- ✅ **Graceful degradation**: App works without observability

## Quick Start

### 1. Install GreptimeDB

```bash
# Docker (recommended)
docker run -d -p 4000-4004:4000-4004 \
  -v greptimedb_data:/tmp/greptimedb \
  greptime/greptimedb:latest standalone start

# Or use setup script
./scripts/setup-greptime.sh    # Unix/macOS/Linux
.\scripts\setup-greptime.ps1   # Windows
```

### 2. Configure Environment

```bash
GREPTIME_HOST=localhost:4000
GREPTIME_DB=public
GREPTIME_USERNAME=
GREPTIME_PASSWORD=
```

### 3. Use in Code

**Python:**

```python
from observability import initialize_observability

# Auto-initializes if GREPTIME_HOST is set
meter, tracer, config = initialize_observability()

# Track metrics
counter = meter.create_counter("my_metric")
counter.add(1, {"label": "value"})

# Create traces
with tracer.start_as_current_span("operation") as span:
    span.set_attribute("key", "value")
    # Your code
```

**TypeScript:**

```typescript
import { initializeObservability } from "./greptime-config";

const { meter, tracer } = initializeObservability();

const counter = meter.createCounter("ui_metric");
counter.add(1, { action: "click" });
```

## GitHub Copilot Observability

### Start Copilot Telemetry Capture

**Complete guide:** [docs/COPILOT_OBSERVABILITY_GUIDE.md](../../docs/COPILOT_OBSERVABILITY_GUIDE.md)

```bash
# Start Phoenix + Telemetry Proxy
.\scripts\start-copilot-observability.ps1   # Windows
./scripts/start-copilot-observability.sh    # Unix/macOS

# View traces in Phoenix UI
# http://localhost:6006

# Export datasets for fine-tuning
python -m agent.observability.export_copilot_dataset \
    --output-dir ./datasets \
    --format jsonl \
    --finetune-format \
    --days-back 7
```

## Module Reference

### Core Observability

- **`greptime_config.py`** - GreptimeDB client configuration
- **`greptime_logger.py`** - Structured logging to GreptimeDB
- **`phoenix_config.py`** - Phoenix tracing configuration
- **`phoenix_instrumentors.py`** - Auto-instrumentation helpers

### Copilot Telemetry

- **`copilot_phoenix_proxy.py`** - FastAPI proxy server for TZ extension
- **`vscode_copilot_telemetry.py`** - OpenTelemetry adapter for Copilot
- **`export_copilot_dataset.py`** - Dataset export utility (JSONL, CSV, Parquet)

### Data Ingestion

- **`conversation_ingestion.py`** - Conversation data ingestion
- **`provider_adapters.py`** - Multi-provider LLM adapters
- **`custom_provider_tracer.py`** - Custom provider tracing

## Documentation

- **Complete Reference**: [docs/GREPTIME_OBSERVABILITY.md](../../docs/inbox/GREPTIME_OBSERVABILITY.md)
- **Quick Start Guide**: [docs/GREPTIME_QUICKSTART.md](../../docs/inbox/GREPTIME_QUICKSTART.md)
- **Copilot Observability**: [docs/COPILOT_OBSERVABILITY_GUIDE.md](../../docs/COPILOT_OBSERVABILITY_GUIDE.md)
- **Implementation Summary**: [GREPTIME_IMPLEMENTATION_SUMMARY.md](../../GREPTIME_IMPLEMENTATION_SUMMARY.md)

## Architecture

```
Python Agent ──┐
               ├──> GreptimeDB ──> Grafana
React UI ──────┘   (OTLP/HTTP)

VSCode Copilot ──> Proxy ──> Phoenix ──> Dataset Export
```

## Dependencies

**Python (already installed):**

- `opentelemetry-api`
- `opentelemetry-sdk`
- `opentelemetry-exporter-otlp-proto-http`

**Copilot Telemetry (install with):**

```bash
pip install -r requirements-phoenix.txt
```

**TypeScript (install with npm):**

- `@opentelemetry/api`
- `@opentelemetry/sdk-metrics`
- `@opentelemetry/sdk-trace-node`
- `@opentelemetry/exporter-metrics-otlp-proto`
- `@opentelemetry/exporter-trace-otlp-proto`

## Key Metrics

| Metric                   | Type      | Description      | Labels                |
| ------------------------ | --------- | ---------------- | --------------------- |
| `http_requests_total`    | Counter   | HTTP requests    | `endpoint`, `status`  |
| `agent_tool_calls_total` | Counter   | Tool invocations | `tool_name`, `status` |
| `state_elements_count`   | Gauge     | UI elements      | -                     |
| `ui_interactions_total`  | Counter   | User actions     | `action`, `component` |
| `ui_render_duration_ms`  | Histogram | Render time      | `component`           |

## Query Examples

**PromQL (Grafana):**

```promql
rate(http_requests_total[5m])
```

**SQL:**

```sql
SELECT * FROM opentelemetry_metrics LIMIT 10;
```

## Troubleshooting

```bash
# Check GreptimeDB is running
curl http://localhost:4000/health

# Test metrics endpoint
curl http://localhost:4000/v1/otlp/v1/metrics -X POST

# View logs
docker logs $(docker ps -q --filter ancestor=greptime/greptimedb)
```

## License

Same as parent project (see root LICENSE file)

## Support

- Check [GREPTIME_OBSERVABILITY.md](../../docs/inbox/GREPTIME_OBSERVABILITY.md)
- Review [examples.ts](./examples.ts) for usage patterns
- Verify GreptimeDB health: `curl http://localhost:4000/health`

---

**Version**: 1.0.0
**Last Updated**: January 2, 2026
