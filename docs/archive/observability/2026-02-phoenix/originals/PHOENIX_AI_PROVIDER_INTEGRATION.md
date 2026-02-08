# AI Provider Integration Guide for Phoenix Observability

**Last Updated**: February 8, 2026

## Overview

This guide explains how to integrate any AI provider into Phoenix's observability platform. It covers:

1. **Auto-Instrumented Providers** (Anthropic, OpenAI, Google) - Zero code changes
2. **VSCode Copilot** - Custom telemetry adapter with extension
3. **Custom Providers** (Claude Desktop, Windsurf, Cursor, etc.) - Manual tracing

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│ AI Providers                                         │
│                                                      │
│  Auto-Instrumented (SDK-based)                      │
│  ├─ Anthropic SDK → AnthropicInstrumentor           │
│  ├─ OpenAI SDK → OpenAIInstrumentor                 │
│  └─ Google SDK → GoogleGenerativeAIInstrumentor      │
│                                                      │
│  VSCode Extension-based                              │
│  └─ GitHub Copilot → VSCodeCopilotTelemetryAdapter   │
│                                                      │
│  Custom/Manual                                       │
│  ├─ Claude Desktop → CustomProviderTracer            │
│  ├─ Windsurf IDE → CustomProviderTracer              │
│  ├─ Cursor IDE → CustomProviderTracer                │
│  └─ Any Custom LLM → CustomProviderTracer            │
└──────────────────┬───────────────────────────────────┘
                   │
                   │ OpenTelemetry Spans
                   │ (OpenInference Attributes)
                   ▼
┌──────────────────────────────────────────────────────┐
│ OpenTelemetry Collector                               │
│  ├─ Span Processors (Batch)                         │
│  └─ Multi-Exporter                                   │
│      ├─ Phoenix Exporter (OTLP)                      │
│      └─ GreptimeDB Exporter (optional)               │
└────────┬──────────────────┬──────────────────────────┘
         │                  │
         ▼                  ▼
    ┌─────────┐       ┌──────────────┐
    │ Phoenix │       │ GreptimeDB   │
    │ Server  │       │ (optional)   │
    │ (6006)  │       │ (4000)       │
    └────┬────┘       └──────────────┘
         │
         ▼
    [Phoenix UI]
```

---

## Quick Start by Provider Type

### Auto-Instrumented SDK Providers

For Anthropic, OpenAI, and Google SDKs:

```python
# agent/main.py
from observability.phoenix_config import initialize_phoenix
from observability.phoenix_instrumentors import instrument_all_providers

# Initialize Phoenix tracing
tracer, config = initialize_phoenix(
    enable_greptime=True,  # Optional dual export
    enable_console=False   # Debug mode
)

# Auto-instrument all SDK-based providers
instrumentors = instrument_all_providers()

# Now use your LLM SDKs normally - they're automatically traced!
import anthropic
client = anthropic.Anthropic(api_key="...")
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    messages=[{"role": "user", "content": "Hello!"}]
)
# ✅ Automatically traced and sent to Phoenix
```

### VSCode Copilot (Extension-Based)

**Requires**: Custom VSCode extension to capture telemetry

```python
# agent/main.py
from observability.vscode_copilot_telemetry import create_fastapi_endpoint
from fastapi import FastAPI

app = FastAPI()

# Add Copilot telemetry endpoint
app.include_router(create_fastapi_endpoint())

# VSCode extension sends events to: POST /api/telemetry/copilot
```

**VSCode Extension** (TypeScript):

```typescript
// extension.ts
import * as vscode from "vscode";
import axios from "axios";

async function logCopilotChat(requestId: string, userQuery: string) {
  await axios.post("http://localhost:8000/api/telemetry/copilot", {
    event_type: "chat_request",
    request_id: requestId,
    data: {
      user_query: userQuery,
      context: {
        file_path: vscode.window.activeTextEditor?.document.fileName,
        language: vscode.window.activeTextEditor?.document.languageId,
      },
    },
  });
}
```

See full extension guide: [VSCODE_COPILOT_EXTENSION.md](./VSCODE_COPILOT_EXTENSION.md)

### Custom Providers (Manual Tracing)

For Claude Desktop, Windsurf, Cursor, or any custom LLM:

```python
from observability.custom_provider_tracer import CustomProviderTracer

# Create tracer for your provider
tracer = CustomProviderTracer(provider="claude-desktop")

# Wrap LLM calls
with tracer.trace_llm_call(
    model="claude-3-5-sonnet",
    operation="chat_completion"
) as span:
    # Make your LLM API call
    response = your_llm_client.chat("Hello!")

    # Add trace attributes
    tracer.set_input(span, "Hello!")
    tracer.set_output(span, response["text"])
    tracer.set_tokens(span, input_tokens=5, output_tokens=20)
    tracer.set_parameters(span, temperature=0.7, max_tokens=2048)
```

---

## Provider Comparison

| Provider          | Integration Method | Auto-Instrumentation | Setup Effort | Token Tracking | Tool Calls |
| ----------------- | ------------------ | -------------------- | ------------ | -------------- | ---------- |
| Anthropic         | SDK                | ✅ Yes               | Low          | ✅ Yes         | ✅ Yes     |
| OpenAI            | SDK                | ✅ Yes               | Low          | ✅ Yes         | ✅ Yes     |
| Google Generative | SDK                | ✅ Yes               | Low          | ✅ Yes         | ✅ Yes     |
| GitHub Copilot    | VSCode Extension   | ⚠️ Custom            | High         | ⚠️ Partial     | ⚠️ Partial |
| Claude Desktop    | Manual             | ❌ No                | Medium       | ❌ Manual      | ❌ Manual  |
| Windsurf          | Manual             | ❌ No                | Medium       | ❌ Manual      | ❌ Manual  |
| Cursor            | Manual             | ❌ No                | Medium       | ❌ Manual      | ❌ Manual  |
| Custom LLM        | Manual             | ❌ No                | Medium       | ❌ Manual      | ❌ Manual  |

---

## Detailed Integration Examples

### Example 1: Anthropic (Auto-Instrumented)

```python
# No instrumentation code needed - just initialize once
from observability.phoenix_config import initialize_phoenix
from observability.phoenix_instrumentors import instrument_all_providers

tracer, config = initialize_phoenix()
instrumentors = instrument_all_providers()

# Use Anthropic SDK normally
import anthropic
client = anthropic.Anthropic(api_key="...")

# This call is automatically traced
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Explain recursion"}]
)

# Traces include:
# - llm.provider: "anthropic"
# - llm.model: "claude-3-5-sonnet-20241022"
# - llm.token_count.prompt: 5
# - llm.token_count.completion: 42
# - llm.latency_ms: 1234
# - input.value: "Explain recursion"
# - output.value: "Recursion is a programming technique..."
```

### Example 2: VSCode Copilot (Extension-Based)

**Python Agent Side**:

```python
# agent/main.py
from fastapi import FastAPI
from observability.vscode_copilot_telemetry import create_fastapi_endpoint

app = FastAPI()
app.include_router(create_fastapi_endpoint())

# Endpoint available at: POST /api/telemetry/copilot
```

**VSCode Extension Side**:

```typescript
// extension.ts
import * as vscode from "vscode";
import axios from "axios";

const AGENT_URL = "http://localhost:8000";

export function activate(context: vscode.ExtensionContext) {
  // Listen for Copilot chat requests
  const chatDisposable = vscode.chat.onDidSendChatMessage(async (event) => {
    const requestId = generateRequestId();

    // Log request
    await axios.post(`${AGENT_URL}/api/telemetry/copilot`, {
      event_type: "chat_request",
      request_id: requestId,
      data: {
        user_query: event.message,
        context: {
          file_path: vscode.window.activeTextEditor?.document.fileName,
          language: vscode.window.activeTextEditor?.document.languageId,
          workspace: vscode.workspace.name,
        },
      },
    });

    // Store requestId to match response
    pendingRequests.set(event.id, requestId);
  });

  // Listen for Copilot responses
  const responseDisposable = vscode.chat.onDidReceiveChatResponse(async (event) => {
    const requestId = pendingRequests.get(event.chatMessageId);
    if (!requestId) return;

    // Log response
    await axios.post(`${AGENT_URL}/api/telemetry/copilot`, {
      event_type: "chat_response",
      request_id: requestId,
      data: {
        agent_response: event.content,
        model: event.model || "gpt-4o",
        input_tokens: event.usage?.promptTokens,
        output_tokens: event.usage?.completionTokens,
      },
    });

    pendingRequests.delete(event.chatMessageId);
  });

  context.subscriptions.push(chatDisposable, responseDisposable);
}
```

### Example 3: Claude Desktop (Manual Tracing)

```python
from observability.custom_provider_tracer import trace_claude_desktop

# Create Claude Desktop tracer
claude_tracer = trace_claude_desktop()

# Simulate Claude Desktop API call
with claude_tracer.trace_llm_call(
    model="claude-3-5-sonnet",
    operation="chat_completion"
) as span:
    # Your Claude Desktop API integration
    input_text = "Write a Python function to calculate fibonacci"

    # Make API call (replace with actual Claude Desktop API)
    response = your_claude_desktop_api.chat(input_text)

    # Add trace attributes
    claude_tracer.set_input(span, input_text)
    claude_tracer.set_output(span, response["text"])
    claude_tracer.set_tokens(
        span,
        input_tokens=response["usage"]["input_tokens"],
        output_tokens=response["usage"]["output_tokens"]
    )
    claude_tracer.set_parameters(
        span,
        temperature=0.7,
        max_tokens=2048
    )

    # Add custom metadata
    claude_tracer.set_metadata(
        span,
        app_version="1.2.3",
        workspace="/path/to/project"
    )
```

### Example 4: Windsurf IDE (Manual Tracing)

```python
from observability.custom_provider_tracer import trace_windsurf

# Create Windsurf tracer
windsurf_tracer = trace_windsurf()

# Trace code generation
with windsurf_tracer.trace_llm_call(
    model="windsurf-cascade",
    operation="code_generation"
) as span:
    # Windsurf code generation request
    windsurf_tracer.set_input(span, "Create a FastAPI health endpoint")

    # Simulated response
    generated_code = """
@app.get('/health')
async def health():
    return {'status': 'ok', 'timestamp': datetime.utcnow()}
"""

    windsurf_tracer.set_output(span, generated_code)
    windsurf_tracer.set_tokens(span, input_tokens=6, output_tokens=25)
    windsurf_tracer.set_metadata(
        span,
        ide="windsurf",
        file="main.py",
        language="python"
    )
```

### Example 5: Custom In-House LLM

```python
from observability.custom_provider_tracer import CustomProviderTracer

# Create tracer for your internal LLM
custom_tracer = CustomProviderTracer(provider="my-company-llm")

# Trace custom LLM call
with custom_tracer.trace_llm_call(
    model="my-model-v2.1",
    operation="text_generation"
) as span:
    # Your custom LLM API
    input_text = "Summarize this document"
    response = my_internal_llm_api.generate(
        prompt=input_text,
        temperature=0.8,
        max_tokens=500
    )

    # Add trace data
    custom_tracer.set_input(span, input_text)
    custom_tracer.set_output(span, response["generated_text"])
    custom_tracer.set_tokens(
        span,
        input_tokens=response["token_counts"]["input"],
        output_tokens=response["token_counts"]["output"]
    )
    custom_tracer.set_parameters(
        span,
        temperature=0.8,
        max_tokens=500,
        model_version="2.1.0"
    )
```

---

## OpenInference Semantic Attributes

All traces use OpenInference semantic conventions:

| Attribute                    | Type   | Description                             | Required |
| ---------------------------- | ------ | --------------------------------------- | -------- |
| `llm.provider`               | string | Provider name                           | ✅ Yes   |
| `llm.model`                  | string | Model name/version                      | ✅ Yes   |
| `llm.request_type`           | string | Operation type (chat, completion, etc.) | ⚠️ Rec   |
| `llm.token_count.prompt`     | int    | Input tokens                            | ⚠️ Rec   |
| `llm.token_count.completion` | int    | Output tokens                           | ⚠️ Rec   |
| `llm.token_count.total`      | int    | Total tokens                            | ⚠️ Rec   |
| `llm.latency_ms`             | float  | Call latency in milliseconds            | ⚠️ Rec   |
| `llm.temperature`            | float  | Temperature parameter                   | ❌ Opt   |
| `llm.max_tokens`             | int    | Max tokens parameter                    | ❌ Opt   |
| `llm.top_p`                  | float  | Top-p parameter                         | ❌ Opt   |
| `llm.tool_calls`             | string | JSON array of tool calls                | ❌ Opt   |
| `llm.tool_call_count`        | int    | Number of tool calls                    | ❌ Opt   |
| `llm.finish_reason`          | string | Stop reason (stop, length, tool_calls)  | ❌ Opt   |
| `input.value`                | string | User input/prompt                       | ⚠️ Rec   |
| `output.value`               | string | Model output/response                   | ⚠️ Rec   |
| `conversation.id`            | string | Multi-turn conversation ID              | ❌ Opt   |
| `code.file_path`             | string | File being edited (for IDEs)            | ❌ Opt   |
| `code.language`              | string | Programming language                    | ❌ Opt   |
| `code.selection`             | string | Selected code snippet                   | ❌ Opt   |
| `workspace.name`             | string | Workspace/project name                  | ❌ Opt   |
| `metadata.*`                 | any    | Custom metadata                         | ❌ Opt   |

---

## Troubleshooting

### SDK Provider Not Traced

**Problem**: Anthropic/OpenAI calls not showing in Phoenix

**Solutions**:

```python
# 1. Verify Phoenix initialization
from observability.phoenix_config import initialize_phoenix
tracer, config = initialize_phoenix(enable_console=True)  # Enable console debug
print(f"Phoenix UI: {config.phoenix_endpoint}")

# 2. Verify instrumentation
from observability.phoenix_instrumentors import instrument_all_providers
instrumentors = instrument_all_providers()
print(f"Instrumented: {list(instrumentors.keys())}")

# 3. Check instrumentors are active
for name, inst in instrumentors.items():
    print(f"{name}: instrumented={inst.is_instrumented}")

# 4. Verify Phoenix server running
# Check: http://localhost:6006
```

### VSCode Copilot Events Not Received

**Problem**: Copilot telemetry not reaching agent

**Solutions**:

1. Verify VSCode extension is installed and activated
2. Check agent endpoint is accessible: `curl http://localhost:8000/api/telemetry/copilot`
3. Enable extension console logging
4. Check network tab in VSCode DevTools

### Custom Provider Spans Not Exported

**Problem**: Manual traces not appearing in Phoenix

**Solutions**:

```python
# 1. Verify tracer is using Phoenix's tracer provider
from opentelemetry import trace
from observability.phoenix_config import initialize_phoenix

tracer, config = initialize_phoenix()
global_tracer = trace.get_tracer(__name__)

# Use global_tracer or pass tracer explicitly
from observability.custom_provider_tracer import CustomProviderTracer
custom = CustomProviderTracer("my-llm", tracer=global_tracer)

# 2. Check span.end() is called
with custom.trace_llm_call(model="my-model") as span:
    # ... your code ...
    pass  # span.end() called automatically here

# 3. Verify Phoenix server is receiving spans
# Check Phoenix UI: http://localhost:6006
```

---

## Next Steps

1. **View Traces**: Open Phoenix UI at [http://localhost:6006](http://localhost:6006)
2. **Filter by Provider**: Use `llm.provider` attribute in Phoenix UI filters
3. **Analyze Token Usage**: View token costs and trends per provider
4. **Create Dashboards**: Build custom visualizations in Phoenix
5. **Export Data**: Query GreptimeDB for long-term analytics

---

## Related Documentation

- [PHOENIX_OBSERVABILITY.md](./PHOENIX_OBSERVABILITY.md) - Core Phoenix setup
- [PHOENIX_QUICK_REFERENCE.md](./PHOENIX_QUICK_REFERENCE.md) - Command cheat sheet
- [VSCODE_COPILOT_EXTENSION.md](./VSCODE_COPILOT_EXTENSION.md) - Extension development guide
- [agent/observability/custom_provider_tracer.py](../agent/observability/custom_provider_tracer.py) - Custom tracer source
- [agent/observability/vscode_copilot_telemetry.py](../agent/observability/vscode_copilot_telemetry.py) - Copilot adapter source

---

**Questions?** Check the troubleshooting section or open an issue.
