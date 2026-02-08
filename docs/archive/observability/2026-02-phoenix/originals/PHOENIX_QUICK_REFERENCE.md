# Phoenix + OpenInference Observability - Quick Reference

## Installation

```bash
# Install dependencies
pip install -r agent/requirements-phoenix.txt

# Start Phoenix server
docker-compose -f docker-compose.phoenix.yml up -d

# Or use setup script
./scripts/setup-phoenix.sh  # Unix
.\scripts\setup-phoenix.ps1 # Windows
```

## Quick Start

```python
from observability import initialize_phoenix, instrument_all_providers

# Initialize
tracer, config = initialize_phoenix()
instrumentors = instrument_all_providers()

# Use AI SDKs normally - traces are captured automatically!
```

## Phoenix UI

http://localhost:6006

## OTLP Collector

http://localhost:6006/v1/traces (HTTP)
http://localhost:4317 (gRPC)

## Provider Auto-Instrumentation

### Anthropic

```python
from anthropic import Anthropic
client = Anthropic()  # Automatically traced!
```

### OpenAI

```python
from openai import OpenAI
client = OpenAI()  # Automatically traced!
```

### Google

```python
import google.generativeai as genai
genai.configure()  # Automatically traced!
```

## Manual Span Attributes

```python
from observability import add_llm_span_attributes
from opentelemetry import trace

with trace.get_tracer(__name__).start_as_current_span("my_span") as span:
    add_llm_span_attributes(
        span,
        provider="anthropic",
        model="claude-3-5-sonnet",
        input_tokens=100,
        output_tokens=50
    )
```

## Genai-Toolbox Integration

```bash
# Start with Phoenix endpoint
cd agent/genai-toolbox
go run main.go \
  --telemetry-otlp http://localhost:6006/v1/traces \
  --telemetry-service-name genai-toolbox
```

## Dual Export (Phoenix + GreptimeDB)

```python
tracer, config = initialize_phoenix(enable_greptime=True)
```

## Docker Commands

```bash
# Start Phoenix
docker-compose -f docker-compose.phoenix.yml up -d

# Stop Phoenix
docker-compose -f docker-compose.phoenix.yml down

# View logs
docker logs phoenix-server

# View database
docker exec -it phoenix-server sqlite3 /data/phoenix.db
```

## Environment Variables

| Variable                     | Default                           |
| ---------------------------- | --------------------------------- |
| `PHOENIX_ENDPOINT`           | `http://localhost:6006`           |
| `PHOENIX_COLLECTOR_ENDPOINT` | `http://localhost:6006/v1/traces` |
| `ENABLE_PHOENIX`             | `true`                            |
| `ENABLE_GREPTIME_EXPORT`     | `true`                            |

## Troubleshooting

### Check Phoenix Status

```bash
curl http://localhost:6006
docker logs phoenix-server
```

### Enable Console Debugging

```python
tracer, config = initialize_phoenix(enable_console=True)
```

### Verify Instrumentation

```python
from observability import instrument_all_providers
instrumentors = instrument_all_providers()
print(f"Instrumented: {list(instrumentors.keys())}")
```

## Documentation

- Full Guide: `docs/PHOENIX_OBSERVABILITY.md`
- Genai-Toolbox: `agent/genai-toolbox/PHOENIX_INTEGRATION.md`
- Example: `agent/observability/example_phoenix.py`

## Resources

- Phoenix Docs: https://docs.arize.com/phoenix
- OpenInference: https://github.com/Arize-ai/openinference
- Phoenix GitHub: https://github.com/Arize-ai/phoenix
