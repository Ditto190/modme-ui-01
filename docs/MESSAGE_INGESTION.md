# Message Ingestion System

A robust TypeScript + Python system for ingesting and normalizing AI agent chat responses from multiple providers.

## Features

- ✅ **Multi-Provider Support**: Claude, OpenAI, CopilotKit, n8n, and custom formats
- ✅ **Schema Registry**: Fast path validation with pre-defined schemas
- ✅ **AI-Powered Discovery**: Automatic schema inference for unknown formats (TypeScript only)
- ✅ **Type Safety**: Zod validation in TypeScript, Pydantic-style types in Python
- ✅ **Flexible Validation**: Strict or loose modes
- ✅ **Batch Processing**: Efficient handling of message arrays
- ✅ **Tool Call Normalization**: Unified format for tool/function calls across providers

## Architecture

```
┌─────────────────┐
│ Raw AI Messages │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Detect  │ ◄── Claude, OpenAI, CopilotKit, n8n
    │Provider │
    └────┬────┘
         │
    ┌────▼────────┐
    │   Schema    │ ◄── Pre-defined schemas (fast path)
    │  Registry   │
    └────┬────────┘
         │
    ┌────▼─────────┐
    │   AI-Powered │ ◄── Discovery fallback (TypeScript only)
    │   Discovery  │     Uses Claude Sonnet 4.5
    └────┬─────────┘
         │
    ┌────▼────────┐
    │   Unified   │ ◄── ParsedMessage format
    │   Output    │
    └─────────────┘
```

## Usage

### TypeScript (Frontend)

```typescript
import { ingestMessage, ingestMessageBatch } from "@/lib/message-ingestion";

// Single message
const result = await ingestMessage(rawClaudeMessage);
if (result.success) {
  console.log(result.data.provider); // "claude"
  console.log(result.data.content);
  console.log(result.data.toolCalls);
}

// Batch processing
const batchResult = await ingestMessageBatch([msg1, msg2, msg3]);
console.log(batchResult.stats); // { total, succeeded, failed }
```

### Python (Agent)

```python
from agent.message_ingestion import ingest_message, ingest_message_batch

# Single message
result = ingest_message(raw_claude_message)
if result.success:
    print(result.data.provider)  # AIProvider.CLAUDE
    print(result.data.content)
    print(result.data.tool_calls)

# Batch processing
batch_result = ingest_message_batch([msg1, msg2, msg3])
print(batch_result.stats)  # {"total": 3, "succeeded": 3, "failed": 0}
```

## Supported Providers

### Claude (Anthropic)

```json
{
  "role": "assistant",
  "content": [
    { "type": "text", "text": "Let me help with that." },
    {
      "type": "tool_use",
      "id": "toolu_123",
      "name": "search_db",
      "input": { "query": "data" }
    }
  ],
  "model": "claude-sonnet-4-20250514",
  "usage": { "input_tokens": 100, "output_tokens": 50 }
}
```

### OpenAI

```json
{
  "role": "assistant",
  "content": "Let me search for that.",
  "tool_calls": [
    {
      "id": "call_123",
      "type": "function",
      "function": {
        "name": "search_db",
        "arguments": "{\"query\": \"data\"}"
      }
    }
  ]
}
```

### CopilotKit

```json
{
  "id": "msg_123",
  "role": "assistant",
  "actionExecution": {
    "id": "action_456",
    "name": "search_docs",
    "arguments": { "query": "API reference" },
    "status": "executing"
  }
}
```

### n8n

```json
{
  "executionId": "exec_123",
  "workflowId": "workflow_456",
  "data": { "result": "success" }
}
```

## Configuration

### TypeScript

```typescript
const config: IngestionConfig = {
  schemaRegistry: createSchemaRegistry(),
  discoveryFallback: true, // Enable AI-powered discovery
  cacheStrategy: "memory", // or 'redis', 'none'
  validationMode: "strict", // or 'loose'
  batchSize: 100,
  discoveryTimeout: 30000, // 30 seconds
};

const result = await ingestMessage(rawMessage, config);
```

### Python

```python
from agent.message_ingestion import IngestionConfig, ValidationMode

config = IngestionConfig(
    discovery_fallback=True,
    cache_strategy="memory",  # or 'redis', 'none'
    validation_mode=ValidationMode.STRICT,  # or ValidationMode.LOOSE
    batch_size=100,
)

result = ingest_message(raw_message, config)
```

## Validation Modes

### Strict Mode

-Rejects malformed or unknown messages

- Best for production where data quality is critical
- Throws errors on validation failures

### Loose Mode

- Best-effort parsing for all messages
- Graceful degradation for unknown formats
- Always returns a result (may use `unknown` provider)

## Tool Call Normalization

All providers' tool calls are normalized to a unified format:

```typescript
interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface ToolResult {
  toolCallId: string;
  result: unknown;
  isError?: boolean;
}
```

## Error Handling

```typescript
const result = await ingestMessage(rawMessage);

if (!result.success) {
  console.error(`Ingestion failed: ${result.error.message}`);
  console.error(`Provider: ${result.error.provider}`);
  console.error(`Validation errors:`, result.error.validationErrors);
}
```

## Testing

### TypeScript

```bash
# Tests not yet implemented for TypeScript
npm test
```

### Python

```bash
# Run all tests
pytest tests/message_ingestion/

# Run with coverage
pytest tests/message_ingestion/ --cov=agent.message_ingestion

# Run specific test
pytest tests/message_ingestion/test_ingestion.py::test_ingest_claude_message
```

## Integration with GenUI Agent

Add this tool to `agent/main.py`:

```python
@agent.tool(description="Ingest AI agent chat responses from multiple providers")
def ingest_agent_responses(
    tool_context: ToolContext,
    messages: List[Dict[str, Any]],
    validation_mode: str = "strict",
) -> Dict[str, Any]:
    """
    Ingest and normalize AI agent chat responses.

    Args:
        messages: List of raw message objects from AI providers
        validation_mode: "strict" or "loose" validation

    Returns:
        {"status": "success"|"error", "data": ParsedMessage[], ...}
    """
    from agent.message_ingestion import (
        ingest_message_batch,
        IngestionConfig,
        ValidationMode,
    )

    # Configure ingestion
    config = IngestionConfig(
        validation_mode=(
            ValidationMode.STRICT
            if validation_mode == "strict"
            else ValidationMode.LOOSE
        ),
    )

    # Ingest messages
    result = ingest_message_batch(messages, config)

    # Store in agent state
    parsed_messages = [
        {
            "id": msg.id,
            "provider": msg.provider.value,
            "role": msg.role,
            "content": msg.content,
            "toolCalls": (
                [
                    {"id": tc.id, "name": tc.name, "arguments": tc.arguments}
                    for tc in msg.tool_calls
                ]
                if msg.tool_calls
                else None
            ),
            "metadata": {
                "model": msg.metadata.model,
                "tokens": msg.metadata.tokens,
                **(msg.metadata.extra or {}),
            },
        }
        for msg in result.successful
    ]

    tool_context.state["ingested_messages"] = parsed_messages

    return {
        "status": "success",
        "message": f"Ingested {len(parsed_messages)} messages",
        "stats": result.stats,
        "messages": parsed_messages,
        "failed": result.failed if result.failed else None,
    }
```

## Examples

See `agent/message_ingestion/examples.py` for comprehensive usage examples:

```bash
cd d:\Github_Projects\Modme_2026\modme-ui-01-test-worktree
python -m agent.message_ingestion.examples
```

## File Structure

```
src/lib/message-ingestion/       # TypeScript implementation
├── types.ts                      # Type definitions + Zod schemas
├── registry.ts                   # Schema registry + parsers
├── ingestion.ts                  # Main ingestion logic
└── index.ts                      # Public API

agent/message_ingestion/          # Python implementation
├── __init__.py                   # Public API
├── types.py                      # Type definitions
├── detection.py                  # Provider detection
├── parsers.py                    # Message parsers
├── ingestion.py                  # Main ingestion logic
└── examples.py                   # Usage examples

tests/message_ingestion/          # Python tests
└── test_ingestion.py             # Unit tests (pytest)
```

## Performance Considerations

- **Fast Path**: Registry lookups are O(1) with pre-compiled Zod schemas
- **Discovery**: AI-powered inference is slower (~1-3s) but cached
- **Batch Processing**: Processes messages in configurable chunks (default: 100)
- **Caching**: Discovery results cached in-memory or Redis

## Roadmap

- [ ] TypeScript unit tests
- [ ] Redis caching implementation
- [ ] Streaming message support
- [ ] Additional providers (Anthropic streaming, Gemini, etc.)
- [ ] Schema versioning system
- [ ] Performance benchmarks

## License

Part of the ModMe GenUI Workbench project.
