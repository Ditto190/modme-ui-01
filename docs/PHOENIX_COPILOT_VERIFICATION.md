# Phoenix VSCode Copilot Integration Verification Guide

This guide shows you how to verify that VSCode Copilot telemetry is correctly sending traces to Phoenix.

## Overview

Our VSCode Copilot integration consists of two layers:

1. **Instrumentation Layer** (Our Implementation): Captures Copilot interactions and sends them as OpenTelemetry spans to Phoenix
2. **MCP Query Layer** (Phoenix MCP Server): Allows AI assistants to query and analyze the collected traces

This guide focuses on verifying the **instrumentation layer** is working correctly.

## Prerequisites

- [ ] Phoenix server running on `http://localhost:6006`
- [ ] VSCode with GitHub Copilot extension installed
- [ ] Our agent running with Phoenix instrumentation enabled
- [ ] `.env` file with `ENABLE_PHOENIX=true`

## Quick Verification Checklist

```bash
# 1. Check Phoenix is running
curl http://localhost:6006/healthz

# 2. Check agent is running with Phoenix enabled
curl http://localhost:8000/health

# 3. Verify environment variables
cat .env | grep PHOENIX
```

## Step 1: Start Phoenix Server

```bash
# Using Python
python -m phoenix.server.main serve

# Or using Docker
docker run -p 6006:6006 -p 4317:4317 arizephoenix/phoenix:latest

# Verify Phoenix is running
curl http://localhost:6006/healthz
# Expected: {"status": "healthy"}
```

Open Phoenix UI: http://localhost:6006

## Step 2: Enable Phoenix Instrumentation

Edit your `.env` file:

```bash
# Phoenix Observability Configuration
PHOENIX_ENDPOINT=http://localhost:6006
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006/v1/traces
SERVICE_NAME=modme-agent
ENABLE_PHOENIX=true
ENABLE_CONSOLE_EXPORT=true  # Enable for debugging
```

## Step 3: Start the Agent with Tracing

```bash
# In the test-worktree directory
npm run dev:agent

# Or with debug logging
LOG_LEVEL=debug npm run dev:agent
```

You should see output similar to:

```
INFO: Phoenix tracer initialized
INFO: Endpoint: http://localhost:6006/v1/traces
INFO: Service: modme-agent
INFO: Instrumentors: ['openai', 'anthropic', 'google_generativeai', 'vscode-copilot']
```

## Step 4: Generate Test Traces

### Method A: Manual Test via HTTP Endpoint

If you deployed the VSCode Copilot telemetry endpoint:

```bash
# Test the telemetry endpoint
curl -X POST http://localhost:8000/vscode/copilot/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "chat_request",
    "user_id": "test-user",
    "session_id": "test-session-001",
    "conversation_id": "conv-001",
    "message": "How do I implement authentication?",
    "metadata": {
      "workspace": "modme-ui-01-test-worktree",
      "language": "typescript"
    }
  }'

# Simulate response
curl -X POST http://localhost:8000/vscode/copilot/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "chat_response",
    "user_id": "test-user",
    "session_id": "test-session-001",
    "conversation_id": "conv-001",
    "response": "Here is how to implement authentication...",
    "model": "gpt-4",
    "tokens_used": 250,
    "latency_ms": 1200
  }'
```

### Method B: Test with Custom Provider Tracer

Create a test script `test_copilot_trace.py`:

```python
from agent.observability.custom_provider_tracer import trace_custom_llm
import time

def test_copilot_trace():
    """Test VSCode Copilot trace generation."""

    # Simulate a Copilot interaction
    with trace_custom_llm(
        provider="vscode-copilot",
        model="gpt-4",
        input_messages=[{
            "role": "user",
            "content": "Explain the difference between useState and useReducer"
        }]
    ) as tracer:
        # Simulate processing time
        time.sleep(0.5)

        # Set response
        tracer.set_output({
            "role": "assistant",
            "content": "useState is for simple state, useReducer is for complex state..."
        })

        # Set token counts
        tracer.set_tokens(input_tokens=45, output_tokens=120, total_tokens=165)

        # Set model parameters
        tracer.set_parameters(
            temperature=0.7,
            max_tokens=500,
            top_p=0.9
        )

        # Add metadata
        tracer.set_metadata({
            "workspace": "modme-ui-01-test-worktree",
            "file_extension": ".tsx",
            "copilot_version": "1.150.0"
        })

if __name__ == "__main__":
    test_copilot_trace()
    print("✅ Test trace sent to Phoenix")
```

Run the test:

```bash
cd agent
python test_copilot_trace.py
```

### Method C: Test with Instrumentor

```python
from agent.observability.phoenix_instrumentors import instrument_all_providers
from opentelemetry import trace

# Initialize instrumentation
instrument_all_providers()

# Get tracer
tracer = trace.get_tracer("test.vscode.copilot")

# Create a test span
with tracer.start_as_current_span("copilot.chat.request") as span:
    span.set_attribute("llm.provider", "openai")
    span.set_attribute("llm.model_name", "gpt-4")
    span.set_attribute("llm.input_messages", '[{"role": "user", "content": "Test message"}]')
    span.set_attribute("llm.output_messages", '[{"role": "assistant", "content": "Test response"}]')
    span.set_attribute("llm.token_count.prompt", 10)
    span.set_attribute("llm.token_count.completion", 20)
    span.set_attribute("llm.token_count.total", 30)

print("✅ Manual trace sent")
```

## Step 5: Verify Traces in Phoenix UI

### Via Phoenix Web UI

1. Open Phoenix UI: http://localhost:6006
2. Navigate to **Projects** tab
3. Look for your project (default: `modme-agent`)
4. Click on the project to view traces

**What to look for**:

- Traces with span names like `copilot.chat.request`, `llm.chat`
- OpenInference semantic attributes:
  - `llm.model_name`
  - `llm.input_messages`
  - `llm.output_messages`
  - `llm.token_count.*`
- Custom metadata in span attributes

### Via Phoenix GraphQL API

```bash
# Query recent spans
curl -X POST http://localhost:6006/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ spans(first: 10) { edges { node { name, attributes, startTime, endTime } } } }"
  }' | jq
```

### Via Phoenix MCP Server (if configured)

Ask your AI assistant (Claude, Copilot):

```
Show me the most recent traces for the modme-agent project
```

Or:

```
List spans with the name containing "copilot" from the last hour
```

## Step 6: Debug Console Output (if enabled)

If you enabled `ENABLE_CONSOLE_EXPORT=true`, you should see span output in the console:

```json
{
  "name": "copilot.chat.request",
  "context": {
    "trace_id": "0x1234567890abcdef",
    "span_id": "0xabcdef123456",
    "trace_state": "[]"
  },
  "kind": "SpanKind.CLIENT",
  "parent_id": null,
  "start_time": "2026-02-08T10:30:00.000000Z",
  "end_time": "2026-02-08T10:30:01.234000Z",
  "status": {
    "status_code": "OK"
  },
  "attributes": {
    "llm.provider": "openai",
    "llm.model_name": "gpt-4",
    "llm.input_messages": "[{\"role\": \"user\", \"content\": \"Test\"}]",
    "llm.token_count.prompt": 10,
    "llm.token_count.completion": 20
  }
}
```

## Step 7: Validate OpenInference Attributes

Check that spans contain the required OpenInference semantic attributes:

### Required Attributes

- ✅ `llm.model_name` - Model identifier (e.g., "gpt-4")
- ✅ `llm.input_messages` - JSON array of input messages
- ✅ `llm.output_messages` - JSON array of output messages

### Recommended Attributes

- ✅ `llm.token_count.prompt` - Number of prompt tokens
- ✅ `llm.token_count.completion` - Number of completion tokens
- ✅ `llm.token_count.total` - Total tokens used
- ✅ `llm.invocation_parameters` - JSON string of model parameters
- ✅ `llm.provider` - Provider name (e.g., "openai")

### Custom Metadata

- `vscode.workspace` - Workspace path
- `vscode.language` - Programming language
- `vscode.file_extension` - File extension
- `copilot.version` - Copilot extension version

## Troubleshooting

### No Traces Appearing in Phoenix

**Check 1: Phoenix is running**

```bash
curl http://localhost:6006/healthz
```

Expected: `{"status": "healthy"}`

**Check 2: Agent OpenTelemetry configuration**

```python
# In agent/main.py or agent startup script
from phoenix.otel import register

tracer_provider = register(
    project_name="modme-agent",
    endpoint="http://localhost:6006/v1/traces"
)
```

**Check 3: Environment variables**

```bash
echo $PHOENIX_ENDPOINT
echo $ENABLE_PHOENIX
```

**Check 4: Firewall/Network**

```bash
# Test connectivity
curl -v http://localhost:6006/v1/traces
```

### Traces Sent but Not Showing Correct Data

**Issue**: Spans appear but attributes are missing

**Solution**: Verify OpenInference attribute format:

```python
# ❌ Incorrect (plain dict)
span.set_attribute("llm.input_messages", {"role": "user", "content": "test"})

# ✅ Correct (JSON string)
import json
span.set_attribute("llm.input_messages", json.dumps([{"role": "user", "content": "test"}]))
```

### Console Shows Errors

**Error**: `Failed to export spans to Phoenix`

**Check**:

1. Phoenix collector endpoint is correct
2. Phoenix is accepting OTLP traces on `/v1/traces`
3. Check Phoenix logs for errors

```bash
# If using Docker
docker logs <phoenix-container-id>
```

**Error**: `Trace context propagation failed`

**Solution**: Ensure OpenTelemetry context is properly initialized before creating spans:

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider

# Must set tracer provider before using traces
trace.set_tracer_provider(TracerProvider())
```

### VSCode Extension Not Sending Data

**Issue**: Created VSCode extension but no telemetry is sent

**Check**:

1. Extension is activated (`extension.activate()` was called)
2. Event listeners are registered (check VS Code Output > "Extension Host")
3. Telemetry endpoint URL is correct in extension code

**Debug in Extension**:

```typescript
// In extension.ts
console.log("[Copilot Telemetry] Sending event:", event);

fetch("http://localhost:8000/vscode/copilot/telemetry", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(event),
})
  .then((res) => console.log("[Copilot Telemetry] Response:", res.status))
  .catch((err) => console.error("[Copilot Telemetry] Error:", err));
```

## Testing Checklist

Use this checklist to verify your integration:

- [ ] Phoenix server running and accessible
- [ ] Agent running with `ENABLE_PHOENIX=true`
- [ ] Environment variables configured correctly
- [ ] Test trace sent successfully (HTTP endpoint or Python script)
- [ ] Trace appears in Phoenix UI within 10 seconds
- [ ] Trace contains correct OpenInference attributes
- [ ] Spans show proper hierarchy (parent/child relationships)
- [ ] Token counts are accurate
- [ ] Latency measurements are reasonable
- [ ] Custom metadata appears in span attributes
- [ ] Phoenix MCP tools can query the traces (if configured)

## Success Criteria

Your integration is working correctly if:

1. ✅ Traces appear in Phoenix UI within 10 seconds of generation
2. ✅ Spans contain all required OpenInference semantic attributes
3. ✅ Token counts and latencies are accurate
4. ✅ No errors in agent logs or Phoenix logs
5. ✅ AI assistants can query traces via Phoenix MCP Server

## Next Steps

Once verification is complete:

1. Monitor Phoenix UI regularly for trace quality
2. Set up alerts for failed spans or high latency
3. Create evaluation tests using Phoenix Experiments
4. Build custom dashboards for key metrics
5. Document common trace patterns for your team

## Related Documentation

- [PHOENIX_MCP_CONFIG.md](./PHOENIX_MCP_CONFIG.md) - Phoenix MCP Server configuration
- [PHOENIX_AI_PROVIDER_INTEGRATION.md](./PHOENIX_AI_PROVIDER_INTEGRATION.md) - Full provider integration guide
- [VSCODE_COPILOT_EXTENSION.md](./VSCODE_COPILOT_EXTENSION.md) - VSCode extension development
- [Phoenix Tracing Docs](https://docs.arize.com/phoenix/tracing/how-to-tracing/setup-tracing)
- [OpenInference Spec](https://github.com/Arize-ai/openinference/blob/main/spec/semantic_conventions.md)

## Support

If you encounter issues:

1. Check [Phoenix Support Slack](https://arize-ai.slack.com/archives/C04R3GXC8HK)
2. Search [Phoenix GitHub Issues](https://github.com/Arize-ai/phoenix/issues)
3. Use Phoenix MCP tools with phoenix-support for context-aware help:
   ```
   @phoenix-support I'm having trouble with VSCode Copilot traces not appearing in Phoenix. I confirmed Phoenix is running on localhost:6006 and ENABLE_PHOENIX=true is set. What should I check?
   ```
