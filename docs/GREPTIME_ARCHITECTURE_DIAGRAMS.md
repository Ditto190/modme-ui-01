# GreptimeDB Observability - Visual Architecture

## System Overview

````
┌──────────────────────────────────────────────────────────────────────┐
│                    ModMe GenUI Workbench                             │
│                    (Dual-Runtime Architecture)                        │
└──────────────────────────────────────────────────────────────────────┘

┌────────────────────────────┐     ┌────────────────────────────────┐
│  Python Agent (Port 8000)  │     │  React UI (Port 3000)          │
│  ─────────────────────────  │     │  ────────────────────────────  │
│                             │     │                                │
│  ┌───────────────────────┐ │     │  ┌──────────────────────────┐ │
│  │ agent/main.py         │ │     │  │ src/app/page.tsx         │ │
│  │ - Tool definitions    │ │     │  │ - useCoAgent hook        │ │
│  │ - State management    │ │     │  │ - Component rendering    │ │
│  │ - LLM orchestration   │ │     │  │ - User interactions      │ │
│  └───────────────────────┘ │     │  └──────────────────────────┘ │
│             │               │     │             │                  │
│             ▼               │     │             ▼                  │
│  ┌───────────────────────┐ │     │  ┌──────────────────────────┐ │
│  │ observability/        │ │     │  │ lib/observability/       │ │
│  │ greptime_config.py    │ │     │  │ greptime-config.ts       │ │
│  │                       │ │     │  │                          │ │
│  │ ✓ Metrics             │ │     │  │ ✓ Metrics                │ │
│  │ ✓ Traces              │ │     │  │ ✓ Traces                 │ │
│  │ ✓ FastAPI instrument  │ │     │  │ ✓ React hooks            │ │
│  └───────────────────────┘ │     │  └──────────────────────────┘ │
│             │               │     │             │                  │
└─────────────┼───────────────┘     └─────────────┼──────────────────┘
              │                                   │
              │ OTLP/HTTP (Proto)                 │
              │ Endpoint: /v1/otlp/v1/metrics    │
              │           /v1/otlp/v1/traces     │
              │                                   │
              └──────────────┬────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────────┐
              │      GreptimeDB (Port 4000)      │
              │      ─────────────────────────    │
              │                                   │
              │  ┌─────────────────────────────┐ │
              │  │ Data Ingestion              │ │
              │  │ - OTLP endpoints            │ │
              │  │ - Authentication            │ │
              │  │ - Batching/buffering        │ │
              │  └─────────────────────────────┘ │
              │              │                    │
              │              ▼                    │
              │  ┌─────────────────────────────┐ │
              │  │ Time-Series Storage         │ │
              │  │ - opentelemetry_metrics     │ │
              │  │ - opentelemetry_traces      │ │
              │  │ - opentelemetry_logs        │ │
              │  └─────────────────────────────┘ │
              │              │                    │
              │              ▼                    │
              │  ┌─────────────────────────────┐ │
              │  │ Query Interfaces            │ │
              │  │ - SQL (PostgreSQL wire)     │ │
              │  │ - PromQL (Prometheus-compat)│ │
              │  │ - HTTP API                  │ │
              │  └─────────────────────────────┘ │
              │                                   │
              └────────────┬──────────────────────┘
                           │
                           │ Query endpoints:
                           │ - /v1/sql
                           │ - /v1/prometheus
                           │ - /v1/influxdb
                           │
              ┌────────────┴──────────────────────┐
              │                                   │
              ▼                                   ▼
┌─────────────────────────┐       ┌───────────────────────────┐
│  Grafana (Port 3001)    │       │  Custom Queries           │
│  ─────────────────────  │       │  ────────────────────────  │
│                         │       │                           │
│  ┌──────────────────┐  │       │  ```sql                   │
│  │ Dashboards       │  │       │  SELECT * FROM            │
│  │ - Agent perf     │  │       │  opentelemetry_metrics;   │
│  │ - Tool calls     │  │       │  ```                      │
│  │ - UI metrics     │  │       │                           │
│  └──────────────────┘  │       │  ```promql                │
│                         │       │  rate(requests[5m])       │
│  Data Source:           │       │  ```                      │
│  - Prometheus           │       │                           │
│  - URL: :4000/v1/prom   │       │  ```bash                  │
│                         │       │  curl :4000/v1/sql        │
└─────────────────────────┘       │  ```                      │
                                  └───────────────────────────┘
````

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       METRICS FLOW                              │
└─────────────────────────────────────────────────────────────────┘

1. Agent executes tool
   │
   ▼
2. tool_calls_counter.add(1, {"tool_name": "upsert_ui_element", "status": "success"})
   │
   ▼
3. PeriodicExportingMetricReader (15s interval)
   │
   ▼
4. OTLPMetricExporter batches metrics
   │
   ▼
5. HTTP POST to localhost:4000/v1/otlp/v1/metrics
   Headers:
   - X-Greptime-DB-Name: public
   - Authorization: Basic <credentials>
   Body: Protocol Buffer (OTLP format)
   │
   ▼
6. GreptimeDB receives and parses
   │
   ▼
7. Stores in opentelemetry_metrics table
   Columns:
   - greptime_timestamp
   - metric_name
   - value
   - labels (JSON)
   - resource_attributes (JSON)
   │
   ▼
8. Available for querying:
   - SQL: SELECT * FROM opentelemetry_metrics WHERE metric_name = 'agent_tool_calls_total'
   - PromQL: rate(agent_tool_calls_total[5m])


┌─────────────────────────────────────────────────────────────────┐
│                       TRACES FLOW                               │
└─────────────────────────────────────────────────────────────────┘

1. Agent starts operation
   │
   ▼
2. tracer.start_as_current_span("agent_execution")
   │
   ▼
3. Span attributes set:
   - agent.name: "WorkbenchAgent"
   - tool.name: "upsert_ui_element"
   - duration_ms: 42
   │
   ▼
4. BatchSpanProcessor collects spans
   │
   ▼
5. OTLPSpanExporter batches spans
   │
   ▼
6. HTTP POST to localhost:4000/v1/otlp/v1/traces
   Headers: (same as metrics)
   Body: Protocol Buffer (OTLP trace format)
   │
   ▼
7. GreptimeDB receives and parses
   │
   ▼
8. Stores in opentelemetry_traces table
   Columns:
   - trace_id (UUID)
   - span_id (UUID)
   - parent_span_id
   - span_name
   - span_kind
   - start_time
   - end_time
   - duration_ns
   - attributes (JSON)
   │
   ▼
9. Available for distributed tracing:
   - Link Python → TypeScript spans via trace_id
   - Query by span_name, attributes, duration
```

## Configuration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   INITIALIZATION FLOW                            │
└─────────────────────────────────────────────────────────────────┘

1. Application startup (agent/main.py)
   │
   ▼
2. load_dotenv() reads .env
   GREPTIME_HOST=localhost:4000
   GREPTIME_DB=public
   │
   ▼
3. import observability
   │
   ▼
4. initialize_observability()
   │
   ├─> Creates GreptimeDBConfig
   │   - Parses env vars
   │   - Generates auth header (Base64)
   │   - Constructs endpoint URLs
   │
   ├─> setup_metrics(config)
   │   - Creates OTLPMetricExporter
   │   - Sets up PeriodicExportingMetricReader
   │   - Registers global MeterProvider
   │
   └─> setup_tracing(config)
       - Creates OTLPSpanExporter
       - Sets up BatchSpanProcessor
       - Registers global TracerProvider
   │
   ▼
5. Returns (meter, tracer, config)
   │
   ▼
6. Application creates instruments:
   - request_counter = meter.create_counter(...)
   - tool_calls_counter = meter.create_counter(...)
   - state_elements_gauge = meter.create_up_down_counter(...)
   │
   ▼
7. Ready to track!


┌─────────────────────────────────────────────────────────────────┐
│                   GRACEFUL FALLBACK FLOW                         │
└─────────────────────────────────────────────────────────────────┘

Application startup
   │
   ▼
GREPTIME_HOST set?
   │
   ├─ YES ──> Initialize observability
   │          │
   │          ├─ Success ──> OBSERVABILITY_ENABLED = True
   │          │             Metrics tracked
   │          │
   │          └─ Exception ──> OBSERVABILITY_ENABLED = False
   │                          Log error, continue without metrics
   │
   └─ NO ──> OBSERVABILITY_ENABLED = False
             Skip initialization, continue normally

Application runs normally in all cases!
```

## File Structure Map

```
modme-ui-01/relaxed-hugle/
│
├── agent/
│   ├── main.py                     ← 🔥 Observability integrated here
│   └── observability/
│       ├── __init__.py             ← Package exports
│       ├── greptime_config.py      ← 🔥 Core Python config (218 lines)
│       └── README.md               ← Package documentation
│
├── src/
│   └── lib/
│       └── observability/
│           ├── greptime-config.ts  ← 🔥 Core TypeScript config (178 lines)
│           ├── examples.ts         ← 🔥 Usage examples + hooks (450 lines)
│           ├── package.json        ← Dependencies
│           └── tsconfig.json       ← TS configuration
│
├── docs/
│   ├── GREPTIME_OBSERVABILITY.md   ← 🔥 Complete reference (620 lines)
│   └── GREPTIME_QUICKSTART.md      ← Quick start guide (120 lines)
│
├── scripts/
│   ├── setup-greptime.sh           ← Unix/macOS setup script
│   └── setup-greptime.ps1          ← Windows setup script
│
├── .env.greptime.example           ← Environment template
├── GREPTIME_IMPLEMENTATION_SUMMARY.md ← This summary
└── .github/
    └── copilot-instructions.md     ← 🔥 Updated with observability refs
```

Legend:
🔥 = Core implementation file
← = Description/purpose

## Component Responsibilities

```
┌─────────────────────────────────────────────────────────────────┐
│               PYTHON (agent/observability/)                      │
└─────────────────────────────────────────────────────────────────┘

GreptimeDBConfig:
- Parse environment variables (GREPTIME_HOST, etc.)
- Generate Basic Auth headers (Base64)
- Construct OTLP endpoint URLs
- Create OpenTelemetry Resource (service metadata)

setup_metrics():
- Create OTLPMetricExporter with GreptimeDB endpoints
- Configure PeriodicExportingMetricReader (15s exports)
- Register global MeterProvider
- Return Meter for creating instruments

setup_tracing():
- Create OTLPSpanExporter with GreptimeDB endpoints
- Configure BatchSpanProcessor for span batching
- Register global TracerProvider
- Return Tracer for creating spans

instrument_fastapi():
- Auto-instrument FastAPI with OpenTelemetry
- Track all HTTP requests automatically

initialize_observability():
- One-function initialization
- Returns (meter, tracer, config)
- Used in agent/main.py on startup


┌─────────────────────────────────────────────────────────────────┐
│            TYPESCRIPT (src/lib/observability/)                   │
└─────────────────────────────────────────────────────────────────┘

GreptimeDBObservability:
- Parse environment variables (process.env.GREPTIME_HOST)
- Generate Basic Auth headers (Buffer.from().toString('base64'))
- Construct OTLP endpoint URLs
- Create OpenTelemetry Resource

setupMetrics():
- Create OTLPMetricExporter
- Configure PeriodicExportingMetricReader
- Register global MeterProvider
- Return Meter

setupTracing():
- Create OTLPTraceExporter
- Configure BatchSpanProcessor
- Register global TracerProvider
- Return Tracer

React Hooks (examples.ts):
- useComponentLifecycleTracking(): Auto-track mount/unmount
- useTrackedCallback(): Wrap callbacks with tracing
- tracedUserAction(): Trace async user actions
- traceComponentRender(): Track component render time


┌─────────────────────────────────────────────────────────────────┐
│                 GREPTIME DB RESPONSIBILITIES                     │
└─────────────────────────────────────────────────────────────────┘

OTLP Ingestion:
- Receive HTTP POST with Protocol Buffer payload
- Validate headers (X-Greptime-DB-Name, Authorization)
- Parse OTLP format (metrics, traces, logs)
- Write to time-series tables

Storage:
- opentelemetry_metrics table (greptime_timestamp, metric_name, value, labels)
- opentelemetry_traces table (trace_id, span_id, span_name, attributes)
- Automatic schema creation

Query Interfaces:
- SQL (PostgreSQL wire protocol): SELECT, WHERE, GROUP BY, ORDER BY
- PromQL (Prometheus-compatible): rate(), histogram_quantile(), etc.
- HTTP API: /v1/sql, /v1/prometheus, /v1/influxdb

Time-series Optimization:
- Compression for storage efficiency
- Downsampling for historical data
- Retention policies (configurable)
```

## Deployment Options

```
┌─────────────────────────────────────────────────────────────────┐
│               LOCAL DEVELOPMENT                                  │
└─────────────────────────────────────────────────────────────────┘

Option 1: Docker (Recommended)
docker run -d -p 4000-4004:4000-4004 \
  -v greptimedb_data:/tmp/greptimedb \
  greptime/greptimedb:latest standalone start

Option 2: Binary
1. Download: https://github.com/GreptimeTeam/greptimedb/releases
2. Extract: tar -xzf greptime-*.tar.gz
3. Run: ./greptime standalone start

Option 3: Setup Script
./scripts/setup-greptime.sh    # Unix/macOS
.\scripts\setup-greptime.ps1   # Windows


┌─────────────────────────────────────────────────────────────────┐
│               PRODUCTION DEPLOYMENT                              │
└─────────────────────────────────────────────────────────────────┘

Option 1: GreptimeCloud (Managed)
1. Sign up: https://greptime.com/product/cloud
2. Create database
3. Get connection string
4. Update .env:
   GREPTIME_HOST=your-instance.greptime.cloud:443
   GREPTIME_DB=your-database
   GREPTIME_USERNAME=your-username
   GREPTIME_PASSWORD=your-password

Option 2: Self-Hosted Cluster
1. Deploy GreptimeDB cluster (Kubernetes, Docker Swarm, etc.)
2. Configure load balancer
3. Set up backups and monitoring
4. Update .env with cluster endpoint


┌─────────────────────────────────────────────────────────────────┐
│               GRAFANA INTEGRATION                                │
└─────────────────────────────────────────────────────────────────┘

1. Start Grafana:
   docker run -d -p 3001:3000 grafana/grafana

2. Add Data Source:
   - Type: Prometheus
   - URL: http://localhost:4000/v1/prometheus
   - Auth: Basic (if configured)

3. Create Dashboard:
   - Add panel
   - Query: rate(http_requests_total[5m])
   - Chart type: Time series

4. Import Example Dashboard:
   - Use provided JSON templates (future)
   - Or create custom dashboards
```

---

**Legend:**

- `┌─┐ └─┘` = Container/system boundary
- `│` = Vertical connection
- `▼` = Data flow direction
- `├─>` = Branch/fork in flow
- `🔥` = Critical implementation file
