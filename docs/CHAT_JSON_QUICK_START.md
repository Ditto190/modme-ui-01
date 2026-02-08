# Chat.json Integration - Quick Start Guide

**TL;DR**: Your chat.json parser reveals 23 missing fields in real-time telemetry. Here's how to close the gap.

---

## 🎯 What You Built

`copilot_chat_parser.py` extracts **40 columns** from VS Code chat exports:

- **1 input** (user_message)
- **2 outputs** (assistant_response, thinking)
- **37 metadata** fields

**Key Discovery**: Real-time telemetry (TZ Extension → proxy) only captures **17 of 40 fields** (42.5%).

---

## 📊 Critical Missing Fields

### 1. Token Breakdown (5 fields)

**What You Found**: System instructions consume **51%** of prompt tokens, tool definitions **43%**, leaving only **6%** for user content!

```python
# Add to CopilotTelemetryEvent
token_pct_system_instructions: Optional[int] = None
token_pct_tool_definitions: Optional[int] = None
token_pct_messages: Optional[int] = None
token_pct_files: Optional[int] = None
token_pct_tool_results: Optional[int] = None
```

**Why it matters**: Prompt optimization, context window analysis, fine-tuning distribution.

### 2. MCP Lifecycle (2 fields)

**What You Found**: MCP servers start dynamically, tools registered per session.

```python
# Add to CopilotTelemetryEvent
mcp_servers_started: List[str] = Field(default_factory=list)
mcp_tools_available: List[str] = Field(default_factory=list)  # "server/tool" format
```

**Why it matters**: Latency attribution, tool availability tracking, MCP integration metrics.

### 3. Tool Execution Detail (2 fields)

**What You Found**: Tools execute in **rounds** (multi-turn loops), not single calls.

```python
# Add to CopilotTelemetryEvent
tool_call_rounds_count: int = 0
tool_calls_detail: str = "[]"  # JSON: [{"round": 0, "name": "readFile", "arguments_preview": "..."}]
```

**Why it matters**: Agentic loop analysis, efficiency metrics, ReAct pattern validation.

### 4. Response Composition (5 fields)

**What You Found**: Responses have **9 kinds** (thinking, toolInvocation, textEdit, codeblockUri, etc.).

```python
# Add to CopilotTelemetryEvent
response_kind_counts: str = "{}"  # JSON: {"thinking": 2, "codeblockUri": 3}
code_blocks_count: int = 0
code_languages: List[str] = Field(default_factory=list)
files_edited: List[str] = Field(default_factory=list)
inline_references: List[str] = Field(default_factory=list)
```

**Why it matters**: Multi-modal eval, code generation metrics, edit pattern analysis.

### 5. Thinking/Chain-of-Thought (1 field)

**What You Found**: VS Code exposes internal reasoning as `thinking` blocks.

```python
# Add to CopilotTelemetryEvent
thinking: Optional[str] = None  # Chain-of-thought reasoning
```

**Why it matters**: Fine-tuning supervision, reasoning transparency, eval intermediate steps.

### 6. Context Attachments (3 fields)

**What You Found**: Workspace repos, prompt files, and attached files tracked separately.

```python
# Add to CopilotTelemetryEvent
workspace_repos: List[str] = Field(default_factory=list)
prompt_files: List[str] = Field(default_factory=list)
attached_files: List[str] = Field(default_factory=list)
```

**Why it matters**: Context analysis, RAG effectiveness, file dependency tracking.

### 7. Conversation Flow (5 fields)

**What You Found**: Turn index, confirmations, and max tool call breaches tracked.

```python
# Add to CopilotTelemetryEvent
turn_index: Optional[int] = None
had_confirmation_prompt: bool = False
max_tool_calls_exceeded: bool = False
request_message_length: int = 0
response_text_length: int = 0
```

**Why it matters**: Conversation coherence, error analysis, completion metrics.

---

## ⚡ Quick Implementation Steps

### Step 1: Enhance Telemetry Model (30 min)

```python
# agent/observability/copilot_phoenix_proxy.py

# Add new fields to CopilotTelemetryEvent
class CopilotTelemetryEvent(BaseModel):
    # ... existing fields ...

    # NEW: Token breakdown
    token_breakdown: Optional[Dict[str, int]] = None  # {system: 51, tools: 43, messages: 6}

    # NEW: MCP tracking
    mcp_servers_started: List[str] = Field(default_factory=list)
    mcp_tools_available: List[str] = Field(default_factory=list)

    # NEW: Tool detail
    tool_call_rounds_count: int = 0
    tool_calls_detail: str = "[]"

    # NEW: Response composition
    response_kind_counts: str = "{}"
    code_blocks_count: int = 0
    code_languages: List[str] = Field(default_factory=list)
    files_edited: List[str] = Field(default_factory=list)

    # NEW: Thinking/CoT
    thinking: Optional[str] = None

    # NEW: Context
    workspace_repos: List[str] = Field(default_factory=list)
    prompt_files: List[str] = Field(default_factory=list)
    attached_files: List[str] = Field(default_factory=list)

    # NEW: Flow
    turn_index: Optional[int] = None
    had_confirmation_prompt: bool = False
    max_tool_calls_exceeded: bool = False
```

### Step 2: Map to OpenInference Attributes (30 min)

```python
# In set_openinference_attributes() function

# Token breakdown
if event.token_breakdown:
    span.set_attribute("llm.token_pct.system", event.token_breakdown.get("system"))
    span.set_attribute("llm.token_pct.tools", event.token_breakdown.get("tools"))
    span.set_attribute("llm.token_pct.messages", event.token_breakdown.get("messages"))

# MCP tracking
if event.mcp_servers_started:
    span.set_attribute("mcp.servers_started", ",".join(event.mcp_servers_started))
if event.mcp_tools_available:
    span.set_attribute("mcp.tools_available", ",".join(event.mcp_tools_available))

# Tool rounds
span.set_attribute("tools.round_count", event.tool_call_rounds_count)
if event.tool_calls_detail:
    span.set_attribute("tools.detail", event.tool_calls_detail)

# Response composition
if event.response_kind_counts:
    span.set_attribute("response.kind_counts", event.response_kind_counts)
span.set_attribute("response.code_blocks_count", event.code_blocks_count)
if event.code_languages:
    span.set_attribute("response.code_languages", ",".join(event.code_languages))

# Thinking
if event.thinking:
    span.set_attribute("llm.thinking", event.thinking[:500])  # Truncate

# Context
if event.workspace_repos:
    span.set_attribute("context.workspace_repos", ",".join(event.workspace_repos))

# Flow
if event.turn_index is not None:
    span.set_attribute("conversation.turn_index", event.turn_index)
span.set_attribute("conversation.had_confirmation", event.had_confirmation_prompt)
span.set_attribute("conversation.max_tool_calls_exceeded", event.max_tool_calls_exceeded)
```

### Step 3: Test with TZ Extension (15 min)

```bash
# Start proxy with enhanced model
npm run copilot:start

# Trigger Copilot Chat interaction in VSCode
# Check proxy logs for new fields

# curl test
curl -X POST http://localhost:8080/v1/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "chat",
    "messages": [...],
    "model": "gpt-4o",
    "token_breakdown": {"system": 51, "tools": 43, "messages": 6},
    "thinking": "Let me analyze the file structure first...",
    "tool_call_rounds_count": 2
  }'

# Verify in Phoenix UI
# http://localhost:6006 → Traces → Check new attributes
```

### Step 4: Create Automated Batch Pipeline (45 min)

```python
# agent/observability/process_chat_json.py
"""
One-command pipeline: chat.json → parse → categorize → annotate → upload
"""

from agent.observability.copilot_chat_parser import parse_chat_json, upload_to_phoenix
import pandas as pd

def process_and_upload(chat_json_path: str, dataset_name: str):
    # Parse
    df = parse_chat_json(chat_json_path)
    print(f"Parsed {len(df)} turns")

    # Add category tags
    df["category_task"] = df["tools_invoked"].apply(categorize_task)
    df["category_complexity"] = df.apply(categorize_complexity, axis=1)

    # Upload to Phoenix
    upload_to_phoenix(df, dataset_name=dataset_name)
    print(f"Uploaded dataset '{dataset_name}' to Phoenix")

def categorize_task(tools: str) -> str:
    if "readfile" in tools.lower():
        return "code_reading"
    elif "editfile" in tools.lower():
        return "code_editing"
    else:
        return "chat"

def categorize_complexity(row: pd.Series) -> str:
    rounds = row.get("tool_call_rounds_count", 0)
    if rounds == 0:
        return "simple"
    elif rounds >= 3:
        return "complex"
    else:
        return "medium"

if __name__ == "__main__":
    import sys
    process_and_upload(sys.argv[1], sys.argv[2])
```

**Usage**:

```bash
python -m agent.observability.process_chat_json datasets/chat.json copilot-feb8
```

### Step 5: Add npm Script (5 min)

```json
// package.json
{
  "scripts": {
    "copilot:process-chat": "python -m agent.observability.process_chat_json datasets/chat.json copilot-session",
    "copilot:process-latest": "python -m agent.observability.process_chat_json datasets/chat.json copilot-$(date +%s)"
  }
}
```

---

## 🔄 Dual Pipeline Strategy

### Real-Time Path (TZ Extension)

✅ **Use for**:

- Live monitoring
- Alerting
- Debug traces
- Performance dashboards

❌ **Limitations**:

- May not expose all 40 fields
- No thinking/CoT
- No response composition details

### Batch Path (chat.json)

✅ **Use for**:

- Comprehensive analysis
- Fine-tuning datasets
- Experiments/evals
- Prompt versioning

❌ **Limitations**:

- Manual export required
- No real-time visibility
- Post-hoc only

### Unified Approach

**Recommendation**: Use **both** pipelines:

```
Real-Time (TZ) → Phoenix Traces (monitoring)
                     ↓
                 Correlation by request_id
                     ↓
Batch (chat.json) → Phoenix Datasets (analysis)
```

**Benefits**:

- Validate real-time telemetry against ground truth
- Enrich traces with batch metadata
- Gap analysis (find missing data)

---

## 📈 Phoenix Integration Patterns

### Pattern 1: Upload Batch Dataset

```python
from agent.observability.copilot_chat_parser import parse_chat_json, upload_to_phoenix

# Parse and upload
df = parse_chat_json("datasets/chat.json")
upload_to_phoenix(df, dataset_name="copilot-session-feb8")

# Query in Phoenix UI
# http://localhost:6006 → Datasets → copilot-session-feb8
```

### Pattern 2: Correlate Traces with Datasets

```python
from phoenix.client import Client

client = Client()

# Get real-time traces
traces_df = client.query_spans(project_name="copilot-research")

# Get batch examples
dataset = client.datasets.get_dataset("copilot-session-feb8")
examples_df = dataset.to_dataframe()

# Merge on request_id
merged = pd.merge(traces_df, examples_df, on="request_id", how="outer")

# Analyze gaps
print(f"Real-time only: {merged['request_id'].isna().sum()}")
print(f"Batch only: {merged['example_id'].isna().sum()}")
```

### Pattern 3: Extract System Prompts

```python
# Extract and version system instructions
def extract_system_prompt(chat_json_path: str):
    with open(chat_json_path) as f:
        data = json.load(f)

    first_request = data["requests"][0]
    variables = first_request["variableData"]["variables"]

    # Find promptFile variables
    system_prompts = [
        var["value"] for var in variables
        if var.get("kind") == "promptFile"
    ]

    return "\n\n".join(system_prompts)

# Upload to Phoenix Prompts
from phoenix.client import Client
client = Client()

prompt_text = extract_system_prompt("datasets/chat.json")
client.prompts.upsert_prompt(
    name="copilot-workspace-agent",
    template={"type": "chat", "messages": [{"role": "system", "content": prompt_text}]},
    model_name="gpt-4o"
)
```

### Pattern 4: Auto-Annotate Examples

```python
# Add automatic quality scores
from phoenix.client import Client

client = Client()
dataset = client.datasets.get_dataset("copilot-session-feb8")

for example in dataset.examples:
    # Latency score
    latency_ms = example.metadata.get("latency_total_ms", 0)
    latency_score = 1.0 if latency_ms < 2000 else 0.5 if latency_ms < 10000 else 0.0

    client.annotations.create_annotation(
        example_id=example.id,
        name="latency_score",
        annotator_kind="CODE",
        score=latency_score,
        explanation=f"Latency: {latency_ms}ms"
    )

    # Tool efficiency score
    rounds = example.metadata.get("tool_call_rounds_count", 0)
    efficiency_score = 1.0 if rounds <= 2 else 0.5 if rounds <= 4 else 0.0

    client.annotations.create_annotation(
        example_id=example.id,
        name="tool_efficiency",
        annotator_kind="CODE",
        score=efficiency_score,
        explanation=f"Solved in {rounds} rounds"
    )
```

---

## 🎯 Next Actions (Prioritized)

### This Week

1. ✅ **Enhance CopilotTelemetryEvent** (30 min)
   - Add 23 missing fields as Optional
   - Test with mock data

2. ✅ **Map to OpenInference** (30 min)
   - Update `set_openinference_attributes()`
   - Add new span attributes

3. ✅ **Test TZ Extension** (15 min)
   - Trigger Copilot Chat
   - Check which fields are populated
   - Document gaps

4. ✅ **Create batch pipeline script** (45 min)
   - parse → categorize → upload
   - Add npm script

### Next Week

5. ⏸️ **Build auto-annotator** (2 hours)
   - Latency, tool efficiency, token budget, completeness

6. ⏸️ **Extract system prompts** (1 hour)
   - Parse from chat.json
   - Upload to Phoenix Prompts

7. ⏸️ **Create correlation queries** (1 hour)
   - Merge real-time traces with batch datasets
   - Gap analysis report

### This Month

8. ⏸️ **File watcher for chat.json** (2 hours)
   - Auto-detect new exports
   - Trigger pipeline automatically

9. ⏸️ **Phoenix dashboard templates** (4 hours)
   - Token budget analysis
   - Tool usage patterns
   - MCP integration metrics

10. ⏸️ **Fine-tuning dataset export** (2 hours)
    - chat.json → OpenAI/Anthropic format
    - Filter by quality annotations

---

## 💡 Key Insights

### Token Budget Discovery

**System instructions: 51%**
**Tool definitions: 43%**
**User content: 6%**

**Implication**: 94% of prompt tokens are overhead. Optimize system prompts and tool schemas.

### Multi-Round Tool Loops

**Average: 2-3 rounds**
**Max observed: 8 rounds**

**Implication**: Copilot uses ReAct-style agentic reasoning. Track efficiency (rounds per task).

### Response Polymorphism

**9 response kinds**: thinking, toolInvocation, textEdit, codeblockUri, inlineReference, etc.

**Implication**: Responses are composite artifacts. Eval frameworks need multi-modal scoring.

### MCP Integration

**MCP servers start dynamically per session**
**Tools scoped by server**

**Implication**: Track MCP lifecycle for latency attribution and tool availability analysis.

### Thinking/CoT Exposure

**VS Code exposes internal reasoning**
**Separate from final response**

**Implication**: Fine-tuning can use thinking as intermediate supervision signal.

---

## 📚 Reference Documents

- **Full Analysis**: `COPILOT_CHAT_PARSER_INTEGRATION.md`
- **Customization Guide**: `COPILOT_OBSERVABILITY_CUSTOMIZATION_GUIDE.md`
- **API Review**: `COPILOT_OBSERVABILITY_API_REVIEW.md`
- **Parser Code**: `agent/observability/copilot_chat_parser.py`

---

## 🚀 Quick Commands

```bash
# Parse chat.json to CSV
python -m agent.observability.copilot_chat_parser datasets/chat.json

# Parse and upload to Phoenix
python -m agent.observability.copilot_chat_parser datasets/chat.json --upload --dataset-name my-session

# Show schema
python -m agent.observability.copilot_chat_parser --print-schema

# Process with pipeline (parse + categorize + upload)
npm run copilot:process-chat

# Start observability stack
npm run copilot:start

# View Phoenix UI
npm run copilot:ui
```

---

**Questions?** See full integration guide or API review documents for detailed implementations.
