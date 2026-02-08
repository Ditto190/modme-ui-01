# Phoenix Technical Reference

**Last Updated**: February 8, 2026

Technical reference for Phoenix observability integration, OpenInference semantic conventions, and CLI usage.

## Architecture

```mermaid
graph TB
    subgraph "AI Providers"
        A1[Anthropic SDK]
        A2[OpenAI SDK]
        A3[Google GenAI SDK]
    end

    subgraph "Instrumentation"
        I1[AnthropicInstrumentor]
        I2[OpenAIInstrumentor]
        I3[GoogleGenerativeAIInstrumentor]
    end

    subgraph "OpenTelemetry"
        OT[Tracer Provider]
        BP[Batch Span Processor]
        ME[Multi-Exporter]
    end

    subgraph "Backends"
        P[Phoenix :6006]
        G[GreptimeDB :4000]
    end

    A1 --> I1 --> OT
    A2 --> I2 --> OT
    A3 --> I3 --> OT
    OT --> BP --> ME
    ME --> P
    ME -.-> G
```

**Data Flow:**

1. AI SDK calls captured by OpenInference instrumentors
2. Traces enriched with LLM-specific attributes (OpenInference spec)
3. Batched by OpenTelemetry span processor
4. Exported via OTLP HTTP to Phoenix (primary) and GreptimeDB (optional)
5. Phoenix stores in SQLite/PostgreSQL
6. UI queries trace database for visualization

## OpenInference Semantic Conventions

### Span Attributes

**Model Information:**

```python
SpanAttributes.LLM_MODEL_NAME         # "claude-3-5-sonnet-20241022"
SpanAttributes.LLM_PROVIDER           # "anthropic"
SpanAttributes.LLM_SYSTEM             # System prompt
```

**Messages:**

```python
SpanAttributes.LLM_INPUT_MESSAGES     # [{"role": "user", "content": "..."}]
SpanAttributes.LLM_OUTPUT_MESSAGES    # [{"role": "assistant", "content": "..."}]
SpanAttributes.LLM_PROMPTS            # Raw prompt strings
```

**Token Metrics:**

```python
SpanAttributes.LLM_TOKEN_COUNT_PROMPT      # Input tokens
SpanAttributes.LLM_TOKEN_COUNT_COMPLETION  # Output tokens
SpanAttributes.LLM_TOKEN_COUNT_TOTAL       # Total tokens
```

**Invocation:**

```python
SpanAttributes.LLM_INVOCATION_PARAMETERS   # {"temperature": 0.7, "max_tokens": 100}
SpanAttributes.LLM_TEMPERATURE             # 0.7
SpanAttributes.LLM_MAX_TOKENS              # 100
SpanAttributes.LLM_TOP_P                   # 0.9
```

**Tool Use:**

```python
SpanAttributes.LLM_TOOLS                   # Tool definitions
SpanAttributes.LLM_TOOL_CALLS              # [{"name": "search", "args": {...}}]
```

### Span Names

**Convention:** `<provider>.<operation>`

Examples:

- `anthropic.messages.create`
- `openai.chat.completions.create`
- `google.generativeai.generate_content`

### Span Links

```python
from opentelemetry import trace

# Link related spans
with tracer.start_as_current_span("parent") as parent:
    parent_ctx = trace.set_span_in_context(parent)

    with tracer.start_as_current_span("child", links=[trace.Link(parent_ctx)]):
        # Child operation
        pass
```

## Python API

### Initialization

```python
from observability import initialize_phoenix, instrument_all_providers

# Full configuration
tracer, config = initialize_phoenix(
    enable_greptime=True,        # Dual export to GreptimeDB
    enable_console=False,         # Console debug output
    phoenix_endpoint=None,        # Auto-detect from .env
    service_name=None,            # Auto-detect from .env
    environment=None              # Auto-detect from .env
)

# Returns:
# - tracer: OpenTelemetry Tracer for manual spans
# - config: PhoenixConfig with endpoint URLs
```

### Auto-Instrumentation

```python
# Instrument all supported providers
instrumentors = instrument_all_providers()
# Returns: {"anthropic": AnthropicInstrumentor, ...}

# Instrument specific provider
from openinference.instrumentation.anthropic import AnthropicInstrumentor
AnthropicInstrumentor().instrument()
```

### Manual Spans

```python
from opentelemetry import trace
from openinference.semconv.trace import SpanAttributes

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("custom_llm_call") as span:
    # Set LLM-specific attributes
    span.set_attribute(SpanAttributes.LLM_MODEL_NAME, "custom-model")
    span.set_attribute(SpanAttributes.LLM_INPUT_MESSAGES, [
        {"role": "user", "content": "Hello"}
    ])

    # Your LLM API call
    response = custom_llm_client.generate(...)

    # Record output
    span.set_attribute(SpanAttributes.LLM_OUTPUT_MESSAGES, [
        {"role": "assistant", "content": response.text}
    ])
    span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_TOTAL, response.tokens)
```

### Configuration Object

```python
from observability.config import PhoenixConfig

config = PhoenixConfig(
    phoenix_endpoint="http://localhost:6006",
    phoenix_collector_endpoint="http://localhost:6006/v1/traces",
    service_name="my-agent",
    service_version="1.0.0",
    environment="production"
)
```

## CLI Reference

### TypeScript CLI (@arizeai/phoenix-cli)

**Installation:**

```bash
npm install -g @arizeai/phoenix-cli
```

**List Projects:**

```bash
phoenix-cli projects --endpoint http://localhost:6006
```

**Get Traces:**

```bash
# List traces
phoenix-cli traces --project github-copilot --limit 10

# Export to directory
phoenix-cli traces ./exports --project github-copilot --limit 100

# Filter by date
phoenix-cli traces --project github-copilot --start 2026-02-01 --end 2026-02-08
```

**Get Trace Details:**

```bash
phoenix-cli trace <trace-id>
```

**Get Spans:**

```bash
phoenix-cli spans --project github-copilot --limit 20
```

### REST API

**List Projects:**

```bash
curl http://localhost:6006/v1/projects
```

**Create Project:**

```bash
curl -X POST http://localhost:6006/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "my-project", "description": "My project"}'
```

**Query Traces:**

```bash
curl "http://localhost:6006/v1/traces?project_id=<id>&limit=10"
```

**Get Trace:**

```bash
curl http://localhost:6006/v1/traces/<trace-id>
```

### Python Client SDK

```python
from phoenix.client import Client

client = Client(endpoint="http://localhost:6006")

# List projects
projects = client.projects.list()

# Create project
project = client.projects.create(
    name="my-project",
    description="My project"
)

# Get traces
traces = client.get_traces(project_id=project.id, limit=10)
```

## Environment Variables

```bash
# Phoenix server
PHOENIX_ENDPOINT=http://localhost:6006
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006/v1/traces
PHOENIX_PROJECT=github-copilot

# Service metadata
SERVICE_NAME=modme-agent
SERVICE_VERSION=0.1.0
ENVIRONMENT=development

# OpenTelemetry
OTEL_SERVICE_NAME=modme-agent
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:6006
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:6006/v1/traces

# Feature flags
ENABLE_PHOENIX=true
ENABLE_GREPTIME_EXPORT=true
ENABLE_CONSOLE_EXPORT=false

# GreptimeDB (optional dual export)
GREPTIME_ENDPOINT=http://localhost:4000
GREPTIME_TRACES_ENDPOINT=http://localhost:4000/v1/otlp/v1/traces
```

## Docker Configuration

**docker-compose.phoenix.yml:**

```yaml
services:
  phoenix:
    image: arizephoenix/phoenix:latest
    ports:
      - "6006:6006"
      - "4317:4317" # gRPC OTLP (optional)
    volumes:
      - phoenix-data:/data
    environment:
      PHOENIX_SQL_DATABASE_URL: sqlite:////data/phoenix.db
      PHOENIX_WORKING_DIR: /data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:6006"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  phoenix-data:
```

**Production (PostgreSQL):**

```yaml
services:
  phoenix:
    image: arizephoenix/phoenix:latest
    ports:
      - "6006:6006"
    environment:
      PHOENIX_SQL_DATABASE_URL: postgresql://user:pass@postgres:5432/phoenix
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: phoenix
      POSTGRES_USER: phoenix
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres-data:/var/lib/postgresql/data
```

## Storage Schema

**Traces Table:**

```sql
CREATE TABLE traces (
    trace_id TEXT PRIMARY KEY,
    project_id TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status TEXT,
    metadata JSONB
);
```

**Spans Table:**

```sql
CREATE TABLE spans (
    span_id TEXT PRIMARY KEY,
    trace_id TEXT REFERENCES traces(trace_id),
    parent_span_id TEXT,
    name TEXT,
    kind TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    attributes JSONB,
    events JSONB,
    links JSONB,
    status TEXT
);
```

**Attributes Indexed:**

- `llm.model_name`
- `llm.provider`
- `llm.token_count.total`
- `service.name`
- `span.kind`

## Performance Tuning

**Batch Span Processor:**

```python
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Configure batching
processor = BatchSpanProcessor(
    exporter=otlp_exporter,
    max_queue_size=2048,        # Default: 2048
    schedule_delay_millis=5000,  # Export every 5s
    max_export_batch_size=512,   # Default: 512
    export_timeout_millis=30000  # 30s timeout
)
```

**Sampling:**

```python
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

# Sample 10% of traces
sampler = TraceIdRatioBased(0.1)
```

**Resource Limits:**

```python
# Limit span attribute sizes
from opentelemetry.sdk.trace import TracerProvider

provider = TracerProvider(
    span_limits={
        "max_attributes": 128,
        "max_events": 128,
        "max_links": 128,
        "max_attribute_length": 4096
    }
)
```

## Error Handling

```python
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("risky_operation") as span:
    try:
        result = risky_function()
        span.set_status(Status(StatusCode.OK))
    except Exception as e:
        span.set_status(Status(StatusCode.ERROR, str(e)))
        span.record_exception(e)  # Records stack trace
        raise
```

## Resources

- **Setup Guide**: [PHOENIX_SETUP.md](PHOENIX_SETUP.md)
- **User Guide**: [PHOENIX_GUIDE.md](PHOENIX_GUIDE.md)
- **Phoenix Docs**: https://docs.arize.com/phoenix
- **OpenInference Spec**: https://github.com/Arize-ai/openinference/blob/main/spec/semantic_conventions.md
- **OpenTelemetry**: https://opentelemetry.io/docs/
- **Discord**: https://discord.gg/Dmm69peqjh
