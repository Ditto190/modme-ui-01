# Agent Evaluations

**Purpose**: Evaluate AI agent conversation quality using free, open-source frameworks.

## What's Here

- **run_evaluation_deepeval.py** - DeepEval-based evaluation pipeline (✅ production-ready)
- **requirements.txt** - Python dependencies (DeepEval, OpenAI, etc.)

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set API Key (for Evaluator LLM)

DeepEval uses an LLM (default: GPT-4o-mini) to score conversations:

```bash
export OPENAI_API_KEY="sk-..."
```

Or add to `agent/.env`:

```bash
echo 'OPENAI_API_KEY=sk-your-key-here' >> ../agent/.env
```

### 3. Run Evaluation

```bash
# Evaluate last 100 unevaluated conversations
python run_evaluation_deepeval.py --limit 100

# Evaluate specific provider
python run_evaluation_deepeval.py --limit 50 --provider adk

# Evaluate all conversations (not just unevaluated)
python run_evaluation_deepeval.py --all --limit 200

# Custom threshold and model
python run_evaluation_deepeval.py --threshold 0.8 --model gpt-4o
```

### 4. View Results

```bash
# Query evaluation results from GreptimeDB
curl -X POST http://localhost:4000/v1/sql \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM agent_evaluations ORDER BY timestamp DESC LIMIT 10;"
  }'
```

## Evaluation Metrics

DeepEval provides agent-specific metrics:

| Metric                             | Description                             | Score Range |
| ---------------------------------- | --------------------------------------- | ----------- |
| **TaskCompletionMetric**           | Did the agent complete the user's task? | 0.0 - 1.0   |
| **ConversationCompletenessMetric** | Is the conversation complete?           | 0.0 - 1.0   |
| **ToolUseMetric**                  | Were tools used correctly?              | 0.0 - 1.0   |
| **ArgumentCorrectnessMetric**      | Were tool arguments correct?            | 0.0 - 1.0   |

**Overall Score**: Average of all metrics (pass if `>= threshold`)

## Example Output

```json
{
  "status": "success",
  "total_evaluated": 100,
  "passed": 87,
  "pass_rate": 0.87,
  "average_overall_score": 0.82,
  "framework": "deepeval"
}
```

## Python API Usage

```python
from evaluations.run_evaluation_deepeval import AgentEvaluationPipeline

# Initialize pipeline
pipeline = AgentEvaluationPipeline(
    evaluator_model="gpt-4o-mini",  # or "gpt-4o", "claude-3", etc.
    evaluation_threshold=0.7,
)

# Run evaluation
summary = pipeline.run(
    limit=100,
    provider="adk",
    unevaluated_only=True,
)

print(f"Pass rate: {summary['pass_rate']*100:.1f}%")
print(f"Average score: {summary['average_overall_score']:.2f}")
```

## CLI Options

```bash
python run_evaluation_deepeval.py [OPTIONS]

Options:
  --limit INT         Max conversations to evaluate (default: 100)
  --provider STR      Filter by provider (adk, copilot, claude, etc.)
  --all               Evaluate all conversations (not just unevaluated)
  --threshold FLOAT   Pass threshold 0.0-1.0 (default: 0.7)
  --model STR         Evaluator LLM model (default: gpt-4o-mini)
```

## Database Schema

Evaluation results are stored in `agent_evaluations` table:

```sql
CREATE TABLE agent_evaluations (
    evaluation_id STRING,
    conversation_id STRING,
    message_id STRING,
    timestamp TIMESTAMP TIME INDEX,

    -- Evaluation scores (0.0 - 1.0)
    task_adherence_score DOUBLE,
    intent_resolution_score DOUBLE,
    tool_accuracy_score DOUBLE,
    overall_score DOUBLE,
    pass_threshold BOOLEAN,

    -- LLM reasoning
    task_adherence_reasoning TEXT,
    intent_resolution_reasoning TEXT,
    tool_accuracy_reasoning TEXT,

    -- Metadata
    evaluator_model STRING,
    evaluation_version STRING,

    PRIMARY KEY (evaluation_id)
);
```

## Comparison: Azure AI vs DeepEval

| Feature                  | Azure AI Evaluation  | DeepEval (✅ Used)                      |
| ------------------------ | -------------------- | --------------------------------------- |
| **Cost**                 | $0.10-$1.00 per eval | $0.001 per eval (or $0 with local LLM)  |
| **Open-Source**          | ❌ No                | ✅ Yes                                  |
| **Agent Metrics**        | ⚠️ Generic           | ✅ Agent-specific (ToolUseMetric, etc.) |
| **Cloud Dependency**     | ❌ Azure only        | ✅ Any LLM (OpenAI, Anthropic, local)   |
| **Conversation Support** | ⚠️ Limited           | ✅ ConversationalTestCase format        |
| **Documentation**        | ⭐⭐⭐               | ⭐⭐⭐⭐⭐                              |

**Winner**: DeepEval (perfect fit for agent observability)

## Troubleshooting

### Issue: `ModuleNotFoundError: No module named 'deepeval'`

**Fix**: Install dependencies

```bash
pip install -r requirements.txt
```

### Issue: `openai.AuthenticationError: Incorrect API key provided`

**Fix**: Set `OPENAI_API_KEY` environment variable

```bash
export OPENAI_API_KEY="sk-..."
```

Or add to `agent/.env`:

```bash
echo 'OPENAI_API_KEY=sk-your-key-here' >> ../agent/.env
```

### Issue: `No conversations found for evaluation`

**Fix**: Generate test conversations first

```bash
# Start agent and use Copilot Sidebar to create conversations
npm run dev:agent
```

Or import historical conversations:

```bash
python ../observability/conversation_ingestion.py --file historical.json
```

### Issue: Evaluation too slow

**Options**:

1. Use faster evaluator model: `--model gpt-4o-mini` (default)
2. Reduce batch size: `--limit 10`
3. Use local LLM: `--model ollama/llama3` (requires Ollama setup)

## Advanced Usage

### Custom Evaluation Metrics

Add custom metrics to `run_evaluation_deepeval.py`:

```python
from deepeval.metrics import CustomMetric

class MyCustomMetric(CustomMetric):
    def __init__(self, threshold: float = 0.7):
        self.threshold = threshold

    def evaluate(self, test_case):
        # Custom evaluation logic
        score = calculate_score(test_case)
        return {"score": score, "reason": "..."}

# Add to pipeline
pipeline.metrics.append(MyCustomMetric())
```

### Using Local LLM (Zero Cost)

Replace OpenAI with Ollama (local LLM):

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh

# Pull model
ollama pull llama3

# Use in evaluation
python run_evaluation_deepeval.py --model ollama/llama3
```

### Batch Evaluation Automation

Add to GitHub Actions CI/CD:

```yaml
# .github/workflows/evaluate-agent.yml
name: Evaluate Agent

on:
  push:
    branches: [main]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run evaluation
        run: |
          pip install -r agent/evaluations/requirements.txt
          python agent/evaluations/run_evaluation_deepeval.py --limit 100
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Next Steps

1. ✅ Install dependencies and test evaluation
2. ⏳ Create Grafana dashboard for evaluation metrics
3. ⏳ Set up automated CI/CD evaluation pipeline
4. ⏳ Add custom metrics for domain-specific evaluation
5. ⏳ Integrate with local LLM (Ollama) for zero-cost evaluation

## Related Documentation

- **[OPEN_SOURCE_OBSERVABILITY_SUMMARY.md](../../docs/OPEN_SOURCE_OBSERVABILITY_SUMMARY.md)** - Complete overview
- **[AGENT_OBSERVABILITY_IMPLEMENTATION.md](../../docs/AGENT_OBSERVABILITY_IMPLEMENTATION.md)** - Full implementation guide
- **[DeepEval Docs](https://docs.deepeval.ai/)** - Official DeepEval documentation
