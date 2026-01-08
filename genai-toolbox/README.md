# GenAI Toolbox MCP Server with OpenTelemetry

> **MCP server with LLM sampling capabilities and distributed tracing**

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
cd genai-toolbox
npm install
```

### 2. Start the Server

```powershell
# Basic mode (no telemetry)
npm start

# Development mode (auto-reload)
npm run dev

# With OpenTelemetry (requires OTLP collector)
$env:OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
npm start
```

### 3. Configure in MCP Client

Add to your MCP client configuration (e.g., `.vscode/mcp.json` or Claude Desktop):

```json
{
  "mcpServers": {
    "genai-toolbox": {
      "command": "node",
      "args": ["--loader", "tsx", "src/server.ts"],
      "cwd": "C:/path/to/genai-toolbox",
      "env": {
        "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318"
      }
    }
  }
}
```

---

## 🧰 Available Tools

### 1. `summarize`

Summarize any text using LLM sampling.

**Parameters**:

- `text` (string, required): Text to summarize
- `max_length` (number, optional): Maximum summary length in words
- `style` (enum, optional): `"concise"` | `"detailed"` | `"bullet-points"`

**Example**:

```typescript
{
  "text": "Long article text...",
  "max_length": 100,
  "style": "bullet-points"
}
```

---

### 2. `analyze_sentiment`

Analyze sentiment of text with confidence score.

**Parameters**:

- `text` (string, required): Text to analyze

**Returns**: JSON with `sentiment`, `confidence`, `explanation`

**Example**:

```typescript
{
  "text": "I love this product! It's amazing."
}
```

**Response**:

```json
{
  "sentiment": "positive",
  "confidence": 0.95,
  "explanation": "Strong positive language with enthusiasm"
}
```

---

### 3. `extract_keywords`

Extract important keywords from text.

**Parameters**:

- `text` (string, required): Text to extract keywords from
- `max_keywords` (number, optional): Maximum keywords to extract (default: 10)

**Returns**: JSON array of keywords

**Example**:

```typescript
{
  "text": "Machine learning with transformers enables semantic search...",
  "max_keywords": 5
}
```

**Response**:

```json
["machine learning", "transformers", "semantic search", "embeddings", "AI"]
```

---

## 📊 OpenTelemetry Integration

### What is OpenTelemetry?

OpenTelemetry provides observability for your MCP server:

- **Traces**: Track request flow through your system
- **Metrics**: Monitor performance and errors
- **Logs**: Centralized logging (optional)

### Setup OpenTelemetry Collector

**Option 1: Docker (Recommended)**

```powershell
docker run -d --name otel-collector `
  -p 4318:4318 `
  -p 4317:4317 `
  -p 55679:55679 `
  otel/opentelemetry-collector:latest
```

**Option 2: Local Binary**

Download from: https://opentelemetry.io/docs/collector/getting-started/

### Environment Variables

```powershell
# OTLP endpoint (default: http://localhost:4318)
$env:OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"

# Service name (default: genai-toolbox-mcp)
$env:OTEL_SERVICE_NAME="genai-toolbox-mcp"

# Log level (default: info)
$env:OTEL_LOG_LEVEL="debug"
```

### Viewing Traces

**With Jaeger** (common OTLP backend):

```powershell
docker run -d --name jaeger `
  -p 16686:16686 `
  -p 4318:4318 `
  jaegertracing/all-in-one:latest
```

Access UI: http://localhost:16686

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│  MCP Client (Claude, VS Code)      │
└─────────────┬───────────────────────┘
              │ stdio / HTTP
              ▼
┌─────────────────────────────────────┐
│  GenAI Toolbox MCP Server           │
│  ┌─────────────────────────────┐   │
│  │ Tool Handler                │   │
│  │ - summarize                 │   │
│  │ - analyze_sentiment         │   │
│  │ - extract_keywords          │   │
│  └─────────┬───────────────────┘   │
│            │                        │
│            ▼                        │
│  ┌─────────────────────────────┐   │
│  │ LLM Sampling (via MCP)      │   │
│  └─────────┬───────────────────┘   │
│            │                        │
│            ▼                        │
│  ┌─────────────────────────────┐   │
│  │ OpenTelemetry               │   │
│  │ - Trace spans               │   │
│  │ - Metrics collection        │   │
│  └─────────┬───────────────────┘   │
└────────────┼───────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  OTLP Collector (Jaeger, etc.)      │
└─────────────────────────────────────┘
```

---

## 🧪 Testing

### Test Tool Calls

Create a test script:

```typescript
// test/test-tools.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testSummarize() {
  const transport = new StdioClientTransport({
    command: "tsx",
    args: ["src/server.ts"],
  });

  const client = new Client({ name: "test-client", version: "1.0.0" }, {});
  await client.connect(transport);

  const result = await client.callTool({
    name: "summarize",
    arguments: {
      text: "OpenTelemetry is an observability framework for cloud-native software. It provides APIs, libraries, agents, and instrumentation to capture distributed traces and metrics from your application.",
      style: "bullet-points",
    },
  });

  console.log("Summary:", result);
}

testSummarize();
```

Run:

```powershell
tsx test/test-tools.ts
```

---

## 📝 Custom Instrumentation

### Adding Custom Spans

```typescript
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("genai-toolbox-mcp");

async function myCustomTool(input: string) {
  const span = tracer.startSpan("my_custom_tool");

  try {
    span.setAttribute("input.length", input.length);
    span.setAttribute("tool.version", "1.0.0");

    // Your logic here
    const result = processInput(input);

    span.setAttribute("output.length", result.length);
    span.setStatus({ code: SpanStatusCode.OK });

    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
```

### Metric Collection

```typescript
import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("genai-toolbox-mcp");
const toolCallCounter = meter.createCounter("tool_calls_total");
const processingTimeHistogram = meter.createHistogram("processing_time_ms");

// Increment counter
toolCallCounter.add(1, { tool: "summarize" });

// Record duration
const startTime = Date.now();
// ... process request ...
processingTimeHistogram.record(Date.now() - startTime, { tool: "summarize" });
```

---

## 🔧 Configuration

### Server Configuration

Edit `src/server.ts`:

```typescript
const server = new Server(
  {
    name: "genai-toolbox-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      sampling: {}, // Enable LLM sampling
      resources: {}, // Enable resources (optional)
      prompts: {}, // Enable prompts (optional)
    },
  }
);
```

### LLM Sampling Parameters

Adjust in tool handlers:

```typescript
const response = await server.request({
  method: 'sampling/createMessage',
  params: {
    messages: [...],
    maxTokens: 500,        // Adjust token limit
    temperature: 0.3,      // Adjust creativity (0.0-1.0)
    topP: 0.9,            // Optional: nucleus sampling
    stopSequences: [],    // Optional: stop sequences
  },
}, CreateMessageRequestSchema);
```

---

## 🔐 Security

### Best Practices

1. **API Key Management**: Never hardcode API keys

   ```typescript
   const apiKey = process.env.OPENAI_API_KEY;
   if (!apiKey) throw new Error("Missing API key");
   ```

2. **Input Validation**: Always validate inputs with Zod

   ```typescript
   const input = MyInputSchema.parse(args);
   ```

3. **Rate Limiting**: Implement rate limiting for expensive operations

   ```typescript
   const rateLimiter = new RateLimiter({ maxRequests: 100, perMs: 60000 });
   ```

4. **Error Handling**: Never expose internal errors to clients
   ```typescript
   catch (error) {
     console.error('Internal error:', error);
     return { error: 'Processing failed' };
   }
   ```

---

## 📚 Related Documentation

- **OpenTelemetry**: https://opentelemetry.io/docs/
- **Model Context Protocol**: https://modelcontextprotocol.io/
- **MCP SDK**: https://github.com/modelcontextprotocol/typescript-sdk
- **Jaeger**: https://www.jaegertracing.io/

---

## 🐛 Troubleshooting

### Issue: "Cannot find module '@modelcontextprotocol/sdk'"

```powershell
npm install
```

### Issue: "OTLP connection failed"

Check if collector is running:

```powershell
docker ps | grep otel-collector
```

Start collector:

```powershell
docker run -d --name otel-collector -p 4318:4318 otel/opentelemetry-collector
```

### Issue: "LLM sampling not available"

Ensure server capabilities include `sampling: {}` in server initialization.

---

**Status**: ✅ Ready for Testing  
**Created**: January 8, 2026  
**Dependencies**: Node.js 18+, OpenTelemetry 1.9+, MCP SDK 1.0+
