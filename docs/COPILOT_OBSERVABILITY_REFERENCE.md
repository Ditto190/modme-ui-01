# GitHub Copilot Observability - Technical Reference

**Last Updated**: February 8, 2026

Technical documentation for Copilot telemetry API, customization, and roadmap.

## Telemetry Proxy API

### POST /telemetry

Accept telemetry events from TZ extension.

**Request:**

```http
POST /telemetry HTTP/1.1
Host: localhost:8080
Content-Type: application/json

{
  "event_type": "completion" | "chat",
  "prompt": "string",
  "completion": "string",
  "accepted": boolean,
  "language": "string",
  "file_path": "string",
  "model": "string",
  "timestamp": "ISO 8601 datetime",
  "metadata": {
    "line_count": number,
    "char_count": number,
    "latency_ms": number
  }
}
```

**Response:**

```json
{
  "status": "ok",
  "trace_id": "abc123...",
  "message": "Telemetry received"
}
```

**Event types:**

- `completion`: Code completion event (inline suggestions)
- `chat`: Copilot chat interaction

### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "healthy",
  "phoenix_connected": true,
  "uptime_seconds": 3600,
  "events_received": 1250
}
```

### GET /stats

Proxy statistics.

**Response:**

```json
{
  "total_events": 1250,
  "events_by_type": {
    "completion": 1000,
    "chat": 250
  },
  "events_by_language": {
    "python": 500,
    "typescript": 400,
    "javascript": 200,
    "other": 150
  },
  "acceptance_rate": 0.75,
  "last_event_timestamp": "2026-02-08T12:00:00Z",
  "uptime_seconds": 3600
}
```

## OpenTelemetry Mapping

Telemetry events transformed to OTLP spans with OpenInference conventions.

**Span structure:**

```json
{
  "trace_id": "hex string",
  "span_id": "hex string",
  "parent_span_id": null,
  "name": "copilot.completion" | "copilot.chat",
  "kind": "SPAN_KIND_LLM",
  "start_time_unix_nano": 1707396000000000000,
  "end_time_unix_nano": 1707396001000000000,
  "attributes": [
    {"key": "llm.model_name", "value": {"string_value": "gpt-4"}},
    {"key": "llm.provider", "value": {"string_value": "github"}},
    {"key": "llm.input_messages", "value": {"string_value": "[{\"role\":\"user\",\"content\":\"...\"}]"}},
    {"key": "llm.output_messages", "value": {"string_value": "[{\"role\":\"assistant\",\"content\":\"...\"}]"}},
    {"key": "copilot.event_type", "value": {"string_value": "completion"}},
    {"key": "copilot.language", "value": {"string_value": "python"}},
    {"key": "copilot.accepted", "value": {"bool_value": true}},
    {"key": "copilot.file_path", "value": {"string_value": "/path/to/file.py"}}
  ],
  "status": {"code": "STATUS_CODE_OK"}
}
```

**OpenInference attributes used:**

- `llm.model_name` - Copilot model (from extension event)
- `llm.provider` - Always "github"
- `llm.input_messages` - JSON array with user prompt
- `llm.output_messages` - JSON array with Copilot response
- `llm.token_count_total` - Estimated from char count

**Custom attributes:**

- `copilot.event_type` - "completion" or "chat"
- `copilot.language` - Programming language detected
- `copilot.accepted` - Whether completion was accepted
- `copilot.file_path` - File being edited
- `copilot.line_number` - Cursor position
- `copilot.char_count` - Completion length
- `copilot.latency_ms` - Time from request to completion

## Extension Customization

TZ extension can be customized via VSCode settings.

### Settings Reference

```json
{
  // Telemetry server
  "tz.telemetry.endpoint": "http://localhost:8080/telemetry",
  "tz.telemetry.enabled": true,

  // Event filtering
  "tz.telemetry.includeCompletions": true,
  "tz.telemetry.includeChat": true,
  "tz.telemetry.minimumCompletionLength": 10,

  // Privacy
  "tz.telemetry.excludePatterns": [
    "**/node_modules/**",
    "**/.env*",
    "**/secrets/**"
  ],

  // Performance
  "tz.telemetry.batchSize": 10,
  "tz.telemetry.flushInterval": 5000,

  // Debug
  "tz.telemetry.logLevel": "info",
  "tz.telemetry.showStatusBar": true
}
```

### Filtering Events

**By language:**

```json
{
  "tz.telemetry.languages": ["python", "typescript", "javascript"]
}
```

**By file pattern:**

```json
{
  "tz.telemetry.includePatterns": [
    "src/**/*.ts",
    "src/**/*.tsx"
  ]
}
```

**By completion length:**

```json
{
  "tz.telemetry.minimumCompletionLength": 50
}
```

### Custom Metadata

Add custom metadata to all events:

```json
{
  "tz.telemetry.metadata": {
    "team": "platform-engineering",
    "project": "modme-ui-01",
    "environment": "development"
  }
}
```

## Dataset Export Formats

### JSONL (Fine-tuning)

```jsonl
{"messages": [{"role": "system", "content": "You are GitHub Copilot..."}, {"role": "user", "content": "Write a function to..."}, {"role": "assistant", "content": "def func():..."}], "metadata": {"language": "python", "accepted": true}}
{"messages": [...], "metadata": {...}}
```

**OpenAI fine-tuning compatible:**

```bash
openai api fine_tuning.jobs.create \
  -t copilot_dataset.jsonl \
  -m gpt-3.5-turbo
```

### CSV (Analysis)

```csv
timestamp,event_type,language,prompt,completion,accepted,model,file_path
2026-02-08T12:00:00Z,completion,python,"def hello","    return 'Hello'",true,gpt-4,/src/main.py
2026-02-08T12:01:00Z,chat,typescript,"create button","<button>Click</button>",true,gpt-4,/src/App.tsx
```

### Parquet (Large datasets)

Binary columnar format with compression:

```python
import pandas as pd
df = pd.read_parquet("copilot_dataset.parquet")

# Efficient filtering
accepted_completions = df[df['accepted'] == True]
python_code = df[df['language'] == 'python']
```

**Compression:** ~80% smaller than JSONL

## Analysis Queries

### Phoenix UI Filters

```
# All accepted Python completions
copilot.language = "python" AND copilot.accepted = true

# Chat interactions only
copilot.event_type = "chat"

# Long completions (> 100 chars)
copilot.char_count > 100

# Recent errors
status.code = STATUS_CODE_ERROR AND timestamp > now() - 1h
```

### SQL Queries (Phoenix DB)

```sql
-- Acceptance rate by language
SELECT
  json_extract(attributes, '$.copilot.language') as language,
  AVG(CASE WHEN json_extract(attributes, '$.copilot.accepted') = 'true' THEN 1.0 ELSE 0.0 END) as acceptance_rate,
  COUNT(*) as total_events
FROM spans
WHERE name LIKE 'copilot.%'
GROUP BY language
ORDER BY total_events DESC;

-- Most common file types
SELECT
  SUBSTR(json_extract(attributes, '$.copilot.file_path'), -10) as extension,
  COUNT(*) as count
FROM spans
WHERE name = 'copilot.completion'
GROUP BY extension
ORDER BY count DESC
LIMIT 10;

-- Average latency by hour
SELECT
  strftime('%Y-%m-%d %H:00', start_time) as hour,
  AVG(json_extract(attributes, '$.copilot.latency_ms')) as avg_latency_ms
FROM spans
WHERE name LIKE 'copilot.%'
GROUP BY hour
ORDER BY hour DESC;
```

### Python Analysis

```python
import pandas as pd

# Load dataset
df = pd.read_json("copilot_dataset.jsonl", lines=True)

# Acceptance rate
print(f"Overall acceptance: {df['metadata'].apply(lambda x: x['accepted']).mean():.2%}")

# Language distribution
print(df['metadata'].apply(lambda x: x['language']).value_counts())

# Average completion length
df['completion_length'] = df['messages'].apply(lambda x: len(x[2]['content']))
print(f"Avg completion: {df['completion_length'].mean():.0f} chars")

# Most common prompts
prompts = df['messages'].apply(lambda x: x[1]['content'])
print(prompts.value_counts().head(10))
```

## Roadmap

### Phase 1: Foundation ✅ Complete

- [x] TZ extension for telemetry capture
- [x] Telemetry proxy with OpenInference mapping
- [x] Phoenix integration
- [x] Dataset export (JSONL, CSV, Parquet)
- [x] Automation scripts and npm tasks

### Phase 2: Enhancement 🚧 In Progress

- [ ] Real-time dashboard for acceptance rates
- [ ] Prompt templates library
- [ ] A/B testing for different prompts
- [ ] Code quality metrics on completions
- [ ] Semantic search across captured completions

### Phase 3: Advanced Analytics 📅 Planned

- [ ] Fine-tuning pipeline automation
- [ ] Completion quality scoring (AST-based)
- [ ] User behavior analytics
- [ ] Cost tracking per user/project
- [ ] Anomaly detection for unusual patterns

### Phase 4: Integration 📅 Future

- [ ] Integration with CI/CD for code review
- [ ] Link completions to git commits
- [ ] Feedback loop: accepted completions → training data
- [ ] Multi-model comparison (Copilot vs other tools)
- [ ] Enterprise compliance features

## Performance Benchmarks

**Telemetry proxy overhead:**

- Event processing: < 5ms per event
- Memory usage: ~50MB baseline, +10MB per 10k events
- CPU usage: < 2% on modern processors
- Network: ~1KB per completion, ~5KB per chat

**Dataset export:**

- JSONL: 500 events/sec
- CSV: 1000 events/sec
- Parquet: 800 events/sec (with compression)

**Phoenix storage:**

- SQLite: Up to 1M traces
- PostgreSQL: Unlimited (tested to 100M+ traces)
- Query latency: < 100ms for most filters

## Security Considerations

**Data privacy:**

- Code snippets captured may contain sensitive information
- Use `excludePatterns` to filter secrets, credentials, PII
- Export datasets should be stored securely
- Review company policies before exporting chat logs

**Network security:**

- Telemetry proxy runs on localhost by default
- Use HTTPS if exposing proxy externally
- Phoenix UI has no authentication by default - add reverse proxy with auth

**Compliance:**

- GDPR: Ensure user consent before capturing personal code
- SOC 2: Implement audit logs for dataset exports
- HIPAA: Do not capture medical code without proper controls

## Resources

- **User Guide**: [COPILOT_OBSERVABILITY.md](COPILOT_OBSERVABILITY.md)
- **Phoenix Setup**: [PHOENIX_SETUP.md](PHOENIX_SETUP.md)
- **Universal Chat Pipeline**: [N8N_PHOENIX_QUICK_REF.md](N8N_PHOENIX_QUICK_REF.md)
- **OpenInference Spec**: https://github.com/Arize-ai/openinference
- **TZ Extension**: [GitHub - tz-copilot-collector](https://github.com/user/tz-copilot-collector)
