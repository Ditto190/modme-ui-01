# Copilot Chat Parser Integration Analysis

**Analysis Date**: February 8, 2026
**Context**: Integration of VS Code chat.json parser with real-time telemetry proxy

---

## Executive Summary

The `copilot_chat_parser.py` implementation reveals **critical metadata** that should be captured in real-time telemetry. The parser extracts **40 structured columns** from VS Code's nested chat.json format, providing insights into:

- **Token budget breakdown** (system instructions: 51%, tool definitions: 43%, user content: 6%)
- **MCP server lifecycle** (servers started, tools available from toolsets)
- **Tool execution details** (rounds, arguments, results as rich text trees)
- **Response composition** (9 response kinds, code blocks, file edits)
- **Context attachments** (workspace repos, prompt files, attached files)

This analysis shows how to **unify real-time and batch data pipelines** for comprehensive Copilot observability.

---

## 1. Data Model Comparison

### Current Real-Time Telemetry (TZ Extension → Proxy)

**From `CopilotTelemetryEvent` model:**

```python
class CopilotTelemetryEvent(BaseModel):
    event_type: str
    messages: List[CopilotChatMessage]
    model: str
    agent_role: Optional[str]
    input_tokens: int
    output_tokens: int
    total_tokens: int
    latency_ms: int
    request_id: str
    session_id: Optional[str]
    timestamp: str
    tools_available: List[str]
    tools_used: List[str]
    instructions: Optional[str]
    workspace: Optional[str]
    feedback: Optional[str]
```

**16 fields** total

### Batch Chat.json Parser (chat.json → DataFrame)

**From `copilot_chat_parser.py`:**

```python
INPUT_COLUMNS = ["user_message"]  # 1 column

OUTPUT_COLUMNS = ["assistant_response", "thinking"]  # 2 columns

METADATA_COLUMNS = [  # 37 columns
    # Identity (8)
    "request_id", "response_id", "session_id", "model_id",
    "agent_id", "agent_name", "responder", "timestamp",

    # Tokens & Performance (5)
    "prompt_tokens", "completion_tokens",
    "latency_first_progress_ms", "latency_total_ms", "time_spent_waiting_ms",

    # Token Breakdown (5) ⭐ NEW
    "token_pct_system_instructions", "token_pct_tool_definitions",
    "token_pct_messages", "token_pct_files", "token_pct_tool_results",

    # Context (3) ⭐ NEW
    "workspace_repos", "prompt_files", "attached_files",

    # Tools & MCP (6) ⭐ NEW
    "tools_available", "tools_invoked", "tool_call_rounds_count",
    "tool_calls_detail", "mcp_servers_started", "mcp_tools_available",

    # Response Composition (5) ⭐ NEW
    "response_kind_counts", "code_blocks_count", "code_languages",
    "files_edited", "inline_references",

    # Conversation Flow (5) ⭐ NEW
    "turn_index", "had_confirmation_prompt", "max_tool_calls_exceeded",
    "request_message_length", "response_text_length",
]
```

**40 fields** total

### Gap Analysis: Missing in Real-Time Telemetry

| **Category**             | **Fields in Chat.json**        | **Status in TZ Extension**  |
| ------------------------ | ------------------------------ | --------------------------- |
| **Token Breakdown**      | 5 fields (% by category)       | ❌ Missing entirely         |
| **MCP Tracking**         | 2 fields (servers, tools)      | ❌ Missing entirely         |
| **Tool Detail**          | 2 fields (rounds, detail JSON) | ⚠️ Partial (only names)     |
| **Response Composition** | 5 fields (kinds, code, edits)  | ❌ Missing entirely         |
| **Context Attachments**  | 3 fields (repos, files)        | ⚠️ Partial (workspace only) |
| **Thinking/CoT**         | 1 field (thinking text)        | ❌ Missing entirely         |
| **Conversation Flow**    | 5 fields (turn, confirmation)  | ❌ Missing entirely         |

**Result**: **23 of 40 fields (57.5%)** from chat.json are not captured in real-time telemetry.

---

## 2. Critical Insights from Chat.json Parser

### Insight #1: Token Budget Breakdown

**Discovery**: VS Code exports detailed token allocation:

```python
"token_pct_system_instructions": 51,  # Half the prompt is system instructions!
"token_pct_tool_definitions": 43,     # Tool schemas dominate
"token_pct_messages": 6,              # User content is tiny
"token_pct_files": 0,
"token_pct_tool_results": 0,
```

**Implications**:

- **Prompt optimization opportunity**: 94% of prompt tokens are overhead (system + tools)
- **Context window pressure**: User content gets only 6% of available space
- **Fine-tuning insight**: Training data should reflect this distribution

**Action**: Add `promptTokenDetails[]` to telemetry event model.

### Insight #2: Rich Text Node Trees

**Discovery**: Tool results are not plain strings but **VS Code MarkdownString trees**:

```json
{
  "type": "markdown",
  "ctorName": "MarkdownString",
  "children": [
    { "text": "File contents: " },
    { "type": "codeblock", "language": "python", "children": [{ "text": "def main():\n    pass" }] }
  ],
  "props": {},
  "references": []
}
```

**Implications**:

- TZ Extension telemetry doesn't capture tool result structure
- Need recursive extraction: `_extract_text_from_rich_node()`
- Evaluation/fine-tuning requires flattened text, not JSON trees

**Action**: Add tool result text extraction to proxy.

### Insight #3: Response Polymorphism (9 Kinds)

**Discovery**: VS Code responses have **9 distinct kinds**:

```python
response_kind_counts = {
    "thinking": 2,              # Chain-of-thought blocks
    "toolInvocationSerialized": 5,  # "Running readFile..."
    "progressTaskSerialized": 1,    # Progress updates
    "textEditGroup": 3,         # File edits
    "codeblockUri": 2,          # Code blocks
    "inlineReference": 4,       # File references
    "mcpServersStarting": 1,    # MCP lifecycle
    "confirmation": 1,          # User confirmations
    "undoStop": 1,              # Undo boundaries
}
```

**Implications**:

- Assistant responses are **composite artifacts**, not single strings
- Different response types carry different metadata (languages, URIs, edit targets)
- Evals need to handle multi-modal output (text + code + edits)

**Action**: Track response composition in telemetry metadata.

### Insight #4: MCP Server Lifecycle

**Discovery**: VS Code tracks **MCP server startup and toolset registration**:

```python
"mcp_servers_started": "github, filesystem",
"mcp_tools_available": "github/search_code, github/create_issue, filesystem/read_file",
```

**Implications**:

- MCP integration is first-class in Copilot Chat
- Need to track which servers/tools were available vs. actually used
- Latency attribution: some tools may be slow due to MCP overhead

**Action**: Add MCP tracking to telemetry event model (if TZ Extension provides it).

### Insight #5: Tool Call Rounds

**Discovery**: Tool invocations happen in **rounds** (agentic loops):

```python
tool_calls_detail = [
    {"round": 0, "name": "readFile", "arguments_preview": '{"path": "./config.json"}'},
    {"round": 0, "name": "searchFiles", "arguments_preview": '{"pattern": "*.ts"}'},
    {"round": 1, "name": "editFile", "arguments_preview": '{"path": "./index.ts", "edit": ...'},
]
```

**Implications**:

- Copilot uses multi-turn tool loops (ReAct-style reasoning)
- Need to capture round count and sequence for performance analysis
- Evals should measure "tool call efficiency" (rounds needed to solve task)

**Action**: Add `tool_call_rounds[]` array to telemetry.

---

## 3. Dual Pipeline Architecture

### Current State: Two Independent Data Sources

```
┌─────────────────────────────────────────────────────────────┐
│                    Data Source 1: Real-Time                 │
│                                                             │
│  VSCode + TZ Extension                                      │
│         │                                                   │
│         │ HTTP POST (during chat)                          │
│         ▼                                                   │
│  FastAPI Proxy (copilot_phoenix_proxy.py)                  │
│         │                                                   │
│         │ OTLP/HTTP                                        │
│         ▼                                                   │
│  Phoenix (traces, spans)                                   │
│                                                             │
│  ✅ Real-time                                              │
│  ✅ Live monitoring                                        │
│  ❌ Missing 23 fields                                      │
│  ❌ No thinking/CoT                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Data Source 2: Batch                     │
│                                                             │
│  VSCode Export (chat.json)                                 │
│         │                                                   │
│         │ Manual export                                    │
│         ▼                                                   │
│  Parser (copilot_chat_parser.py)                           │
│         │                                                   │
│         │ DataFrame                                        │
│         ▼                                                   │
│  Phoenix (datasets, examples)                              │
│                                                             │
│  ✅ Rich metadata (40 fields)                             │
│  ✅ Thinking/CoT included                                 │
│  ✅ Token breakdown                                        │
│  ❌ No real-time visibility                               │
│  ❌ Manual workflow                                        │
└─────────────────────────────────────────────────────────────┘
```

### Recommendation: Unified Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                  Copilot Observability Platform                │
└────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
    ┌─────────────────────┐   ┌─────────────────────┐
    │   Real-Time Path    │   │    Batch Path       │
    │   (TZ Extension)    │   │   (chat.json)       │
    └─────────────────────┘   └─────────────────────┘
                │                           │
                │ Enhanced                  │ Full 40-field
                │ Telemetry                 │ DataFrame
                ▼                           ▼
    ┌─────────────────────────────────────────────┐
    │     Phoenix Unified Backend                 │
    │                                             │
    │  • Traces (real-time spans)                │
    │  • Datasets (batch examples)               │
    │  • Prompts (system instruction versioning) │
    │  • Annotations (eval scores/labels)        │
    └─────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
    ┌─────────────────────┐   ┌─────────────────────┐
    │  Live Monitoring    │   │  Batch Analysis     │
    │  • Dashboard        │   │  • Experiments      │
    │  • Alerts           │   │  • Fine-tuning      │
    │  • Debug traces     │   │  • Evals            │
    └─────────────────────┘   └─────────────────────┘
```

**Key Principle**: Use **both pipelines** for their strengths:

- Real-time → monitoring, alerting, live debug
- Batch → comprehensive analysis, fine-tuning datasets, evals

---

## 4. Integration Strategy

### Phase 1: Enhance Real-Time Telemetry Model

**Goal**: Close the gap between TZ Extension events and chat.json richness.

**Changes to `CopilotTelemetryEvent`:**

```python
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class TokenBreakdown(BaseModel):
    """Token allocation by category (from promptTokenDetails)."""
    system_instructions_pct: Optional[int] = None
    tool_definitions_pct: Optional[int] = None
    messages_pct: Optional[int] = None
    files_pct: Optional[int] = None
    tool_results_pct: Optional[int] = None

class ToolCallRound(BaseModel):
    """Details of a single tool call within a round."""
    round: int
    name: str
    arguments_preview: str  # Truncated for metadata
    result_preview: Optional[str] = None

class ResponseComposition(BaseModel):
    """Breakdown of response structure."""
    kind_counts: Dict[str, int] = Field(default_factory=dict)
    code_blocks_count: int = 0
    code_languages: List[str] = Field(default_factory=list)
    files_edited: List[str] = Field(default_factory=list)
    inline_references: List[str] = Field(default_factory=list)

class ContextAttachments(BaseModel):
    """Files and repos attached to the request."""
    workspace_repos: List[str] = Field(default_factory=list)
    prompt_files: List[str] = Field(default_factory=list)
    attached_files: List[str] = Field(default_factory=list)

class MCPTracking(BaseModel):
    """MCP server lifecycle and tools."""
    servers_started: List[str] = Field(default_factory=list)
    tools_available: List[str] = Field(default_factory=list)  # "server/tool" format

class CopilotTelemetryEvent(BaseModel):
    """Enhanced telemetry event matching chat.json richness."""

    # Core (existing)
    event_type: str
    messages: List[CopilotChatMessage]
    model: str
    agent_role: Optional[str] = None
    request_id: str
    session_id: Optional[str] = None
    timestamp: str

    # Tokens (existing + enhanced)
    input_tokens: int
    output_tokens: int
    total_tokens: int
    token_breakdown: Optional[TokenBreakdown] = None  # ⭐ NEW

    # Performance
    latency_ms: int
    latency_first_progress_ms: Optional[int] = None  # ⭐ NEW
    time_spent_waiting_ms: Optional[int] = None  # ⭐ NEW

    # Tools (existing + enhanced)
    tools_available: List[str] = Field(default_factory=list)
    tools_used: List[str] = Field(default_factory=list)
    tool_call_rounds: List[ToolCallRound] = Field(default_factory=list)  # ⭐ NEW

    # MCP (new)
    mcp: Optional[MCPTracking] = None  # ⭐ NEW

    # Context (existing + enhanced)
    workspace: Optional[str] = None
    context: Optional[ContextAttachments] = None  # ⭐ NEW

    # Response (new)
    thinking: Optional[str] = None  # ⭐ NEW (chain-of-thought)
    response_composition: Optional[ResponseComposition] = None  # ⭐ NEW

    # Instructions & Agent
    instructions: Optional[str] = None
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None

    # Flow (new)
    turn_index: Optional[int] = None  # ⭐ NEW
    had_confirmation_prompt: bool = False  # ⭐ NEW
    max_tool_calls_exceeded: bool = False  # ⭐ NEW

    # Feedback
    feedback: Optional[str] = None
```

**Backward Compatibility**: All new fields are `Optional` with defaults.

### Phase 2: Map TZ Extension Fields

**Challenge**: TZ Extension may not expose all fields that chat.json contains.

**Strategy**: Parse what's available, mark rest as `None`.

**Example proxy endpoint enhancement:**

```python
@app.post("/v1/telemetry")
async def receive_telemetry(event: CopilotTelemetryEvent):
    """Receive enhanced telemetry with chat.json-level detail."""

    with tracer.start_as_current_span(
        f"copilot.{event.event_type}",
        attributes={
            # Existing attributes
            SpanAttributes.LLM_MODEL_NAME: event.model,
            SpanAttributes.LLM_INPUT_MESSAGES: json.dumps([
                {"role": m.role, "content": m.content} for m in event.messages
            ]),
            SpanAttributes.LLM_TOKEN_COUNT_PROMPT: event.input_tokens,
            SpanAttributes.LLM_TOKEN_COUNT_COMPLETION: event.output_tokens,

            # ⭐ NEW: Token breakdown
            "llm.token_pct.system_instructions": event.token_breakdown.system_instructions_pct
                if event.token_breakdown else None,
            "llm.token_pct.tool_definitions": event.token_breakdown.tool_definitions_pct
                if event.token_breakdown else None,
            "llm.token_pct.messages": event.token_breakdown.messages_pct
                if event.token_breakdown else None,

            # ⭐ NEW: MCP tracking
            "mcp.servers_started": ",".join(event.mcp.servers_started) if event.mcp else None,
            "mcp.tools_available": ",".join(event.mcp.tools_available) if event.mcp else None,

            # ⭐ NEW: Tool rounds
            "tools.round_count": len(event.tool_call_rounds),
            "tools.detail": json.dumps([
                {"round": tc.round, "name": tc.name}
                for tc in event.tool_call_rounds
            ]) if event.tool_call_rounds else None,

            # ⭐ NEW: Response composition
            "response.code_blocks_count": event.response_composition.code_blocks_count
                if event.response_composition else None,
            "response.code_languages": ",".join(event.response_composition.code_languages)
                if event.response_composition else None,
            "response.files_edited": ",".join(event.response_composition.files_edited)
                if event.response_composition else None,

            # ⭐ NEW: Thinking/CoT
            SpanAttributes.LLM_OUTPUT_MESSAGES: json.dumps([{
                "role": "assistant",
                "content": extract_assistant_response(event.messages),
                "thinking": event.thinking  # Chain-of-thought
            }]) if event.thinking else None,

            # ⭐ NEW: Context attachments
            "context.workspace_repos": ",".join(event.context.workspace_repos)
                if event.context else None,
            "context.prompt_files": ",".join(event.context.prompt_files)
                if event.context else None,
            "context.attached_files": ",".join(event.context.attached_files)
                if event.context else None,

            # ⭐ NEW: Flow control
            "conversation.turn_index": event.turn_index,
            "conversation.had_confirmation": event.had_confirmation_prompt,
            "conversation.max_tool_calls_exceeded": event.max_tool_calls_exceeded,
        }
    ) as span:
        # ... rest of processing
```

### Phase 3: Correlate Real-Time Traces with Batch Datasets

**Goal**: Link traces (from TZ Extension) with dataset examples (from chat.json).

**Correlation Key**: `request_id` appears in both sources.

**Phoenix Query Example:**

```python
from phoenix.client import Client

client = Client()

# Get traces from real-time telemetry
traces_df = client.query_spans(
    project_name="copilot-research",
    start_time=start_date,
    end_time=end_date
)

# Get dataset examples from batch import
dataset = client.datasets.get_dataset("copilot-session-feb8")
examples_df = dataset.to_dataframe()

# Merge on request_id
merged = pd.merge(
    traces_df,
    examples_df,
    left_on="context.trace_id",
    right_on="request_id",
    how="outer",
    suffixes=("_realtime", "_batch")
)

# Analyze coverage
print(f"Real-time only: {merged['request_id_batch'].isna().sum()}")
print(f"Batch only: {merged['context.trace_id'].isna().sum()}")
print(f"Matched: {merged['request_id_batch'].notna().sum()}")
```

**Use Cases**:

1. **Validate real-time telemetry** against ground truth (chat.json)
2. **Enrich traces** with batch metadata (thinking, response_kind_counts)
3. **Gap analysis**: Find requests missing from one pipeline or the other

### Phase 4: Automated Batch Import Workflow

**Goal**: Make chat.json import seamless, not manual.

**Options**:

#### Option A: VSCode Extension Auto-Export

```typescript
// .vscode/extension.ts
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  // Watch for Copilot Chat completions
  vscode.chat.onDidPerformChatAction(async (event) => {
    if (event.action === "chatCompleted") {
      // Export chat.json
      const chatJson = await vscode.chat.exportChat(event.sessionId);
      const exportPath = path.join(context.globalStorageUri.fsPath, "chat_exports");

      fs.mkdirSync(exportPath, { recursive: true });
      const filename = `chat_${event.sessionId}_${Date.now()}.json`;
      fs.writeFileSync(path.join(exportPath, filename), JSON.stringify(chatJson));

      // Trigger parser upload
      await vscode.commands.executeCommand("copilot-observability.uploadChatJson", filename);
    }
  });
}
```

#### Option B: File Watcher + Auto-Upload

```python
# agent/observability/chat_json_watcher.py
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from agent.observability.copilot_chat_parser import parse_chat_json, upload_to_phoenix

class ChatJsonHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.src_path.endswith('.json'):
            print(f"Detected new chat export: {event.src_path}")

            # Wait for file write to complete
            time.sleep(2)

            # Parse and upload
            try:
                df = parse_chat_json(event.src_path)
                dataset_name = f"copilot-session-{int(time.time())}"
                upload_to_phoenix(df, dataset_name=dataset_name)
                print(f"Uploaded dataset: {dataset_name}")
            except Exception as e:
                print(f"Error processing {event.src_path}: {e}")

# Watch the VSCode chat exports directory
observer = Observer()
observer.schedule(ChatJsonHandler(), path="./datasets/chat_exports", recursive=False)
observer.start()
```

**Docker Compose Integration:**

```yaml
# docker-compose.phoenix.yml
services:
  phoenix:
    # ... existing config

  copilot-proxy:
    # ... existing config

  chat-json-watcher: # New service
    build:
      context: .
      dockerfile: Dockerfile.copilot-proxy # Reuse same image
    command: python -m agent.observability.chat_json_watcher
    volumes:
      - ./datasets/chat_exports:/app/datasets/chat_exports:ro
      - ./agent:/app/agent
    environment:
      - PHOENIX_ENDPOINT=http://phoenix:6006
    depends_on:
      phoenix:
        condition: service_healthy
    restart: unless-stopped
```

---

## 5. Prompt Template Integration

### Problem: System Instructions Not Versioned

**Current State**: System instructions/agent roles are sent with each request but not tracked as versioned artifacts.

**chat.json Insight**: System instructions consume **51% of prompt tokens** on average.

**Solution**: Use Phoenix Prompts API to version and tag system prompts.

### Implementation: Extract & Upload System Prompts

```python
# agent/observability/prompt_extractor.py
from phoenix.client import Client
from typing import Dict, Any

def extract_system_prompt_from_chat_json(chat_data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract the system prompt/instructions from a chat.json export."""

    # System prompt is typically in the first request's variableData
    first_request = chat_data.get("requests", [])[0] if chat_data.get("requests") else {}
    variables = first_request.get("variableData", {}).get("variables", [])

    # Look for promptFile variables (system instructions)
    system_instructions = []
    for var in variables:
        if var.get("kind") == "promptFile":
            system_instructions.append({
                "name": var.get("name", ""),
                "content": var.get("value", ""),
            })

    # Extract agent metadata
    agent = first_request.get("agent", {})
    model_id = first_request.get("modelId", "")

    return {
        "instructions": system_instructions,
        "agent_id": agent.get("id", ""),
        "agent_name": agent.get("fullName", ""),
        "model_id": model_id,
    }

def upload_system_prompt_to_phoenix(
    chat_json_path: str,
    prompt_name: str = "copilot-system-prompt"
) -> None:
    """Extract system prompt from chat.json and upload to Phoenix Prompts."""
    import json

    with open(chat_json_path, "r", encoding="utf-8") as f:
        chat_data = json.load(f)

    prompt_data = extract_system_prompt_from_chat_json(chat_data)

    client = Client()

    # Create or update prompt template
    template = {
        "type": "chat",
        "messages": [
            {
                "role": "system",
                "content": "\n\n".join(
                    f"# {inst['name']}\n{inst['content']}"
                    for inst in prompt_data["instructions"]
                )
            }
        ]
    }

    # Upload to Phoenix
    prompt_version = client.prompts.upsert_prompt(
        name=prompt_name,
        template=template,
        model_name=prompt_data["model_id"],
        description=f"System instructions for agent: {prompt_data['agent_name']}",
        metadata={
            "agent_id": prompt_data["agent_id"],
            "agent_name": prompt_data["agent_name"],
            "source": "chat.json",
        }
    )

    print(f"Uploaded prompt '{prompt_name}' version: {prompt_version.id}")

    # Tag as production if this is from a successful session
    client.prompts.add_prompt_version_tag(
        prompt_version_id=prompt_version.id,
        tag_name="production"
    )
```

**Usage in Automated Workflow:**

```python
# After parsing chat.json
df = parse_chat_json("datasets/chat.json")
upload_to_phoenix(df, dataset_name="copilot-session-feb8")

# Also extract and version the system prompt
upload_system_prompt_to_phoenix(
    chat_json_path="datasets/chat.json",
    prompt_name="copilot-workspace-agent-v2"
)
```

**Phoenix UI Benefit**: View all system prompt versions, compare changes, track which version was used for each trace.

---

## 6. Dataset Categorization Strategy

### Goal: Auto-Categorize Examples for Targeted Analysis

**Insight**: The 40-column schema provides rich signals for automatic categorization.

### Categorization Dimensions

```python
# agent/observability/dataset_categorizer.py
from typing import List, Dict
import pandas as pd

def categorize_examples(df: pd.DataFrame) -> pd.DataFrame:
    """Add category tags to dataset examples based on metadata."""

    # Category 1: Task Type (based on tools used)
    df["category_task_type"] = df.apply(lambda row: categorize_task_type(row), axis=1)

    # Category 2: Complexity (based on tool rounds, tokens, latency)
    df["category_complexity"] = df.apply(lambda row: categorize_complexity(row), axis=1)

    # Category 3: Outcome (based on errors, confirmations)
    df["category_outcome"] = df.apply(lambda row: categorize_outcome(row), axis=1)

    # Category 4: MCP Usage
    df["category_mcp_usage"] = df.apply(lambda row: categorize_mcp_usage(row), axis=1)

    # Category 5: Response Type
    df["category_response_type"] = df.apply(lambda row: categorize_response_type(row), axis=1)

    return df

def categorize_task_type(row: pd.Series) -> str:
    """Infer task type from tools used."""
    tools = row.get("tools_invoked", "").lower()

    if "readfile" in tools or "searchfiles" in tools:
        return "code_reading"
    elif "editfile" in tools or "createfile" in tools:
        return "code_editing"
    elif "runcommand" in tools or "runterminal" in tools:
        return "command_execution"
    elif "searchcode" in tools:
        return "code_search"
    elif not tools:
        return "pure_chat"
    else:
        return "mixed"

def categorize_complexity(row: pd.Series) -> str:
    """Classify based on computational complexity."""
    rounds = row.get("tool_call_rounds_count", 0)
    tokens = row.get("prompt_tokens", 0)
    latency_ms = row.get("latency_total_ms", 0)

    # Simple: no tools, low tokens, fast
    if rounds == 0 and tokens < 1000 and latency_ms < 2000:
        return "simple"

    # Complex: multi-round tools, high tokens, slow
    elif rounds >= 3 or tokens > 10000 or latency_ms > 30000:
        return "complex"

    # Medium: everything else
    else:
        return "medium"

def categorize_outcome(row: pd.Series) -> str:
    """Classify based on execution outcome."""
    # Check for error signals
    had_confirmation = row.get("had_confirmation_prompt", False)
    max_tools_exceeded = row.get("max_tool_calls_exceeded", False)
    response_text = row.get("assistant_response", "")

    if max_tools_exceeded:
        return "failed_max_tools"
    elif had_confirmation:
        return "needs_user_input"
    elif "error" in response_text.lower() or "failed" in response_text.lower():
        return "error"
    elif row.get("files_edited"):
        return "success_with_edits"
    else:
        return "success"

def categorize_mcp_usage(row: pd.Series) -> str:
    """Classify MCP integration level."""
    mcp_servers = row.get("mcp_servers_started", "")
    mcp_tools = row.get("mcp_tools_available", "")

    if not mcp_servers and not mcp_tools:
        return "no_mcp"
    elif mcp_servers and not mcp_tools:
        return "mcp_available_unused"
    elif mcp_tools and mcp_tools in row.get("tools_invoked", ""):
        return "mcp_used"
    else:
        return "mcp_available_unused"

def categorize_response_type(row: pd.Series) -> str:
    """Classify based on response composition."""
    code_blocks = row.get("code_blocks_count", 0)
    files_edited = row.get("files_edited", "")
    thinking = row.get("thinking", "")

    if code_blocks > 0:
        return "code_generation"
    elif files_edited:
        return "file_modification"
    elif thinking:
        return "reasoning_heavy"
    else:
        return "text_only"
```

**Upload with Categories:**

```python
# Enhanced upload workflow
df = parse_chat_json("datasets/chat.json")
df = categorize_examples(df)  # Add category columns
upload_to_phoenix(df, dataset_name="copilot-session-feb8")
```

**Phoenix Query with Categories:**

```python
# Fetch only code_reading tasks that succeeded
dataset = client.datasets.get_dataset("copilot-session-feb8")
examples = dataset.to_dataframe()

code_reading_success = examples[
    (examples["category_task_type"] == "code_reading") &
    (examples["category_outcome"] == "success")
]

print(f"Found {len(code_reading_success)} successful code reading examples")
```

---

## 7. Automated Annotation Strategy

### Goal: Add Evaluation Scores to Examples

**Phoenix Annotations API** allows programmatic labeling of examples with scores, labels, and explanations.

### Annotation Types from Chat.json Metadata

```python
# agent/observability/auto_annotator.py
from phoenix.client import Client
from typing import List, Dict

class CopilotAnnotator:
    """Automatically annotate dataset examples based on metadata."""

    def __init__(self, client: Client):
        self.client = client

    def annotate_dataset(self, dataset_name: str) -> None:
        """Add all automatic annotations to a dataset."""
        dataset = self.client.datasets.get_dataset(dataset_name)
        df = dataset.to_dataframe()

        for _, row in df.iterrows():
            example_id = row["example_id"]  # Assuming Phoenix adds this

            # Annotation 1: Latency score
            self.annotate_latency(example_id, row)

            # Annotation 2: Tool efficiency
            self.annotate_tool_efficiency(example_id, row)

            # Annotation 3: Token budget health
            self.annotate_token_budget(example_id, row)

            # Annotation 4: Response completeness
            self.annotate_response_completeness(example_id, row)

    def annotate_latency(self, example_id: str, row: pd.Series) -> None:
        """Score based on latency."""
        latency_ms = row.get("latency_total_ms", 0)

        # Score: 1.0 (fast) to 0.0 (slow)
        if latency_ms < 2000:
            score = 1.0
            label = "fast"
        elif latency_ms < 10000:
            score = 0.5
            label = "acceptable"
        else:
            score = 0.0
            label = "slow"

        self.client.annotations.create_annotation(
            example_id=example_id,
            name="latency_score",
            annotator_kind="CODE",
            label=label,
            score=score,
            explanation=f"Total latency: {latency_ms}ms"
        )

    def annotate_tool_efficiency(self, example_id: str, row: pd.Series) -> None:
        """Score based on tool call efficiency."""
        rounds = row.get("tool_call_rounds_count", 0)
        max_exceeded = row.get("max_tool_calls_exceeded", False)

        if max_exceeded:
            score = 0.0
            label = "inefficient"
            explanation = "Exceeded max tool calls limit"
        elif rounds == 0:
            score = 1.0
            label = "no_tools_needed"
            explanation = "Solved without tools"
        elif rounds <= 2:
            score = 0.8
            label = "efficient"
            explanation = f"Solved in {rounds} rounds"
        else:
            score = 0.5
            label = "acceptable"
            explanation = f"Required {rounds} rounds"

        self.client.annotations.create_annotation(
            example_id=example_id,
            name="tool_efficiency",
            annotator_kind="CODE",
            label=label,
            score=score,
            explanation=explanation
        )

    def annotate_token_budget(self, example_id: str, row: pd.Series) -> None:
        """Score token allocation health."""
        msg_pct = row.get("token_pct_messages", 0)
        sys_pct = row.get("token_pct_system_instructions", 0)
        tool_pct = row.get("token_pct_tool_definitions", 0)

        # Good: user content > 10%
        # Bad: overhead (system + tools) > 95%
        overhead_pct = sys_pct + tool_pct

        if msg_pct > 20:
            score = 1.0
            label = "healthy"
        elif msg_pct > 10:
            score = 0.7
            label = "acceptable"
        else:
            score = 0.3
            label = "constrained"

        self.client.annotations.create_annotation(
            example_id=example_id,
            name="token_budget_health",
            annotator_kind="CODE",
            label=label,
            score=score,
            explanation=f"User content: {msg_pct}%, overhead: {overhead_pct}%"
        )

    def annotate_response_completeness(self, example_id: str, row: pd.Series) -> None:
        """Score response completeness."""
        had_confirmation = row.get("had_confirmation_prompt", False)
        response_len = row.get("response_text_length", 0)
        thinking = row.get("thinking", "")

        if had_confirmation:
            score = 0.5
            label = "needs_followup"
            explanation = "Required user confirmation"
        elif response_len > 500 and thinking:
            score = 1.0
            label = "complete"
            explanation = "Detailed response with reasoning"
        elif response_len > 100:
            score = 0.8
            label = "sufficient"
            explanation = "Adequate response length"
        else:
            score = 0.3
            label = "incomplete"
            explanation = "Short response, may be incomplete"

        self.client.annotations.create_annotation(
            example_id=example_id,
            name="response_completeness",
            annotator_kind="CODE",
            label=label,
            score=score,
            explanation=explanation
        )
```

**Usage:**

```python
# After uploading dataset
client = Client()
annotator = CopilotAnnotator(client)
annotator.annotate_dataset("copilot-session-feb8")

# Now query with annotations
dataset = client.datasets.get_dataset("copilot-session-feb8")
examples_df = dataset.to_dataframe()

# Filter for high-quality examples
high_quality = examples_df[
    (examples_df["annotation.latency_score"] > 0.7) &
    (examples_df["annotation.tool_efficiency"] > 0.7) &
    (examples_df["annotation.response_completeness"] > 0.7)
]

print(f"High-quality examples: {len(high_quality)} / {len(examples_df)}")
```

---

## 8. Complete Automated Workflow

### End-to-End Pipeline

```python
# agent/observability/automated_pipeline.py
"""
Complete automated workflow: chat.json → parse → categorize → annotate → upload
"""

from pathlib import Path
from phoenix.client import Client
from agent.observability.copilot_chat_parser import parse_chat_json, upload_to_phoenix
from agent.observability.dataset_categorizer import categorize_examples
from agent.observability.auto_annotator import CopilotAnnotator
from agent.observability.prompt_extractor import upload_system_prompt_to_phoenix

def process_chat_json(
    chat_json_path: str,
    dataset_name: str,
    auto_annotate: bool = True,
    extract_prompt: bool = True,
) -> None:
    """Complete processing pipeline for a chat.json export."""

    print(f"\n{'=' * 60}")
    print(f"Processing: {chat_json_path}")
    print(f"Dataset: {dataset_name}")
    print(f"{'=' * 60}\n")

    # Step 1: Parse chat.json to DataFrame
    print("Step 1: Parsing chat.json...")
    df = parse_chat_json(chat_json_path)
    print(f"  → Parsed {len(df)} turns")

    # Step 2: Categorize examples
    print("\nStep 2: Categorizing examples...")
    df = categorize_examples(df)
    categories = {
        "task_type": df["category_task_type"].value_counts().to_dict(),
        "complexity": df["category_complexity"].value_counts().to_dict(),
        "outcome": df["category_outcome"].value_counts().to_dict(),
    }
    print(f"  → Task types: {categories['task_type']}")
    print(f"  → Complexity: {categories['complexity']}")
    print(f"  → Outcomes: {categories['outcome']}")

    # Step 3: Upload to Phoenix
    print("\nStep 3: Uploading to Phoenix...")
    dataset = upload_to_phoenix(df, dataset_name=dataset_name)
    print(f"  → Dataset '{dataset_name}' uploaded")

    # Step 4: Auto-annotate
    if auto_annotate:
        print("\nStep 4: Auto-annotating examples...")
        client = Client()
        annotator = CopilotAnnotator(client)
        annotator.annotate_dataset(dataset_name)
        print(f"  → Added 4 annotation types to all examples")

    # Step 5: Extract and version system prompt
    if extract_prompt:
        print("\nStep 5: Extracting system prompt...")
        upload_system_prompt_to_phoenix(
            chat_json_path=chat_json_path,
            prompt_name=f"{dataset_name}-system-prompt"
        )
        print(f"  → System prompt versioned in Phoenix")

    print(f"\n{'=' * 60}")
    print("✅ Processing complete!")
    print(f"{'=' * 60}\n")

# CLI
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python -m agent.observability.automated_pipeline <chat.json> [dataset_name]")
        sys.exit(1)

    chat_json_path = sys.argv[1]
    dataset_name = sys.argv[2] if len(sys.argv) > 2 else f"copilot-{int(time.time())}"

    process_chat_json(chat_json_path, dataset_name)
```

**Docker Compose Integration:**

```yaml
# docker-compose.phoenix.yml
services:
  # ... existing services ...

  chat-json-pipeline:
    build:
      context: .
      dockerfile: Dockerfile.copilot-proxy
    command: python -m agent.observability.automated_pipeline /data/chat.json copilot-auto
    volumes:
      - ./datasets:/data:ro
      - ./agent:/app/agent
    environment:
      - PHOENIX_ENDPOINT=http://phoenix:6006
    depends_on:
      phoenix:
        condition: service_healthy
```

**npm Script:**

```json
// package.json
{
  "scripts": {
    "copilot:process-chat": "python -m agent.observability.automated_pipeline datasets/chat.json",
    "copilot:process-chat:upload": "python -m agent.observability.automated_pipeline datasets/chat.json --upload --auto-annotate"
  }
}
```

---

## 9. Recommendations Summary

### Immediate Actions (This Week)

1. ✅ **Enhance `CopilotTelemetryEvent` model** with 23 missing fields
   - Priority: HIGH
   - Effort: 4 hours
   - Impact: Closes gap between real-time and batch data

2. ✅ **Test TZ Extension field availability**
   - Priority: HIGH
   - Effort: 2 hours
   - Impact: Identify which fields need fallback to batch

3. ✅ **Create automated pipeline script**
   - Priority: MEDIUM
   - Effort: 4 hours
   - Impact: Eliminates manual chat.json processing

4. ✅ **Document dual pipeline architecture**
   - Priority: MEDIUM
   - Effort: 2 hours
   - Impact: Team understanding of observability strategy

### Short-Term (This Month)

5. ⏸️ **Implement dataset categorization**
   - Priority: MEDIUM
   - Effort: 6 hours
   - Impact: Enables targeted analysis and filtering

6. ⏸️ **Build auto-annotation system**
   - Priority: MEDIUM
   - Effort: 8 hours
   - Impact: Automated quality scoring for all examples

7. ⏸️ **Extract & version system prompts**
   - Priority: LOW
   - Effort: 4 hours
   - Impact: Track prompt evolution over time

8. ⏸️ **Set up file watcher for chat.json**
   - Priority: LOW
   - Effort: 3 hours
   - Impact: Fully automated batch pipeline

### Long-Term (Next Quarter)

9. ⏸️ **Real-time/batch correlation queries**
   - Priority: LOW
   - Effort: 8 hours
   - Impact: Validate telemetry accuracy

10. ⏸️ **Phoenix dashboard templates**
    - Priority: LOW
    - Effort: 12 hours
    - Impact: Pre-built views for common analyses

11. ⏸️ **MCP server metrics**
    - Priority: LOW
    - Effort: 6 hours
    - Impact: Latency attribution for MCP tools

12. ⏸️ **Fine-tuning dataset export**
    - Priority: LOW
    - Effort: 4 hours
    - Impact: Direct chat.json → OpenAI fine-tuning format

---

## 10. Key Insights for Fine-Tuning

### Token Budget Implications

**Discovery**: System instructions (51%) + tool definitions (43%) = 94% overhead.

**Fine-Tuning Strategy**:

1. **Train models to internalize common instructions** (reduce system prompt size)
2. **Optimize tool schemas** (prune unused parameters, use references)
3. **Few-shot examples** should reflect this 94/6 distribution

### Thinking/CoT Data

**Discovery**: `thinking` field contains chain-of-thought reasoning.

**Fine-Tuning Strategy**:

1. Include `<thinking>...</thinking>` blocks in training data
2. Use thinking as intermediate supervision signal
3. Teach model when to expose thinking vs. hide it

### Tool Call Patterns

**Discovery**: Multi-round tool loops are common (ReAct pattern).

**Fine-Tuning Strategy**:

1. Train on **successful tool sequences** (2-3 rounds)
2. Negative examples: sessions with `max_tool_calls_exceeded`
3. Teach efficient tool selection (don't over-invoke)

### Response Composition

**Discovery**: Responses are multi-modal (text + code + edits).

**Fine-Tuning Strategy**:

1. Train on **structured outputs** (use response_kind_counts as label)
2. Teach when to generate inline code vs. file edits
3. Preference for complete responses over confirmations

---

## Conclusion

The `copilot_chat_parser.py` implementation unlocks **comprehensive analysis** of Copilot interactions by extracting 40 structured fields from VS Code's nested chat.json format. Key takeaways:

1. **Token breakdown** (51% system, 43% tools, 6% user) reveals optimization opportunities
2. **MCP tracking** provides visibility into external toolset integration
3. **Multi-round tool loops** show agentic reasoning patterns
4. **Response composition** (9 kinds) enables multi-modal eval frameworks
5. **Automated pipelines** can unify real-time traces with batch datasets

**Next Steps**: Enhance real-time telemetry model, build automated annotation system, extract system prompts for versioning.

**Impact**: Comprehensive observability for Copilot interactions, enabling research, fine-tuning, and continuous improvement.
