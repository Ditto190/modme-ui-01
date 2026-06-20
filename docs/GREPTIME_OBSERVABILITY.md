# GreptimeDB Observability Integration

> **Unified observability backend for ModMe GenUI Workbench with OpenTelemetry + GreptimeDB**

## Quick Start

### 1. Install Dependencies

Already installed! The required OpenTelemetry packages are in `agent/uv.lock`:

- `opentelemetry-api`
- `opentelemetry-sdk`
- `opentelemetry-exporter-otlp-proto-http`

For Node.js/TypeScript:

```bash
cd src/lib/observability
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.greptime.example .env
```

Edit `.env`:

```bash
# Local development with GreptimeDB standalone
GREPTIME_HOST=localhost:4000
GREPTIME_DB=public
GREPTIME_USERNAME=
GREPTIME_PASSWORD=

# Or use GreptimeCloud
GREPTIME_HOST=your-instance.greptime.cloud:443
GREPTIME_DB=your-database
GREPTIME_USERNAME=your-username
GREPTIME_PASSWORD=your-password
```

### 3. Run GreptimeDB Locally (Optional)

Using Docker:

```bash
docker run --rm -p 4000-4004:4000-4004 \
  -v $(pwd)/greptimedb_data:/tmp/greptimedb \
  greptime/greptimedb:latest standalone start
```

Or using standalone binary:

```bash
# Download from https://github.com/GreptimeTeam/greptimedb/releases
./greptime standalone start
```

### 4. Initialize Observability

**Python (agent/main.py):**

```python
from observability import initialize_observability

# Initialize observability
meter, tracer, config = initialize_observability()

# Create metrics
request_counter = meter.create_counter(
    name="http_requests_total",
    description="Total HTTP requests",
)

# Track tool calls
tool_calls_counter = meter.create_counter(
    name="agent_tool_calls_total",
    description="Total agent tool calls",
)

# Create traces
@app.post("/")
async def endpoint():
    with tracer.start_as_current_span("agent_execution") as span:
        span.set_attribute("agent.name", "WorkbenchAgent")
        # Your code
        request_counter.add(1, {"endpoint": "/"})
        return {"status": "success"}
```

**TypeScript (src/lib/observability/example.ts):**

```typescript
import { initializeObservability } from "./greptime-config";

// Initialize
const { meter, tracer } = initializeObservability();

// Create metrics
const requestCounter = meter.createCounter("ui_requests_total");

// Track UI interactions
function handleUserAction(action: string) {
  requestCounter.add(1, { action });
}

// Create traces
async function fetchData() {
  const span = tracer.startSpan("fetch_data");
  try {
    // Your code
    span.setAttribute("data.source", "api");
    return await fetch("/api/data");
  } finally {
    span.end();
  }
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│         ModMe GenUI Workbench                   │
│                                                  │
│  ┌──────────────────┐   ┌────────────────────┐ │
│  │ Python Agent     │   │ React Frontend     │ │
│  │ (port 8000)      │   │ (port 3000)        │ │
│  │                  │   │                    │ │
│  │ OpenTelemetry    │   │ OpenTelemetry     │ │
│  │ Metrics + Traces │   │ Metrics + Traces  │ │
│  └────────┬─────────┘   └─────────┬──────────┘ │
│           │                       │             │
└───────────┼───────────────────────┼─────────────┘
            │ OTLP/HTTP             │
            │ (Proto)               │
            ▼                       ▼
     ┌──────────────────────────────────┐
     │       GreptimeDB                 │
     │  (Unified Observability Backend) │
     │                                   │
     │  ✓ Metrics (Prometheus-compatible)│
     │  ✓ Logs (structured)              │
     │  ✓ Traces (distributed)           │
     │  ✓ SQL + PromQL query interfaces │
     └──────────────────────────────────┘
                     │
                     ▼
          ┌─────────────────┐
          │ Grafana (optional)│
          │ Dashboards        │
          └─────────────────┘
```

---

## Features

### ✅ Unified Observability

- **Metrics**: Counter, Gauge, Histogram
- **Traces**: Distributed tracing across agent and UI
- **Logs**: Structured log ingestion (planned)
- **Correlation**: Link metrics, traces, and logs with context

### ✅ OpenTelemetry Native

- OTLP/HTTP protocol (protobuf encoding)
- Auto-instrumentation for FastAPI
- Manual instrumentation for custom tools

### ✅ GreptimeDB Backend

- **Time-series optimized**: 10x faster than InfluxDB for observability workloads
- **Prometheus-compatible**: Use PromQL queries
- **SQL interface**: Query with SQL (PostgreSQL wire protocol)
- **Cloud or self-hosted**: Flexible deployment

### ✅ Production-Ready

- Authentication with Basic Auth
- Configurable batch exports (15s intervals)
- Timeout handling (5s timeout)
- Resource metadata (service name, version, environment)

---

## Metrics Reference

### Python Agent Metrics

| Metric Name                        | Type      | Description                  | Labels                         |
| ---------------------------------- | --------- | ---------------------------- | ------------------------------ |
| `http_requests_total`              | Counter   | Total HTTP requests          | `endpoint`, `method`, `status` |
| `agent_tool_calls_total`           | Counter   | Total agent tool calls       | `tool_name`, `status`          |
| `agent_execution_duration_seconds` | Histogram | Agent execution time         | `tool_name`                    |
| `state_elements_count`             | Gauge     | Current UI elements in state |                                |
| `llm_tokens_total`                 | Counter   | Total LLM tokens used        | `model`, `type` (input/output) |

### TypeScript/React Metrics

| Metric Name                       | Type      | Description           | Labels                |
| --------------------------------- | --------- | --------------------- | --------------------- |
| `ui_requests_total`               | Counter   | Total UI requests     | `action`, `component` |
| `ui_render_duration_milliseconds` | Histogram | Component render time | `component`           |
| `ui_interactions_total`           | Counter   | User interactions     | `action`, `target`    |
| `agent_state_updates_total`       | Counter   | State sync updates    | `element_type`        |

---

## Trace Reference

### Python Spans

- `agent_execution` - Full agent execution lifecycle
  - `tool_call:{tool_name}` - Individual tool calls
  - `state_update` - State modifications
  - `llm_request` - LLM API calls
  - `before_model_modifier` - Lifecycle hooks

### TypeScript Spans

- `ui_render` - Component rendering
  - `fetch_agent_state` - State fetching
  - `render_element:{type}` - Element rendering
- `user_action:{action}` - User interactions

---

## Querying Data

### PromQL Examples

Query GreptimeDB using Prometheus-compatible PromQL:

```promql
# Request rate
rate(http_requests_total[5m])

# Tool call error rate
rate(agent_tool_calls_total{status="error"}[5m])

# 95th percentile execution time
histogram_quantile(0.95, agent_execution_duration_seconds)

# Current elements in state
state_elements_count
```

### SQL Examples

Query using PostgreSQL wire protocol:

```sql
-- Average request rate per minute
SELECT
  ts_bucket('1 minute', greptime_timestamp) AS time,
  count(*) AS requests
FROM opentelemetry_metrics
WHERE metric_name = 'http_requests_total'
GROUP BY time
ORDER BY time DESC
LIMIT 60;

-- Tool call breakdown
SELECT
  labels->>'tool_name' AS tool,
  count(*) AS calls
FROM opentelemetry_metrics
WHERE metric_name = 'agent_tool_calls_total'
GROUP BY tool
ORDER BY calls DESC;

-- Distributed trace analysis
SELECT
  trace_id,
  span_name,
  duration_ms,
  attributes->>'tool_name' AS tool
FROM opentelemetry_traces
WHERE span_name LIKE 'tool_call:%'
ORDER BY duration_ms DESC
LIMIT 10;
```

---

## Configuration Reference

### Environment Variables

| Variable            | Description            | Default             | Required   |
| ------------------- | ---------------------- | ------------------- | ---------- |
| `GREPTIME_HOST`     | GreptimeDB host:port   | `localhost:4000`    | Yes        |
| `GREPTIME_DB`       | Database name          | `public`            | Yes        |
| `GREPTIME_USERNAME` | Auth username          | ` `                 | No (local) |
| `GREPTIME_PASSWORD` | Auth password          | ``                  | No (local) |
| `SERVICE_NAME`      | Service identifier     | `modme-genui-agent` | No         |
| `SERVICE_VERSION`   | Service version        | `0.1.0`             | No         |
| `ENVIRONMENT`       | Deployment environment | `development`       | No         |

### Python Configuration

```python
from observability import GreptimeDBConfig, initialize_observability

# Manual configuration
config = GreptimeDBConfig(
    host="cloud.greptime.com:443",
    database="my_database",
    username="my_user",
    password="my_password",
    service_name="my-agent",
    service_version="1.0.0"
)

meter, tracer, config = initialize_observability(
    host=config.host,
    database=config.database,
    username=config.username,
    password=config.password
)
```

### TypeScript Configuration

```typescript
import { GreptimeDBObservability } from "./greptime-config";

const observability = new GreptimeDBObservability({
  host: "cloud.greptime.com:443",
  database: "my_database",
  username: "my_user",
  password: "my_password",
  serviceName: "my-ui",
  serviceVersion: "1.0.0",
});

const { meter, tracer } = observability.initialize();
```

---

## Advanced Usage

### Custom Metrics

```python
# Python
from opentelemetry import metrics

meter = metrics.get_meter(__name__)

# Counter
embedding_counter = meter.create_counter(
    name="embeddings_generated_total",
    description="Total embeddings generated",
    unit="1"
)
embedding_counter.add(1, {"model": "gemma3n"})

# Gauge
cache_size_gauge = meter.create_up_down_counter(
    name="cache_size_bytes",
    description="Current cache size",
    unit="By"
)
cache_size_gauge.add(1024, {"cache_type": "session"})

# Histogram
response_time_histogram = meter.create_histogram(
    name="response_time_milliseconds",
    description="Response time distribution",
    unit="ms"
)
response_time_histogram.record(42, {"endpoint": "/api/chat"})
```

```typescript
// TypeScript
import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("my-module");

// Counter
const clickCounter = meter.createCounter("button_clicks_total");
clickCounter.add(1, { button_id: "submit" });

// Histogram
const loadTimeHistogram = meter.createHistogram("page_load_time_ms");
loadTimeHistogram.record(250, { page: "/dashboard" });
```

### Custom Traces

```python
# Python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

# Manual span
with tracer.start_as_current_span("custom_operation") as span:
    span.set_attribute("user.id", "user123")
    span.set_attribute("operation.type", "data_processing")

    # Nested span
    with tracer.start_as_current_span("sub_operation"):
        # Your code
        pass

    span.set_status(trace.Status(trace.StatusCode.OK))
```

```typescript
// TypeScript
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("my-module");

// Manual span
const span = tracer.startSpan("custom_operation");
span.setAttribute("user.id", "user123");

try {
  // Your code
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message,
  });
  throw error;
} finally {
  span.end();
}
```

---

## Grafana Integration

### Add GreptimeDB as Data Source

1. **Install Grafana**: `docker run -d -p 3001:3000 grafana/grafana`
2. **Open Grafana**: <http://localhost:3001> (admin/admin)
3. **Add Data Source**:
   - Type: **Prometheus**
   - URL: `http://localhost:4000/v1/prometheus`
   - Auth: None (or Basic if configured)
   - Save & Test

### Sample Dashboards

**Agent Performance Dashboard:**

```json
{
  "panels": [
    {
      "title": "Request Rate",
      "targets": [
        {
          "expr": "rate(http_requests_total[5m])"
        }
      ]
    },
    {
      "title": "Tool Call Distribution",
      "targets": [
        {
          "expr": "sum by(tool_name) (agent_tool_calls_total)"
        }
      ]
    },
    {
      "title": "Execution Time (P95)",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, agent_execution_duration_seconds)"
        }
      ]
    }
  ]
}
```

---

## Troubleshooting

### Issue: Connection Refused

```bash
# Check if GreptimeDB is running
curl http://localhost:4000/health

# Check logs
docker logs $(docker ps -q --filter ancestor=greptime/greptimedb)
```

### Issue: Authentication Failed

```bash
# Verify credentials
echo -n "username:password" | base64

# Test with curl
curl -X POST http://localhost:4000/v1/otlp/v1/metrics \
  -H "X-Greptime-DB-Name: public" \
  -H "Authorization: Basic <base64-encoded-credentials>" \
  -d '{}'
```

### Issue: No Metrics Appearing

```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Check exporter
from observability import initialize_observability
meter, tracer, config = initialize_observability()
print(f"Metrics endpoint: {config.metrics_endpoint}")
```

### Issue: TypeScript Module Not Found

```bash
cd src/lib/observability
npm install
npm run build

# Verify import
node -e "require('./greptime-config')"
```

---

## Comparison with ChromaDB Approach

| Feature                      | GreptimeDB            | ChromaDB (Previous)             |
| ---------------------------- | --------------------- | ------------------------------- |
| **Purpose**                  | Unified observability | Semantic search + local metrics |
| **Query Language**           | SQL + PromQL          | Vector similarity               |
| **Time-series Optimization** | ✅ Native             | ❌ No                           |
| **Distributed Tracing**      | ✅ Yes                | ❌ No                           |
| **Prometheus Compatibility** | ✅ Yes                | ❌ No                           |
| **Cloud Hosting**            | ✅ GreptimeCloud      | ❌ Self-hosted only             |
| **Grafana Integration**      | ✅ Native             | ⚠️ Limited                      |

**Recommendation**: Use GreptimeDB for observability metrics/traces, keep ChromaDB for semantic search (journal entries, code chunks).

---

## Production Checklist

- [ ] Configure authentication (username/password)
- [ ] Use GreptimeCloud or self-host with backups
- [ ] Set up Grafana dashboards
- [ ] Configure alerting rules
- [ ] Enable HTTPS for production endpoints
- [ ] Monitor disk usage (time-series retention)
- [ ] Set up log rotation for trace data
- [ ] Configure rate limiting on OTLP endpoints
- [ ] Test failover scenarios
- [ ] Document custom metrics for team

---

## Resources

- **GreptimeDB Docs**: <https://docs.greptime.com/>
- **OTLP Integration**: <https://docs.greptime.com/user-guide/ingest-data/for-observability/opentelemetry/>
- **OpenTelemetry Python**: <https://opentelemetry-python.readthedocs.io/>
- **OpenTelemetry JS**: <https://opentelemetry.io/docs/js/>
- **GreptimeCloud**: <https://greptime.com/product/cloud>
- **Example Repos**:
  - Python: <https://github.com/GreptimeCloudStarters/quick-start-python>
  - Node.js: <https://github.com/GreptimeCloudStarters/quick-start-node-js>

---

**Version**: 1.0.0  
**Date**: January 2, 2026  
**Maintained by**: ModMe GenUI Team
