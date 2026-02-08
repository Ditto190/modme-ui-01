```mermaid
graph TB
    subgraph "AI Providers"
        A1[Anthropic/Claude<br/>Python SDK]
        A2[Google Gemini<br/>genai-toolbox + SDK]
        A3[GitHub Copilot<br/>OpenAI SDK]
    end

    subgraph "OpenInference Instrumentation Layer"
        I1[AnthropicInstrumentor<br/>Auto-capture]
        I2[GoogleGenerativeAIInstrumentor<br/>Auto-capture]
        I3[OpenAIInstrumentor<br/>Auto-capture]
    end

    subgraph "OpenTelemetry Layer"
        OT[OpenTelemetry SDK<br/>Tracer Provider]
        OI[OpenInference<br/>Semantic Conventions]
        BP[Batch Span Processor]
        DE[Multi-Exporter]
    end

    subgraph "Storage Backends"
        P[Phoenix Server<br/>:6006]
        G[GreptimeDB<br/>:4000<br/><i>(optional)</i>]

        subgraph "Phoenix Storage"
            PS[(SQLite<br/>or<br/>PostgreSQL)]
        end
    end

    subgraph "Observability UI"
        UI[Phoenix Web UI<br/>localhost:6006]
        D1[Trace Explorer]
        D2[Token Analytics]
        D3[Latency Analysis]
        D4[Error Tracking]
    end

    A1 -->|SDK calls| I1
    A2 -->|SDK calls| I2
    A3 -->|SDK calls| I3

    I1 -->|Traces| OT
    I2 -->|Traces| OT
    I3 -->|Traces| OT

    OT --> OI
    OI --> BP
    BP --> DE

    DE -->|OTLP HTTP| P
    DE -.->|OTLP HTTP<br/><i>dual export</i>| G

    P --> PS
    PS --> UI

    UI --> D1
    UI --> D2
    UI --> D3
    UI --> D4

    classDef provider fill:#e1f5ff
    classDef instrumentation fill:#fff4e1
    classDef otel fill:#e8f5e9
    classDef storage fill:#f3e5f5
    classDef ui fill:#fce4ec

    class A1,A2,A3 provider
    class I1,I2,I3 instrumentation
    class OT,OI,BP,DE otel
    class P,G,PS storage
    class UI,D1,D2,D3,D4 ui
```

## Architecture Description

### Data Flow

1. **AI Providers** make SDK calls (Anthropic, Google, OpenAI)
2. **OpenInference Instrumentors** auto-capture traces with LLM-specific attributes
3. **OpenTelemetry Layer** applies semantic conventions and batches spans
4. **Multi-Exporter** sends traces to:
   - **Phoenix** (primary) for LLM observability
   - **GreptimeDB** (optional) for time-series analytics
5. **Phoenix** stores traces in SQLite/PostgreSQL
6. **Phoenix UI** provides visualization and analytics

### Key Components

| Component         | Purpose             | Port           |
| ----------------- | ------------------- | -------------- |
| Phoenix Server    | OTLP collector + UI | 6006           |
| Phoenix Collector | OTLP endpoint       | 6006/v1/traces |
| GreptimeDB        | Time-series storage | 4000           |
| SQLite/PostgreSQL | Trace database      | N/A            |
| Phoenix UI        | Web interface       | 6006           |

### Semantic Attributes (OpenInference)

Captured automatically:

- `llm.provider` (anthropic, openai, google)
- `llm.model` (claude-3-5-sonnet, gpt-4, etc.)
- `llm.token_count.prompt` (input tokens)
- `llm.token_count.completion` (output tokens)
- `llm.latency_ms` (call duration)
- `llm.temperature`, `llm.max_tokens`

### Storage Options

**Development:**

- SQLite (default)
- File-based, zero-config
- ~10GB typical storage

**Production:**

- PostgreSQL
- Concurrent access
- Scalable to millions of traces

### Dual Export

Traces can be exported to both backends simultaneously:

- **Phoenix**: LLM-specific analysis
- **GreptimeDB**: Long-term time-series analytics

Configure via: `initialize_phoenix(enable_greptime=True)`

## Diagram Legend

- **Blue**: AI Provider layer
- **Yellow**: Instrumentation layer
- **Green**: OpenTelemetry layer
- **Purple**: Storage layer
- **Pink**: UI layer
- **Solid lines**: Primary data flow
- **Dashed lines**: Optional dual export
