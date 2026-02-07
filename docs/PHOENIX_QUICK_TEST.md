# Quick Test: VS Code AI Toolkit Pattern with Phoenix

**Goal**: Verify that the VS Code AI Toolkit tracing pattern works with Phoenix.

## What You'll Test

The OpenTelemetry setup from VS Code AI Toolkit docs, pointing to Phoenix instead of AI Toolkit's collector.

## Prerequisites

✅ Phoenix running at http://localhost:6006 (check with `python scripts/verify_phoenix_setup.py`)
✅ Project `github-copilot` created
✅ Environment variables set in `.env`

## Option 1: Test with Provided Example (Easiest)

### Step 1: Install Dependencies

```bash
pip install opentelemetry-sdk opentelemetry-exporter-otlp-proto-http
```

### Step 2: Run Test Script

```bash
python agent/instrumentation_examples/phoenix_tracing_setup.py
```

### Step 3: Check Phoenix UI

1. Open http://localhost:6006
2. Select "github-copilot" project
3. You should see a test trace appear

**Expected output**:

```
Setting up OpenTelemetry tracing to Phoenix...
Tracing configured for Phoenix at http://localhost:6006
Project: github-copilot

====================================
Phoenix Tracing Demo
====================================

Check Phoenix: http://localhost:6006
Project: github-copilot
====================================
```

## Option 2: Test with Real LLM (OpenAI Example)

### Step 1: Install OpenAI + Instrumentation

```bash
pip install openai openinference-instrumentation-openai
```

### Step 2: Create Test File

Create `test_openai_phoenix.py`:

```python
import os
from dotenv import load_dotenv

load_dotenv()

# OpenTelemetry setup (BEFORE importing OpenAI)
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

resource = Resource(attributes={
    "service.name": os.getenv("OTEL_SERVICE_NAME", "test-openai"),
    "project.name": os.getenv("PHOENIX_PROJECT", "github-copilot"),
})

provider = TracerProvider(resource=resource)
otlp_exporter = OTLPSpanExporter(
    endpoint="http://localhost:6006/v1/traces",  # Phoenix endpoint
)
processor = BatchSpanProcessor(otlp_exporter)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# Instrument OpenAI
from openinference.instrumentation.openai import OpenAIInstrumentor
OpenAIInstrumentor().instrument()

# Now use OpenAI normally
from openai import OpenAI
client = OpenAI()  # Uses OPENAI_API_KEY from .env

print("Sending traced request to OpenAI...")
response = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[
        {"role": "user", "content": "What is 2+2?"}
    ]
)

print(f"Response: {response.choices[0].message.content}")
print("\nTrace sent to Phoenix!")
print("View at: http://localhost:6006")
```

### Step 3: Set API Key

Add to `.env`:

```
OPENAI_API_KEY=your-key-here
```

### Step 4: Run

```bash
python test_openai_phoenix.py
```

### Step 5: Verify in Phoenix

1. Open http://localhost:6006
2. Select "github-copilot" project
3. See trace with:
   - Full prompt text
   - Model response
   - Token counts
   - Timing information
   - Model name (gpt-3.5-turbo)

## Option 3: Test with Azure AI (Free GitHub Models)

### Step 1: Get GitHub Token

1. Go to https://github.com/settings/tokens
2. Generate new token with `models:read` permission

### Step 2: Install Azure AI SDK

```bash
pip install azure-ai-inference[opentelemetry]
```

### Step 3: Set Token

Add to `.env`:

```
GITHUB_TOKEN=your-github-token
```

### Step 4: Run Example

The provided `phoenix_tracing_setup.py` already has Azure AI code. Just run it:

```bash
python agent/instrumentation_examples/phoenix_tracing_setup.py
```

## What to Look For in Phoenix

When you view the trace in Phoenix UI, you should see:

### Trace Overview

- **Service name**: "github-copilot" or "test-openai"
- **Project**: "github-copilot"
- **Duration**: Request timing
- **Status**: SUCCESS or ERROR

### Span Details

Click on the span to see:

**Input Tab**:

- Full prompt/messages sent to LLM
- System messages (if any)
- User messages

**Output Tab**:

- Complete LLM response
- Finish reason (e.g., "stop")

**Metadata Tab**:

- `llm.model_name`: Model used (e.g., "gpt-3.5-turbo")
- `llm.token_count.prompt`: Input tokens
- `llm.token_count.completion`: Output tokens
- `llm.token_count.total`: Total tokens
- `llm.temperature`: Temperature setting
- Request/response timestamps

## Troubleshooting

### "No traces appearing"

**Check 1**: Phoenix is running

```bash
curl http://localhost:6006/healthz
# Should return: OK
```

**Check 2**: Endpoint is correct

```python
# Should be port 6006, not 4318
endpoint="http://localhost:6006/v1/traces"
```

**Check 3**: OTLP exporter installed

```bash
pip list | grep opentelemetry-exporter-otlp
```

**Check 4**: Instrumentation is applied BEFORE SDK import

```python
# ✅ Correct order:
from openinference.instrumentation.openai import OpenAIInstrumentor
OpenAIInstrumentor().instrument()
from openai import OpenAI  # Import AFTER instrumentation

# ❌ Wrong order:
from openai import OpenAI  # Too early!
OpenAIInstrumentor().instrument()  # Won't work
```

### "ModuleNotFoundError"

Install missing package:

```bash
# For OpenAI
pip install openinference-instrumentation-openai

# For Anthropic
pip install openinference-instrumentation-anthropic

# For LangChain
pip install openinference-instrumentation-langchain
```

### "Connection refused"

Phoenix isn't running:

```bash
# Check Docker
docker ps | grep phoenix

# Or check the port
netstat -an | grep 6006
```

## Success Criteria

✅ Script runs without errors
✅ Trace appears in Phoenix UI
✅ Can see full prompt and response
✅ Token counts are recorded
✅ Timing information is captured

## Next Steps After Success

1. **Integrate into your app**: Copy the OpenTelemetry setup to your actual application's entry point

2. **Test with GitHub Copilot**: Create a VSCode extension that uses this same pattern to capture Copilot interactions

3. **Explore Phoenix features**:
   - Create datasets from traces
   - Run experiments
   - Add annotations
   - Use MCP tools to query data

## Summary

The VS Code AI Toolkit tracing pattern **works perfectly** with Phoenix! You just:

1. Use the same OpenTelemetry setup
2. Change endpoint from 4318 → 6006
3. Your traces flow to Phoenix instead of AI Toolkit

This is the **easiest and most maintainable** way to add tracing because it uses standard OpenTelemetry patterns documented by Microsoft.
