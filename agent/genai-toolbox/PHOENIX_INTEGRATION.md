# Genai-Toolbox Phoenix Integration

## Overview

The genai-toolbox (Go-based MCP server for databases) has built-in OpenTelemetry support. This guide shows how to configure it to send traces to Phoenix.

## Configuration

### 1. Command Line

```bash
cd agent/genai-toolbox

# Start with Phoenix OTLP endpoint
go run main.go \
  --telemetry-otlp http://localhost:6006/v1/traces \
  --telemetry-service-name genai-toolbox \
  --config tools.yaml
```

### 2. Environment Variables

```bash
# Set environment variables
export TELEMETRY_OTLP_ENDPOINT=http://localhost:6006/v1/traces
export TELEMETRY_SERVICE_NAME=genai-toolbox

# Start server
go run main.go --config tools.yaml
```

### 3. Docker Compose

```yaml
# docker-compose.yml
services:
  genai-toolbox:
    build: ./agent/genai-toolbox
    ports:
      - "50051:50051"
    environment:
      - TELEMETRY_OTLP_ENDPOINT=http://phoenix:6006/v1/traces
      - TELEMETRY_SERVICE_NAME=genai-toolbox
    volumes:
      - ./agent/genai-toolbox/tools.yaml:/app/tools.yaml
    networks:
      - observability
    depends_on:
      - phoenix

  phoenix:
    image: arizephoenix/phoenix:latest
    ports:
      - "6006:6006"
    networks:
      - observability

networks:
  observability:
    driver: bridge
```

### 4. Configuration File

Create `agent/genai-toolbox/config.yaml`:

```yaml
# Telemetry configuration
telemetry:
  enabled: true
  otlp_endpoint: http://localhost:6006/v1/traces
  service_name: genai-toolbox

  # Optional: GCP export
  gcp_enabled: false

  # Sampling (0.0 to 1.0)
  sampling_rate: 1.0
```

## Traced Operations

Genai-toolbox automatically traces:

### Database Connections

- Connection pool creation
- Connection acquisition/release
- Connection errors

### SQL Queries

- Query execution
- Query parsing
- Query results

### Tool Invocations

- Tool name and parameters
- Execution duration
- Success/failure status

### Span Attributes

```go
// Automatically added by genai-toolbox
span.SetAttributes(
    attribute.String("db.system", "postgresql"),
    attribute.String("db.statement", "SELECT * FROM users"),
    attribute.String("db.name", "production"),
    attribute.Int("db.rows.affected", 42),
)
```

## Viewing Traces

1. **Start genai-toolbox with Phoenix endpoint**
2. **Execute database tools** (e.g., via MCP client)
3. **Open Phoenix UI**: http://localhost:6006
4. **Filter by service**: `genai-toolbox`

### Example Trace Hierarchy

```
agent_execution (modme-agent)
└── tool_call: query_database
    └── database_query (genai-toolbox)
        ├── connection_acquire
        ├── query_execute
        │   └── query_parse
        └── result_fetch
```

## Integration with Python Agent

When your Python agent calls genai-toolbox tools, both traces are correlated:

```python
# Python agent (modme-agent service)
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("agent_workflow") as span:
    # Call genai-toolbox via MCP/HTTP
    result = call_genai_toolbox_tool("query_database", {
        "query": "SELECT * FROM users"
    })

    # Both spans appear in Phoenix with parent-child relationship
```

## Troubleshooting

### Traces Not Appearing

1. **Check genai-toolbox logs**:

   ```bash
   # Look for telemetry initialization
   grep -i "telemetry" genai-toolbox.log
   ```

2. **Verify OTLP endpoint**:

   ```bash
   curl http://localhost:6006/v1/traces
   # Should return 405 Method Not Allowed (POST required)
   ```

3. **Test trace export**:
   ```bash
   # Enable debug logging
   TELEMETRY_DEBUG=true go run main.go --telemetry-otlp http://localhost:6006/v1/traces
   ```

### Network Issues

If genai-toolbox runs in Docker and Phoenix on host:

```yaml
# Use host network mode
services:
  genai-toolbox:
    network_mode: "host"
    environment:
      - TELEMETRY_OTLP_ENDPOINT=http://localhost:6006/v1/traces
```

Or use Docker internal networking:

```yaml
services:
  genai-toolbox:
    environment:
      - TELEMETRY_OTLP_ENDPOINT=http://phoenix:6006/v1/traces
    networks:
      - observability
```

## Advanced Configuration

### Custom Span Attributes

Add custom attributes to genai-toolbox traces:

```go
// In genai-toolbox code
import (
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

// Add custom attributes
span.SetAttributes(
    attribute.String("custom.user_id", userID),
    attribute.String("custom.tenant", tenantID),
)
```

### Sampling

For high-volume workloads:

```yaml
# config.yaml
telemetry:
  sampling_rate: 0.1 # Sample 10% of traces
```

### Dual Export (Phoenix + GCP)

```bash
go run main.go \
  --telemetry-otlp http://localhost:6006/v1/traces \
  --telemetry-gcp \
  --telemetry-service-name genai-toolbox
```

## Performance Impact

| Configuration | Overhead | Use Case                          |
| ------------- | -------- | --------------------------------- |
| Disabled      | 0%       | Not needed                        |
| Sampling 10%  | <1%      | Production                        |
| Full tracing  | ~2-5%    | Development                       |
| GCP + Phoenix | ~3-7%    | Production with long-term storage |

## Next Steps

1. Configure genai-toolbox OTLP endpoint
2. Start Phoenix server
3. Execute database tools
4. View traces in Phoenix UI
5. Correlate with Python agent traces
6. Set up alerts and dashboards

## Resources

- [Genai-Toolbox Docs](https://googleapis.github.io/genai-toolbox/)
- [OpenTelemetry Go](https://opentelemetry.io/docs/instrumentation/go/)
- [Phoenix Docs](https://docs.arize.com/phoenix)
