# Journal MCP Server

FastMCP-based Model Context Protocol server for managing journal entries with semantic search.

## Overview

The Journal MCP server exposes journal management capabilities through three main tools:

- `journal_add` - Create new journal entries
- `journal_list` - List recent entries
- `journal_search` - Search entries by semantic similarity

## Architecture

```
┌──────────────────────────────────────┐
│   MCP Client (Claude, AI Agent)      │
└─────────────┬────────────────────────┘
              │ MCP Protocol
              │ (HTTP+SSE or stdio)
              ▼
┌──────────────────────────────────────┐
│   journal_mcp_server.py (FastMCP)    │
│   ┌────────────────────────────┐     │
│   │  Tools:                    │     │
│   │  - journal_add             │     │
│   │  - journal_list            │     │
│   │  - journal_search          │     │
│   └────────────────────────────┘     │
│   ┌────────────────────────────┐     │
│   │  Resources:                │     │
│   │  - journal://stats         │     │
│   └────────────────────────────┘     │
└─────────────┬────────────────────────┘
              │
              ▼
┌──────────────────────────────────────┐
│   skills_ref/journal.py              │
│   (Journal storage + search logic)   │
└─────────────┬────────────────────────┘
              │
              ▼
┌──────────────────────────────────────┐
│   agent_data/journal.jsonl           │
│   (JSONL storage with embeddings)    │
└──────────────────────────────────────┘
```

## Installation

### Prerequisites

```bash
pip install fastmcp
```

### Directory Structure

```
agent/
├── journal_mcp_server.py       # MCP server wrapper
├── skills_ref/
│   ├── journal.py              # Core journal logic
│   ├── journal_cli.py          # CLI interface
│   ├── embeddings.py           # Embedding shim (SHA256-based)
│   └── skill_creator.py        # Skill scaffolding helper
└── agent_data/
    └── journal.jsonl           # Journal storage (auto-created)
```

## Usage

### Start as HTTP+SSE Server (Recommended)

```bash
cd agent
python journal_mcp_server.py
```

Server starts on `http://localhost:8001` with SSE streaming support.

### Start as stdio Server (for local MCP clients)

```bash
python journal_mcp_server.py --transport stdio
```

### Connect from Claude Desktop

Add to `mcp.json`:

```json
{
  "mcpServers": {
    "journal": {
      "command": "python",
      "args": [
        "C:\\Users\\dylan\\.claude-worktrees\\modme-ui-01\\relaxed-hugle\\agent\\journal_mcp_server.py",
        "--transport",
        "stdio"
      ]
    }
  }
}
```

### Connect from Python Agent Framework

```python
from agent_framework import ChatAgent, MCPStreamableHTTPTool
from agent_framework.openai import OpenAIChatClient
from openai import AsyncOpenAI

# Create MCP tool connection
journal_mcp = MCPStreamableHTTPTool(
    name="Journal MCP",
    description="Journal management with semantic search",
    url="http://localhost:8001",
)

# Create agent with journal tools
async with ChatAgent(
    chat_client=OpenAIChatClient(
        async_client=AsyncOpenAI(
            base_url="https://models.github.ai/inference",
            api_key="<GITHUB_TOKEN>",
        ),
        model_id="gpt-4o",
    ),
    name="JournalAgent",
    instructions="You are a helpful assistant with journal management capabilities.",
    tools=[journal_mcp],
) as agent:
    thread = agent.get_new_thread()
    async for chunk in agent.run_stream(
        "Add a journal entry: Met with client about Q1 roadmap. Tags: meetings, planning",
        thread=thread
    ):
        if chunk.text:
            print(chunk.text, end="")
```

## Tools Reference

### journal_add

**Description**: Add a new entry to the journal.

**Parameters**:

- `text` (string, required): The entry text content
- `tags` (string, optional): Comma-separated tags

**Returns**:

```json
{
  "status": "success",
  "id": "uuid-string",
  "timestamp": "2025-01-08T12:34:56.789Z",
  "message": "Entry added with id ..."
}
```

**Example**:

```
User: Add a journal entry about today's standup meeting. Tags: standup, team
Agent: [calls journal_add with text="..." and tags="standup,team"]
```

### journal_list

**Description**: List recent journal entries.

**Parameters**:

- `limit` (integer, optional, default=10): Maximum number of entries to return

**Returns**:

```json
{
  "status": "success",
  "count": 5,
  "total": 50,
  "entries": [
    {
      "id": "uuid",
      "timestamp": "2025-01-08T...",
      "text": "Entry text...",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

### journal_search

**Description**: Search journal entries by semantic similarity.

**Parameters**:

- `query` (string, required): Search query text
- `limit` (integer, optional, default=5): Maximum number of results

**Returns**:

```json
{
  "status": "success",
  "query": "search query",
  "count": 3,
  "results": [
    {
      "id": "uuid",
      "timestamp": "2025-01-08T...",
      "text": "Matching entry...",
      "tags": ["tag"]
    }
  ]
}
```

**Example**:

```
User: Search my journal for entries about client meetings
Agent: [calls journal_search with query="client meetings"]
```

## Resources Reference

### journal://stats

**Description**: Provides statistics about the journal database.

**Returns**:

```json
{
  "total_entries": 42,
  "tag_counts": {
    "meetings": 12,
    "planning": 8,
    "standup": 15
  },
  "storage_path": "/path/to/journal.jsonl"
}
```

## CLI Interface

For direct command-line access (bypassing MCP):

```bash
# Add entry
python -m agent.skills_ref.journal_cli add "My note" --tags tag1,tag2

# List entries
python -m agent.skills_ref.journal_cli list

# Search
python -m agent.skills_ref.journal_cli search "keyword"
```

## Embedding System

Currently uses a **deterministic SHA256-based pseudo-embedding** (no API tokens required). This provides:

- ✅ Fast, offline operation
- ✅ Deterministic results (same text → same embedding)
- ⚠️ Basic similarity matching (XOR distance, not semantic)

### Upgrade to Real Embeddings

The system is designed to easily swap in real embeddings:

1. **Option A: Use genai-toolbox** (now cloned in `agent/genai-toolbox/`)

   - Provides offline embedding models
   - No API tokens needed
   - Better semantic similarity

2. **Option B: OpenAI/Gemini Embeddings**

   - Modify `skills_ref/embeddings.py`:

   ```python
   import openai

   def embed_text(text: str) -> str:
       response = openai.Embedding.create(
           model="text-embedding-3-small",
           input=text
       )
       embedding = response['data'][0]['embedding']
       # Convert to hex for storage
       return json.dumps(embedding)
   ```

3. **Option C: Sentence Transformers** (local, no tokens)

   ```bash
   pip install sentence-transformers
   ```

   ```python
   from sentence_transformers import SentenceTransformer

   model = SentenceTransformer('all-MiniLM-L6-v2')

   def embed_text(text: str) -> str:
       embedding = model.encode(text)
       return json.dumps(embedding.tolist())
   ```

## Integrating with Main Agent

To integrate journal tools into `agent/main.py`:

```python
# agent/main.py
from fastmcp import FastMCP
from skills_ref.journal import Journal
from pathlib import Path

# ... existing code ...

JOURNAL_PATH = Path(__file__).parent / "agent_data" / "journal.jsonl"

@mcp.tool()
def journal_add(text: str, tags: str = "") -> dict:
    """Add journal entry via main agent."""
    journal = Journal(JOURNAL_PATH)
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    entry = journal.add(text, tags=tag_list)
    return {"status": "success", "id": entry["id"]}

# Add to workbench_agent.tools list
```

## Toolset Registration

Already registered in `agent/toolsets.json`:

```json
{
  "id": "journal",
  "name": "Journal Management",
  "description": "Create, list, and search journal entries with semantic indexing",
  "default": false,
  "tools": ["journal_add", "journal_list", "journal_search"]
}
```

## Testing

### Manual Testing

```bash
# 1. Start server
python agent/journal_mcp_server.py

# 2. In another terminal, test with curl
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "journal_add",
      "arguments": {
        "text": "Test entry",
        "tags": "test"
      }
    },
    "id": 1
  }'
```

### Integration Testing

See `agent-generator/src/skills/mcp-builder/scripts/evaluation.py` for MCP server evaluation patterns.

## Future Enhancements

- [ ] Replace SHA256 embeddings with real semantic embeddings (genai-toolbox or sentence-transformers)
- [ ] Add tag filtering to `journal_list`
- [ ] Add date range filtering
- [ ] Export to markdown/PDF
- [ ] Batch operations (add multiple entries)
- [ ] Import from existing note systems
- [ ] Integration with smallest-agent for lightweight workflows

## Related Files

- **MCP Builder Skill**: `agent-generator/src/skills/mcp-builder/SKILL.md`
- **Main Agent**: `agent/main.py`
- **Toolsets Registry**: `agent/toolsets.json`
- **genai-toolbox**: `agent/genai-toolbox/` (offline embeddings)
- **smallest-agent**: `agent/smallest-agent/` (tiny agent reference)

## Troubleshooting

### Import Errors

Ensure you're in the correct directory:

```bash
cd c:\Users\dylan\.claude-worktrees\modme-ui-01\relaxed-hugle
python agent/journal_mcp_server.py
```

### Port Already in Use

Change the port:

```python
mcp.run(transport="sse", port=8002)  # Use 8002 instead
```

### Empty Search Results

The default SHA256 embeddings only match exact text. For semantic search, upgrade to real embeddings (see above).

---

**Created**: 2025-01-08  
**Tech Stack**: Python 3.12+, FastMCP, genai-toolbox (optional)  
**License**: MIT
