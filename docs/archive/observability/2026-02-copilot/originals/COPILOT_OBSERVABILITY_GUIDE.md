# GitHub Copilot Observability with Phoenix

> **Complete guide to capturing, analyzing, and exporting GitHub Copilot interactions for research and fine-tuning**

## Overview

This system captures GitHub Copilot chat and completion interactions in VSCode and sends them to Phoenix for observability and analysis. The data can be exported for prompt engineering analysis, effectiveness evaluation, and fine-tuning datasets.

### Architecture

```
┌─────────────────────────┐
│ VSCode + GitHub Copilot│
│                        │
│ 1. TZ Extension        │
│    captures telemetry  │
└───────────┬─────────────┘
            │ HTTP JSON
            ▼
┌─────────────────────────┐
│ Telemetry Proxy Server │
│ (FastAPI + OpenInference│
│                        │
│ 2. Transforms to OTLP  │
└───────────┬─────────────┘
            │ OTLP/HTTP
            ▼
┌─────────────────────────┐
│ Phoenix Backend        │
│                        │
│ 3. Stores & displays   │
│    traces in UI        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Dataset Export         │
│                        │
│ 4. JSONL, CSV, Parquet │
└─────────────────────────┘
```

## Prerequisites

### Required

- ✅ **TZ Copilot Telemetry Collector Extension** (already installed)
- ✅ **Phoenix** (Docker or local)
- ✅ **Python 3.12+** with virtual environment
- ✅ **Git** (for version control)

### System Requirements

- **Windows 10/11** or **macOS/Linux**
- **4GB RAM** minimum (8GB recommended)
- **Docker Desktop** (for Phoenix container)

## Quick Start

### 1. Install Dependencies

```bash
# Navigate to agent directory
cd agent

# Install Phoenix + telemetry proxy dependencies
pip install -r requirements-phoenix.txt

# Or with uv (recommended)
uv sync
```

### 2. Start the Observability Stack

**Windows (PowerShell):**

```powershell
.\scripts\start-copilot-observability.ps1
```

**macOS/Linux (Bash):**

```bash
./scripts/start-copilot-observability.sh
chmod +x ./scripts/start-copilot-observability.sh  # Make executable first time
```

This script will:

1. ✅ Start Phoenix Docker container (if not running)
2. ✅ Check Python environment and dependencies
3. ✅ Start the telemetry proxy server on port 8080

### 3. Verify Setup

**Check Phoenix UI:**

- Open <http://localhost:6006> in your browser
- You should see the Phoenix dashboard

**Check Proxy Health:**

- Open <http://localhost:8080/health>
- Should return: `{"status": "healthy", "openinference_available": true}`

**Test VSCode Extension:**

- Open Copilot Chat in VSCode
- Ask a question (e.g., "How do I use async/await in Python?")
- Check Phoenix UI - you should see a new trace appear

### 4. Configure VSCode Extension

The TZ extension is pre-configured in `.vscode/settings.json`:

```json
{
  "tzCopilotTelemetry.enabled": true,
  "tzCopilotTelemetry.exportEndpoint": "http://localhost:8080/telemetry",
  "tzCopilotTelemetry.captureChat": true,
  "tzCopilotTelemetry.captureCompletions": true,
  "tzCopilotTelemetry.includePrompts": true,
  "tzCopilotTelemetry.includeResponses": true
}
```

## Usage Workflows

### Capturing Copilot Interactions

**What Gets Captured:**

- ✅ Chat messages (user prompts + assistant responses)
- ✅ Code completions (inline suggestions)
- ✅ Agent roles selected
- ✅ Instructions provided
- ✅ Tools used
- ✅ Token counts (input/output)
- ✅ Latency metrics
- ✅ User feedback (thumbs up/down)

**Automatic Capture:**

- All Copilot interactions are automatically sent to the proxy
- No manual intervention needed
- Works with all Copilot features (chat, inline completions, etc.)

### Viewing Traces in Phoenix

1. Open Phoenix UI: <http://localhost:6006>
2. Select project: **copilot-research**
3. View traces in the timeline
4. Click on any trace to see details:
   - User prompt
   - Assistant response
   - Tokens used
   - Latency
   - Tools invoked
   - Context (file, language, workspace)

### Exporting Datasets for Fine-Tuning

#### Export to JSONL (Fine-Tuning Format)

```bash
# Export last 7 days in OpenAI/Anthropic fine-tuning format
python -m agent.observability.export_copilot_dataset \
    --output-dir ./datasets \
    --format jsonl \
    --finetune-format \
    --days-back 7
```

**Output Format:**

```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful coding assistant..." },
    { "role": "user", "content": "How do I use async/await in Python?" },
    { "role": "assistant", "content": "In Python, async/await is used..." }
  ],
  "metadata": {
    "trace_id": "abc123",
    "agent_role": "workspace",
    "tools_used": ["search", "codebase"],
    "feedback": "positive",
    "tokens": { "input": 50, "output": 100 }
  }
}
```

#### Export to CSV (Analysis)

```bash
# Export to CSV for spreadsheet analysis
python -m agent.observability.export_copilot_dataset \
    --output-dir ./datasets \
    --format csv \
    --start-date 2026-02-01 \
    --end-date 2026-02-08
```

#### Export to Parquet (Data Science)

```bash
# Export to Parquet for pandas/data science workflows
python -m agent.observability.export_copilot_dataset \
    --output-dir ./datasets \
    --format parquet \
    --days-back 30
```

#### Export All Formats

```bash
# Export to all formats at once
python -m agent.observability.export_copilot_dataset \
    --output-dir ./datasets \
    --format all \
    --finetune-format
```

### Analysis Examples

#### 1. Prompt Engineering Effectiveness

**Goal:** Which prompts lead to better responses?

```python
import pandas as pd

# Load dataset
df = pd.read_parquet("datasets/copilot_telemetry_20260208_120000.parquet")

# Filter positive feedback
good_prompts = df[df['feedback'] == 'positive']

# Analyze prompt patterns
print(good_prompts['user_prompt'].value_counts())

# Average token efficiency
efficiency = good_prompts.groupby('agent_role').agg({
    'output_tokens': 'mean',
    'latency_ms': 'mean'
})
print(efficiency)
```

#### 2. Tool Usage Analysis

**Goal:** Which tools are most effective?

```python
# Count tool usage
tool_usage = df['tools_used'].explode().value_counts()
print("Most used tools:", tool_usage.head())

# Tool effectiveness (by feedback)
tools_with_feedback = df[df['tools_used'].str.len() > 0]
effectiveness = tools_with_feedback.groupby('feedback')['tools_used'].apply(
    lambda x: x.explode().value_counts()
)
print(effectiveness)
```

#### 3. Agent Role Comparison

**Goal:** Which agent roles perform best?

```python
role_performance = df.groupby('agent_role').agg({
    'feedback': lambda x: (x == 'positive').mean(),  # Success rate
    'latency_ms': 'mean',
    'output_tokens': 'mean'
})
print(role_performance.sort_values('feedback', ascending=False))
```

## Configuration

### Environment Variables

Create `.env` file in the agent directory:

```bash
# Phoenix Configuration
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006/v1/traces
PHOENIX_PROJECT_NAME=copilot-research

# Proxy Configuration
PROXY_PORT=8080
PROXY_HOST=0.0.0.0
LOG_LEVEL=INFO

# Phoenix Endpoint (for data export)
PHOENIX_ENDPOINT=http://localhost:6006
```

### Advanced Options

#### Change Port

```bash
# Use different port
PROXY_PORT=9090 python -m agent.observability.copilot_phoenix_proxy
```

#### Enable Debug Logging

```bash
LOG_LEVEL=DEBUG python -m agent.observability.copilot_phoenix_proxy
```

#### Use PostgreSQL for Phoenix (Production)

Edit `docker-compose.phoenix.yml`:

```yaml
services:
  phoenix:
    environment:
      - PHOENIX_SQL_DATABASE_URL=postgresql://user:password@postgres:5432/phoenix

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=phoenix
      - POSTGRES_PASSWORD=phoenix_password
      - POSTGRES_DB=phoenix
```

## Troubleshooting

### Extension Not Sending Telemetry

**Check:**

1. Extension is enabled: `tzCopilotTelemetry.enabled: true`
2. Endpoint is correct: `http://localhost:8080/telemetry`
3. Proxy is running: `curl http://localhost:8080/health`

**Fix:**

- Reload VSCode window (Ctrl+Shift+P → "Reload Window")
- Check VSCode Developer Console (Help → Toggle Developer Tools)

### Phoenix Not Receiving Traces

**Check:**

1. Phoenix is running: `docker ps | grep phoenix`
2. Proxy can reach Phoenix: `curl http://localhost:6006`
3. Check proxy logs for errors

**Fix:**

```bash
# Restart Phoenix
docker-compose -f docker-compose.phoenix.yml restart

# Check Phoenix logs
docker-compose -f docker-compose.phoenix.yml logs -f phoenix
```

### Proxy Server Won't Start

**Error:** `Address already in use`

**Fix:**

```bash
# Find process using port 8080
netstat -ano | findstr :8080  # Windows
lsof -i :8080                  # macOS/Linux

# Kill the process or use different port
PROXY_PORT=9090 python -m agent.observability.copilot_phoenix_proxy
```

**Error:** `ModuleNotFoundError: No module named 'fastapi'`

**Fix:**

```bash
cd agent
pip install -r requirements-phoenix.txt
```

### No Data in Exports

**Check:**

1. Traces exist in Phoenix UI
2. Date range is correct
3. Project name matches: `copilot-research`

**Fix:**

```bash
# Check traces in Phoenix
curl http://localhost:6006/v1/traces

# Use wider date range
python -m agent.observability.export_copilot_dataset --days-back 30
```

## Best Practices

### Data Collection

1. **Run proxy continuously** during development sessions
2. **Use meaningful agent roles** when prompting Copilot
3. **Provide feedback** (thumbs up/down) after interactions
4. **Document your prompts** with clear intent

### Privacy & Ethics

1. **Hash user identifiers** (proxy does this automatically)
2. **Review datasets** before sharing/publishing
3. **Respect confidential** code - don't export sensitive traces
4. **Follow IRB/ethics** guidelines for research use

### Performance

1. **Export regularly** - don't let Phoenix DB grow too large
2. **Use Parquet** for large datasets (better compression)
3. **Filter by date range** when exporting
4. **Clean up old traces** periodically

## Integration with Research Workflows

### Using with Jupyter Notebooks

```python
# Load dataset in Jupyter
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_parquet("datasets/copilot_telemetry.parquet")

# Visualize token usage over time
df.groupby(df['timestamp'].dt.date)['total_tokens'].sum().plot()
plt.title("Token Usage Over Time")
plt.show()
```

### Using with HuggingFace Datasets

```python
from datasets import Dataset

# Convert to HuggingFace dataset
df = pd.read_parquet("datasets/copilot_telemetry.parquet")
dataset = Dataset.from_pandas(df)

# Push to Hub (for sharing)
dataset.push_to_hub("your-username/copilot-research")
```

### Fine-Tuning Example (OpenAI)

```python
import openai

# Upload fine-tuning dataset
with open("datasets/copilot_telemetry_finetune.jsonl", "rb") as f:
    openai.File.create(file=f, purpose="fine-tune")

# Start fine-tuning job
openai.FineTuningJob.create(
    training_file="file-abc123",
    model="gpt-3.5-turbo"
)
```

## Next Steps

1. **Collect baseline data**: Run for 1-2 weeks to gather sufficient data
2. **Analyze patterns**: Use exports to identify effective prompts
3. **Iterate on prompts**: Refine instructions based on analysis
4. **Generate fine-tuning datasets**: Export high-quality interactions
5. **Monitor effectiveness**: Track improvements over time

## Additional Resources

- **Phoenix Documentation**: <https://docs.arize.com/phoenix>
- **OpenInference Spec**: <https://github.com/Arize-ai/openinference>
- **TZ Extension Docs**: (Extension marketplace page)
- **Fine-Tuning Guides**:
  - OpenAI: <https://platform.openai.com/docs/guides/fine-tuning>
  - Anthropic: <https://docs.anthropic.com/claude/docs/fine-tuning>
  - Google: <https://ai.google.dev/docs/model_tuning>

## Support

- **Issues**: Create an issue in the repository
- **Phoenix Support**: [Phoenix Discord](https://discord.gg/arize)
- **Extension Issues**: Check TZ extension marketplace page

---

**Happy researching!** 🚀
