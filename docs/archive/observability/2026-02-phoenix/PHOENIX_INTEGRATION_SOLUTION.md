# Phoenix OpenTelemetry Integration - Working Solution ✅

**Date**: January 2025
**Status**: ✅ WORKING
**Problem Fixed**: Traces were being sent successfully but not visible in Phoenix queries

## The Issue

Traces were being sent to Phoenix without errors, but they weren't appearing in queries or the UI. The Phoenix CLI returned "No traces found" even after successful trace sends.

## Root Cause

**Wrong Resource Attribute Name** ❌

```python
# This doesn't work with Phoenix project mapping
resource = Resource(attributes={
    "service.name": "github-copilot",
    "project.name": "github-copilot",  # ❌ WRONG - generic attribute
})
```

**Correct Resource Attribute Name** ✅

```python
# Phoenix requires OpenInference semantic convention
resource = Resource(attributes={
    "service.name": "github-copilot",
    "openinference.project.name": "github-copilot",  # ✅ CORRECT - Phoenix-specific
})
```

## Why This Matters

Phoenix uses [OpenInference semantic conventions](https://github.com/Arize-ai/openinference) for GenAI observability. The resource attribute **`openinference.project.name`** is how Phoenix maps traces to projects.

Using `project.name` instead causes:

- ✅ Traces sent successfully (no errors)
- ✅ OTLP exporter completes without timeout
- ❌ Traces not associated with any project
- ❌ Traces invisible in queries and UI
- ❌ CLI returns "No traces found"

## Complete Working Example

```python
"""
Working Phoenix OpenTelemetry setup for GitHub Copilot tracing.
Based on Phoenix documentation: https://arize.com/docs/phoenix/sdk-api-reference/python/arize-phoenix-otel
"""
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.resources import Resource

# CRITICAL: Use 'openinference.project.name' not 'project.name'
resource = Resource(attributes={
    "service.name": "github-copilot",
    "openinference.project.name": "github-copilot",  # ✅ Phoenix-specific attribute
})

# Create tracer provider with the resource
tracer_provider = TracerProvider(resource=resource)

# Configure OTLP HTTP exporter for Phoenix
endpoint = "http://localhost:6006/v1/traces"  # Phoenix OTLP endpoint
exporter = OTLPSpanExporter(endpoint=endpoint)

# Add span processor (use BatchSpanProcessor in production)
tracer_provider.add_span_processor(SimpleSpanProcessor(span_exporter=exporter))

# Set as global tracer provider
trace.set_tracer_provider(tracer_provider)

# Create tracer and start tracing
tracer = trace.get_tracer("github-copilot-tracer", "1.0.0")

# Example: Trace a completion
with tracer.start_as_current_span("github-copilot.completion") as span:
    # Set OpenInference GenAI semantic conventions
    span.set_attribute("openinference.span.kind", "LLM")  # LLM, CHAIN, TOOL, etc.
    span.set_attribute("llm.model_name", "gpt-4-turbo")
    span.set_attribute("llm.input_messages", '[{"role": "user", "content": "..."}]')
    span.set_attribute("llm.output_messages", '[{"role": "assistant", "content": "..."}]')
    span.set_attribute("llm.token_count.prompt", 10)
    span.set_attribute("llm.token_count.completion", 20)
    span.set_attribute("llm.token_count.total", 30)

# Force flush to ensure traces are sent
trace.get_tracer_provider().force_flush(timeout_millis=10000)
```

## OpenInference Semantic Conventions

### Span Kinds

Use `openinference.span.kind` attribute:

- `LLM` - Direct LLM API calls
- `CHAIN` - Sequential operations
- `AGENT` - Autonomous agent execution
- `TOOL` - Tool/function calls
- `RETRIEVER` - Vector DB retrieval
- `EMBEDDING` - Embedding generation
- `RERANKER` - Result reranking

### Common LLM Attributes

```python
span.set_attribute("llm.model_name", "gpt-4-turbo")
span.set_attribute("llm.invocation_parameters", '{"temperature": 0.7}')
span.set_attribute("llm.input_messages", '[...]')  # JSON array
span.set_attribute("llm.output_messages", '[...]')  # JSON array
span.set_attribute("llm.token_count.prompt", 10)
span.set_attribute("llm.token_count.completion", 20)
span.set_attribute("llm.token_count.total", 30)
```

## Verification

### Test Script

```bash
cd d:\Github_Projects\Modme_2026\modme-ui-01-test-worktree
.venv\Scripts\python.exe scripts/test_correct_project_attribute.py
```

### Query Traces

```bash
# Set environment variables for Phoenix CLI
$env:PHOENIX_HOST='http://localhost:6006'
$env:PHOENIX_PROJECT='github-copilot'

# Query traces
npx @arizeai/phoenix-cli traces --limit 5
```

### Expected Output

```
Resolving project: github-copilot
Fetching last 5 trace(s)...
Found 1 trace(s)
┌─ Trace: 7a813619e93b3d2d721abc0612f25d84
│
│  Spans:
│  └─ ✓ github-copilot.completion (LLM) - 0ms
└─
```

## VS Code AI Toolkit Pattern Compatibility

The VS Code AI Toolkit documentation uses standard OTLP, which Phoenix supports. The **only** changes needed:

1. **Endpoint**: Change from `http://localhost:4318/v1/traces` to `http://localhost:6006/v1/traces`
2. **Project Attribute**: Use `openinference.project.name` instead of generic `project.name`

Everything else from the VS Code pattern works identically:

- ✅ OpenTelemetry SDK setup
- ✅ OTLP exporter configuration
- ✅ Instrumentation libraries (OpenAI, Anthropic, LangChain, etc.)
- ✅ Span creation and attributes

## Recommended Setup (Production)

```python
from phoenix.otel import register

# Phoenix's convenience wrapper handles all configuration
tracer_provider = register(
    project_name="github-copilot",  # Automatically sets openinference.project.name
    endpoint="http://localhost:6006/v1/traces",  # Or use PHOENIX_COLLECTOR_ENDPOINT env var
    batch=True,  # Use BatchSpanProcessor (recommended for production)
    auto_instrument=True,  # Auto-instrument installed libraries
)
```

Using `phoenix.otel.register()` is recommended because it:

- ✅ Automatically sets correct resource attributes
- ✅ Uses `BatchSpanProcessor` by default
- ✅ Supports auto-instrumentation
- ✅ Handles Phoenix-specific configuration

## Environment Variables

Set these for automatic configuration:

```bash
# Phoenix endpoint
export PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006/v1/traces

# Project name (automatically becomes openinference.project.name)
export PHOENIX_PROJECT_NAME=github-copilot

# API key for Phoenix Cloud (if using)
export PHOENIX_API_KEY=your-key-here
```

## Next Steps

1. ✅ **Test with real LLM SDK** - Install `openinference-instrumentation-openai` and test with actual OpenAI calls
2. ✅ **Set up auto-instrumentation** - Use `register(auto_instrument=True)` to trace existing code
3. ✅ **Configure MCP tools** - Test `@phoenix` commands in VS Code Copilot Chat
4. ✅ **Production deployment** - Use `batch=True` and proper error handling
5. ✅ **Custom spans** - Add manual spans for GitHub Copilot-specific events

## References

- [Phoenix OTLP Documentation](https://arize.com/docs/phoenix/sdk-api-reference/python/arize-phoenix-otel)
- [OpenInference Semantic Conventions](https://github.com/Arize-ai/openinference)
- [VS Code AI Toolkit Tracing](https://code.visualstudio.com/docs/intelligentapps/tracing)
- [Phoenix Docker Deployment](https://docs.arize.com/phoenix/deployment/deploying-phoenix)

## Test Files Created

- ✅ `scripts/test_correct_project_attribute.py` - Working example with correct attributes
- ✅ `scripts/test_manual_trace.py` - Manual span creation (outdated - used wrong attribute)
- ✅ `scripts/test_otlp_protobuf.py` - OTLP format test (outdated - used wrong attribute)
- ✅ `scripts/verify_phoenix_setup.py` - Health check script (still valid)
- ✅ `agent/instrumentation_examples/phoenix_tracing_setup.py` - Production-ready example (needs update)

## Summary

**Problem**: Traces sent successfully but not visible ❌
**Root Cause**: Wrong resource attribute (`project.name` vs `openinference.project.name`) 🔍
**Solution**: Use `openinference.project.name` for Phoenix project mapping ✅
**Status**: Traces now appearing in Phoenix queries and UI 🎉
**Next**: Test with real LLM instrumentation and MCP tools 🚀
