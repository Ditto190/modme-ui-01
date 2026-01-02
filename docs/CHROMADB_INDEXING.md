# ChromaDB Code Indexing Guide

> **Complete guide to semantic code indexing with ChromaDB and Google Gemini embeddings**

**Workflow**: [.github/workflows/build-code-index.yml](../.github/workflows/build-code-index.yml)  
**Scripts**: [scripts/ingest_chunks.py](../scripts/ingest_chunks.py), [scripts/start_chroma_server.py](../scripts/start_chroma_server.py)  
**Last Updated**: 2026-01-03

---

## Overview

The code indexing system creates two ChromaDB configurations:

| Part | Purpose | Lifecycle | Location |
|------|---------|-----------|----------|
| **Part A** | Session ChromaDB (HTTP server) | Ephemeral, terminates with codespace | Port 8001 |
| **Part B** | Memory Artifact (persistent) | Downloadable, portable | `./chroma_data/` |

Both use **Google Gemini embeddings** (`gemini-embedding-001`) with configurable dimensions.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Actions Workflow                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │ Job 1:       │    │ Job 2:          │    │ Job 3:          │ │
│  │ Chunk        │───▶│ Session Index   │    │ Memory Artifact │ │
│  │ Codebase     │    │ (HTTP ChromaDB) │    │ (Persistent)    │ │
│  └──────────────┘    └─────────────────┘    └─────────────────┘ │
│         │                    │                      │           │
│         ▼                    ▼                      ▼           │
│  ┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │ Artifact:    │    │ Artifact:       │    │ Artifact:       │ │
│  │ code-chunks  │    │ session-metadata│    │ chromadb-memory │ │
│  │ (JSONL)      │    │ (connection)    │    │ (portable DB)   │ │
│  └──────────────┘    └─────────────────┘    └─────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Workflow Triggers

### Automatic Triggers

| Trigger | Condition |
|---------|-----------|
| **Push** | Branches: `main`, `feature/**` |
| **Paths** | `src/**`, `agent/**`, `scripts/**`, `*.py`, `*.ts`, `*.tsx` |
| **Schedule** | Daily at 2:00 AM UTC |

### Manual Dispatch

```bash
# Via GitHub CLI
gh workflow run build-code-index.yml \
  -f full_reindex=true \
  -f chroma_mode=http \
  -f embedding_dim=768
```

### Dispatch Options

| Option | Default | Values | Description |
|--------|---------|--------|-------------|
| `full_reindex` | `false` | `true`/`false` | Ignore cache, rebuild all |
| `chroma_mode` | `http` | `http`, `persistent`, `ephemeral` | ChromaDB mode |
| `embedding_dim` | `768` | `768`, `1536`, `3072` | Embedding dimensions |

---

## Collections Created

### Part A: Session Collections (HTTP)

```
session_{run_id}_code_index        # Semantic code search
session_{run_id}_agent_interactions # Agent queries/responses
session_{run_id}_observability_metrics # Performance data
session_{run_id}_mcp_server_logs   # MCP tool executions
session_{run_id}_sandbox_executions # Code sandbox results
```

### Part B: Memory Collections (Persistent)

```
memory_code_index      # Semantic code search
memory_environment_state # Environment configuration
memory_agent_context   # Agent interaction history
memory_tool_outputs    # Tool execution cache
```

---

## Local Development

### Start ChromaDB Server

```bash
# Using Python script
python scripts/start_chroma_server.py --port 8001

# Or using Docker
docker run -p 8001:8000 chromadb/chroma:latest
```

### Run Ingestion Manually

```bash
# Install dependencies
pip install chromadb google-generativeai pykomodo

# Chunk codebase
pykomodo chunk \
  --input-dir . \
  --output-dir output_chunks \
  --extensions py,ts,tsx,js,jsx,json,md,yaml,yml \
  --exclude "node_modules,dist,.next,__pycache__,.git" \
  --max-chunk-size 1500 \
  --overlap 200 \
  --format jsonl

# Ingest to HTTP server
python scripts/ingest_chunks.py \
  --mode http \
  --host localhost \
  --port 8001 \
  --chunks-file output_chunks/chunks.jsonl \
  --collection-prefix "dev_" \
  --create-collections code_index,agent_context \
  --embedding-dim 768

# Ingest to persistent database
python scripts/ingest_chunks.py \
  --mode persistent \
  --persist-dir ./chroma_data \
  --chunks-file output_chunks/chunks.jsonl \
  --create-collections code_index \
  --embedding-dim 768
```

---

## Python API Usage

### Connect to Session ChromaDB (Part A)

```python
import chromadb

# During workflow or local development
client = chromadb.HttpClient(host="localhost", port=8001)

# List collections
collections = client.list_collections()
print([c.name for c in collections])

# Query code index
collection = client.get_collection("session_123456_code_index")
results = collection.query(
    query_texts=["How does the agent handle state?"],
    n_results=5
)

for doc, metadata in zip(results["documents"][0], results["metadatas"][0]):
    print(f"File: {metadata.get('file_path')}")
    print(f"Content: {doc[:200]}...")
    print("---")
```

### Load Memory Artifact (Part B)

```python
import chromadb

# Load from downloaded artifact
client = chromadb.PersistentClient(path="./chroma_data")

# Get code index
collection = client.get_collection("memory_code_index")

# Semantic search
results = collection.query(
    query_texts=["upsert_ui_element function"],
    n_results=3,
    include=["documents", "metadatas", "distances"]
)

# Access results
for i, doc in enumerate(results["documents"][0]):
    metadata = results["metadatas"][0][i]
    distance = results["distances"][0][i]
    print(f"Match {i+1} (distance: {distance:.4f})")
    print(f"  File: {metadata.get('file_path')}")
    print(f"  Lines: {metadata.get('start_line')}-{metadata.get('end_line')}")
```

---

## Embedding Configuration

### Google Gemini Embeddings

| Dimension | Use Case | Quality |
|-----------|----------|---------|
| **768** | Standard semantic search | Good |
| **1536** | Higher fidelity matching | Better |
| **3072** | Maximum precision | Best |

### Task Types

| Task Type | When to Use |
|-----------|-------------|
| `RETRIEVAL_DOCUMENT` | Indexing documents |
| `RETRIEVAL_QUERY` | Search queries |
| `SEMANTIC_SIMILARITY` | Comparing text similarity |
| `CLASSIFICATION` | Classification tasks |
| `CLUSTERING` | Clustering applications |

### Example with Task Type

```python
from scripts.ingest_chunks import embed_texts

# For indexing
doc_embeddings = embed_texts(
    texts=["def upsert_ui_element(...): ..."],
    task_type="RETRIEVAL_DOCUMENT"
)

# For queries
query_embeddings = embed_texts(
    texts=["How to add a UI element?"],
    task_type="RETRIEVAL_QUERY"
)
```

---

## Downloading Artifacts

### Via GitHub CLI

```bash
# List workflow runs
gh run list --workflow=build-code-index.yml

# Download specific artifact
gh run download <run_id> -n chromadb-memory-<sha>

# Download all artifacts from latest run
gh run download --pattern "*-$(git rev-parse HEAD)"
```

### Via GitHub Actions UI

1. Go to **Actions** tab
2. Click on **Build Code Index** workflow
3. Select successful run
4. Download from **Artifacts** section

---

## Integration with MCP Tools

### Chroma MCP Server

```json
// .vscode/mcp.json
{
  "mcpServers": {
    "chroma-core": {
      "command": "uvx",
      "args": ["mcp-server-chroma-core"],
      "env": {
        "CHROMA_HOST": "localhost",
        "CHROMA_PORT": "8001"
      }
    }
  }
}
```

### Using Chroma Tools

```python
# Available MCP tools
mcp_chroma-core_c_chroma_list_collections()  # List all collections
mcp_chroma-core_c_chroma_create_collection(  # Create new collection
    collection_name="my_collection",
    embedding_function_name="default"
)
```

---

## Artifact Retention

| Artifact | Retention | Purpose |
|----------|-----------|---------|
| `code-chunks-*` | 7 days | Raw chunks for debugging |
| `session-metadata-*` | 7 days | Connection info |
| `chromadb-memory-*` | 30 days | Portable database |

---

## Porting to New Repo

### Files to Copy

```bash
# Workflow
.github/workflows/build-code-index.yml

# Scripts
scripts/ingest_chunks.py
scripts/start_chroma_server.py

# Dependencies (add to requirements.txt)
chromadb
google-generativeai
pykomodo
python-dotenv
```

### Configuration Changes

1. **Update paths** in workflow for new repo structure
2. **Set `GOOGLE_API_KEY`** in repository secrets
3. **Adjust file extensions** in pykomodo chunk command
4. **Modify collection prefixes** as needed

### Example Path Update

```yaml
# Before (modme-ui-01)
paths:
  - 'src/**'
  - 'agent/**'
  - 'scripts/**'

# After (new monorepo)
paths:
  - 'apps/**'
  - 'packages/**'
  - '*.py'
  - '*.ts'
```

---

## Troubleshooting

### ChromaDB Server Not Starting

```bash
# Check if port is in use
lsof -i :8001

# Kill existing process
kill -9 $(lsof -t -i:8001)

# Restart
python scripts/start_chroma_server.py --port 8001
```

### Embedding Errors

```bash
# Verify API key
echo $GOOGLE_API_KEY

# Test embeddings
python scripts/test_gemini_embeddings.py
```

### Missing Chunks

```bash
# Check pykomodo output
ls -la output_chunks/

# Verify chunk format
head -1 output_chunks/chunks.jsonl | python -m json.tool
```

### Collection Not Found

```bash
# List all collections
curl http://localhost:8001/api/v2/collections

# Create missing collection
python -c "
import chromadb
client = chromadb.HttpClient(host='localhost', port=8001)
client.create_collection('my_collection')
"
```

---

## Performance Tuning

### Chunking Parameters

| Parameter | Default | Tuning Tips |
|-----------|---------|-------------|
| `max-chunk-size` | 1500 | Larger = fewer chunks, less granular |
| `overlap` | 200 | Higher = better context, more storage |

### Embedding Batch Size

```python
# For large codebases, process in batches
BATCH_SIZE = 100  # Adjust based on API limits

for i in range(0, len(chunks), BATCH_SIZE):
    batch = chunks[i:i+BATCH_SIZE]
    embeddings = embed_texts([c["content"] for c in batch])
    collection.add(
        documents=[c["content"] for c in batch],
        embeddings=embeddings,
        ids=[c["id"] for c in batch]
    )
```

---

## Related Documentation

- **BOOTSTRAP_GUIDE.md**: Phase 4 includes ChromaDB workflow porting
- **COMPONENT_MANIFEST.json**: `chromadb_indexing` component details
- **.github/copilot-instructions.md**: ChromaDB integration section

---

## Secrets Required

| Secret | Purpose | How to Set |
|--------|---------|------------|
| `GOOGLE_API_KEY` | Gemini embeddings | Settings → Secrets → Actions → New |

---

*Generated for modme-ui-01 porting infrastructure*
