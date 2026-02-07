# Using VS Code AI Toolkit Tracing Pattern with Phoenix

**Source**: [VS Code AI Toolkit - Tracing Documentation](https://code.visualstudio.com/docs/intelligentapps/tracing)

## Overview

Yes, you can **absolutely** use the VS Code AI Toolkit tracing pattern with Phoenix! The setup is nearly identical - you just change the endpoint from AI Toolkit's collector to Phoenix's collector.

## Key Difference

| Component     | AI Toolkit                        | Phoenix                              |
| ------------- | --------------------------------- | ------------------------------------ |
| OTLP Endpoint | `http://localhost:4318/v1/traces` | `http://localhost:6006/v1/traces` ✅ |
| Port          | 4318                              | 6006                                 |
| Protocol      | OTLP/HTTP                         | OTLP/HTTP (same)                     |
| Visualization | AI Toolkit extension              | Phoenix UI (http://localhost:6006)   |

## What the VS Code Pattern Provides

The VS Code AI Toolkit documentation shows how to:

1. ✅ **Set up OpenTelemetry** - Same for Phoenix
2. ✅ **Configure OTLP exporter** - Just change the endpoint
3. ✅ **Instrument SDKs** - Works identically
4. ✅ **Capture traces** - Same OpenTelemetry protocol

## Adapted Code for Phoenix

### Original (AI Toolkit)

```python
otlp_exporter = OTLPSpanExporter(
    endpoint="http://localhost:4318/v1/traces",  # AI Toolkit
)
```

### Modified (Phoenix)

```python
otlp_exporter = OTLPSpanExporter(
    endpoint="http://localhost:6006/v1/traces",  # Phoenix ✅
)
```

## Complete Phoenix Setup

I've created a ready-to-use example based on the VS Code pattern:

**File**: [`agent/instrumentation_examples/phoenix_tracing_setup.py`](../agent/instrumentation_examples/phoenix_tracing_setup.py)

This includes:

- Full OpenTelemetry configuration
- Phoenix endpoint (port 6006)
- Resource attributes with project name
- Example instrumentation for multiple SDKs
- Working demo code

## Supported SDKs (from VS Code docs)

All these work with Phoenix by changing the endpoint:

### Python

- ✅ **Azure AI Inference** (native OTLP support)
- ✅ **Anthropic** (via openinference-instrumentation-anthropic)
- ✅ **OpenAI** (via openinference-instrumentation-openai)
- ✅ **LangChain** (via openinference-instrumentation-langchain)
- ✅ **Google Gemini** (via openinference-instrumentation-google-generativeai)

### TypeScript/JavaScript

- ✅ **Azure AI Inference**
- ✅ **OpenAI** (via traceloop)
- ✅ **LangChain** (via traceloop)
- ✅ **Anthropic** (via traceloop)

## Installation

### Required Packages

```bash
# Base OpenTelemetry
pip install opentelemetry-sdk opentelemetry-exporter-otlp-proto-http

# Choose your SDK instrumentation:

# Azure AI Inference (has native OTLP support)
pip install azure-ai-inference[opentelemetry]

# OpenAI
pip install openinference-instrumentation-openai

# Anthropic
pip install openinference-instrumentation-anthropic

# LangChain
pip install openinference-instrumentation-langchain

# Google Gemini
pip install openinference-instrumentation-google-generativeai
```

## Quick Start

### 1. Set Environment Variables

```bash
# .env file
PHOENIX_ENDPOINT=http://localhost:6006
PHOENIX_PROJECT=github-copilot
OTEL_SERVICE_NAME=github-copilot
```

### 2. Add Tracing Setup to Your Code

At the **top** of your main.py or app entry point:

```python
import os
from dotenv import load_dotenv

load_dotenv()

# OpenTelemetry imports
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# Configure service
service_name = os.getenv("OTEL_SERVICE_NAME", "my-app")
phoenix_project = os.getenv("PHOENIX_PROJECT", "default")

# Create resource
resource = Resource(attributes={
    "service.name": service_name,
    "project.name": phoenix_project,
})

# Set up trace provider
provider = TracerProvider(resource=resource)
otlp_exporter = OTLPSpanExporter(
    endpoint="http://localhost:6006/v1/traces",  # Phoenix
)
processor = BatchSpanProcessor(otlp_exporter)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# Instrument your SDK
from openinference.instrumentation.openai import OpenAIInstrumentor
OpenAIInstrumentor().instrument()

# Now your LLM calls are traced!
from openai import OpenAI
client = OpenAI()
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### 3. Run Your Code

```bash
python main.py
```

### 4. View Traces in Phoenix

1. Open http://localhost:6006
2. Select your project (e.g., "github-copilot")
3. See traces appear in real-time

## Advantages of This Approach

### ✅ Production-Ready

- Standard OpenTelemetry protocol
- Battle-tested instrumentation libraries
- No custom code needed

### ✅ Framework Agnostic

- Works with any SDK that supports OTLP
- Easy to switch between providers
- Minimal configuration changes

### ✅ Rich Metadata

- Captures full request/response content
- Token counts automatically recorded
- Model parameters tracked
- Error details included

### ✅ Zero Code Changes

Once instrumented, all your existing LLM calls are automatically traced - no need to wrap them manually.

## GitHub Copilot Integration

For capturing GitHub Copilot traces specifically, you have two options:

### Option A: Use This Pattern in a Wrapper Extension

Create a VSCode extension that:

1. Intercepts Copilot API calls
2. Uses this OpenTelemetry setup
3. Sends traces to Phoenix

### Option B: Environment Variables (May Work)

The Copilot extension might respect OTEL environment variables:

```json
// VSCode settings.json
{
  "terminal.integrated.env.windows": {
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:6006/v1/traces",
    "OTEL_SERVICE_NAME": "github-copilot"
  }
}
```

**Note**: This depends on whether GitHub Copilot is internally instrumented with OpenTelemetry (undocumented).

## Alternative: Manual Span Creation

If auto-instrumentation doesn't work, you can manually create spans:

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("copilot.completion") as span:
    span.set_attribute("llm.model_name", "gpt-4")
    span.set_attribute("input.value", prompt)

    # Your Copilot API call here
    response = copilot_api_call(prompt)

    span.set_attribute("output.value", response)
    span.set_attribute("llm.token_count.total", tokens)
```

## Testing Your Setup

### 1. Verify Phoenix is Ready

```bash
python scripts/verify_phoenix_setup.py
```

### 2. Run Example Trace

```bash
python agent/instrumentation_examples/phoenix_tracing_setup.py
```

### 3. Check Phoenix UI

- Open http://localhost:6006
- Select "github-copilot" project
- You should see the test trace

## Comparison: AI Toolkit vs Phoenix

| Feature          | AI Toolkit                | Phoenix            |
| ---------------- | ------------------------- | ------------------ |
| Setup Complexity | Same                      | Same               |
| OTLP Support     | ✅                        | ✅                 |
| Visualization    | VSCode extension          | Web UI             |
| Cost             | Free                      | Free (self-hosted) |
| Cloud Option     | Azure Monitor integration | Phoenix Cloud      |
| Multi-Project    | Limited                   | ✅ Full support    |
| Datasets         | ❌                        | ✅                 |
| Experiments      | ❌                        | ✅                 |
| Evaluations      | ❌                        | ✅                 |
| MCP Integration  | ❌                        | ✅ (you have this) |

## Summary

**Yes, you can absolutely use the VS Code AI Toolkit pattern!**

The key insight: Both AI Toolkit and Phoenix use the **same OpenTelemetry protocol (OTLP)**. The VS Code docs provide excellent examples of how to set up instrumentation - you just need to change the endpoint from port 4318 (AI Toolkit) to port 6006 (Phoenix).

**Your advantage**: You get all the benefits of Phoenix (datasets, experiments, evaluations, MCP querying) with the same instrumentation approach documented by Microsoft.

## Next Steps

1. ✅ **Use the provided example**: Run `agent/instrumentation_examples/phoenix_tracing_setup.py`

2. ✅ **Adapt to your needs**: Copy the OpenTelemetry setup to your actual LLM application

3. ✅ **Test end-to-end**: Make LLM calls and verify traces appear in Phoenix

4. ⏭️ **GitHub Copilot specific**: Create wrapper extension or test environment variables (see Option A/B above)

## Resources

- Original VS Code docs: https://code.visualstudio.com/docs/intelligentapps/tracing
- Phoenix setup example: `agent/instrumentation_examples/phoenix_tracing_setup.py`
- OpenInference docs: https://github.com/Arize-ai/openinference
- OpenTelemetry Python: https://opentelemetry.io/docs/languages/python/
