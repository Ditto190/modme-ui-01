# Upload Copilot Chat to Phoenix - Complete Guide

## Overview

This script provides **full automation** for uploading Copilot chat data to Phoenix observability platform. It integrates with the existing `copilot_chat_parser` to parse VS Code chat.json files and upload them in batches.

## Features

✅ **Full chat.json parsing** - Processes entire conversation history (not samples)
✅ **Batch uploads** - Configurable batch sizes for efficient processing
✅ **Phoenix client integration** - Uses Phoenix Python client for direct uploads
✅ **Complete metadata** - Preserves all 40+ columns including tokens, tools, timing
✅ **Dry-run mode** - Preview data before uploading
✅ **Error handling** - Graceful failures with detailed logging

## Installation

Ensure dependencies are installed:

```bash
pip install arize-phoenix-client pandas
```

## Usage

### Upload Full Chat History

```bash
# Upload all turns from chat.json
python scripts/upload_to_phoenix.py datasets/chat.json

# Custom dataset name
python scripts/upload_to_phoenix.py datasets/chat.json --dataset my-copilot-session

# Custom batch size (default: 50)
python scripts/upload_to_phoenix.py datasets/chat.json --batch-size 25
```

### Dry Run (Preview Only)

```bash
# Preview what will be uploaded without actually uploading
python scripts/upload_to_phoenix.py datasets/chat.json --dry-run

# Preview first 5 examples
python scripts/upload_to_phoenix.py datasets/chat.json --dry-run --max-examples 5
```

### Testing with Samples

```bash
# Upload only first 10 examples for testing
python scripts/upload_to_phoenix.py datasets/chat.json --max-examples 10 --dataset copilot-test
```

### Custom Phoenix Endpoint

```bash
# Use custom Phoenix server
python scripts/upload_to_phoenix.py datasets/chat.json --phoenix-endpoint http://my-phoenix:6006
```

## Important Notes on Dataset Creation

### Phoenix Dataset Behavior

Phoenix's `create_dataset` API creates **new datasets** or **new versions** of datasets. When a dataset name already exists:

- ✅ **For NEW dataset names**: Creates the dataset successfully
- ❌ **For EXISTING dataset names**: Returns 409 Conflict error

### Two Approaches for Existing Datasets

#### Option 1: Create Versioned Dataset Names

Use unique names for each upload session:

```bash
# Add timestamp or version to dataset name
python scripts/upload_to_phoenix.py datasets/chat.json --dataset copilot-research-v2
python scripts/upload_to_phoenix.py datasets/chat.json --dataset copilot-research-$(date +%Y%m%d)
```

#### Option 2: Use MCP Tools (Recommended for Incremental Updates)

For adding examples to _existing_ datasets, use the MCP tool approach from AI agent:

```python
# Via MCP tool (from AI agent/Claude Code)
mcp_phoenix_add-dataset-examples(
    datasetName="copilot-research",
    examples=[{
        "input": {"user_message": "..."},
        "output": {"assistant_response": "...", "thinking": "..."},
        "metadata": {...}
    }]
)
```

This is the **correct method** for appending to existing datasets incrementally.

## Output Format

The script converts chat turns into Phoenix examples with this structure:

```python
{
    "input": {
        "user_message": "The user's question or prompt"
    },
    "output": {
        "assistant_response": "The assistant's response",
        "thinking": "Chain-of-thought reasoning (if any)"
    },
    "metadata": {
        # Identity
        "request_id": "...",
        "model_id": "copilot/claude-sonnet-4.5",
        "session_id": "...",

        # Tokens & Performance
        "prompt_tokens": 58214,
        "completion_tokens": 1234,
        "latency_first_progress_ms": 1234,
        "latency_total_ms": 5678,

        # Tools & MCP
        "tools_available": "readFile, searchFiles, ...",
        "tools_invoked": "readFile (Built-In), ...",
        "mcp_servers_started": "github, ...",
        "mcp_tools_available": "github/get_repo, ...",

        # And 30+ more fields...
    }
}
```

## Examples

### Complete Workflow

```bash
# 1. Parse and preview
python scripts/upload_to_phoenix.py datasets/chat.json --dry-run

# 2. Test with small sample
python scripts/upload_to_phoenix.py datasets/chat.json --max-examples 5 --dataset copilot-test

# 3. Upload full dataset
python scripts/upload_to_phoenix.py datasets/chat.json --dataset copilot-session-20260208

# 4. View in Phoenix UI
# Navigate to http://localhost:6006/datasets
```

### Output Example

```
2026-02-08 13:42:28,645 - __main__ - INFO - Parsing datasets\chat.json...
2026-02-08 13:42:28,645 - __main__ - INFO - Parsed 10 turns
2026-02-08 13:42:28,645 - __main__ - INFO - Created 10 Phoenix examples

First example preview:
  Input: user_message = Read the conversation at this link...
  Output: assistant_response = I'll fetch the content from that...
  Metadata: model_id = copilot/claude-sonnet-4.5
  Metadata: prompt_tokens = 58214.0

Initializing Phoenix client...
Connected to Phoenix at http://localhost:6006

Uploading 10 examples in batches of 10...

Batch 1/1: Uploading 10 examples...
✅ Batch 1 uploaded successfully (Total: 10/10)

============================================================
UPLOAD SUMMARY
============================================================
Total examples: 10
Successfully uploaded: 10
Failed: 0
Dataset: copilot-session-20260208
============================================================
```

## Troubleshooting

### "Dataset with the same name already exists"

**Solution**: Use a unique dataset name with version or timestamp:

```bash
python scripts/upload_to_phoenix.py datasets/chat.json --dataset copilot-research-v2
```

### "Phoenix client not found"

**Solution**: Install the Phoenix client:

```bash
pip install arize-phoenix-client
```

### "pandas not found"

**Solution**: Install pandas:

```bash
pip install pandas
```

### Connection errors

**Solution**: Ensure Phoenix is running:

```bash
docker-compose up phoenix
# Or check: http://localhost:6006
```

## Related Scripts

- **copilot_chat_parser.py**: Core parser used by this script
- **prepare_all_examples.py**: Original CSV-based approach (deprecated)
- **upload_chat_to_phoenix.py**: Earlier implementation (superseded by this script)

## Architecture

```
chat.json (VS Code export)
    ↓
copilot_chat_parser.parse_chat_json()
    ↓
DataFrame (40+ columns)
    ↓
dataframe_to_phoenix_examples()
    ↓
Phoenix examples (input/output/metadata)
    ↓
Phoenix Client upload (batches)
    ↓
Phoenix UI (http://localhost:6006)
```

## Command Reference

```bash
# Full syntax
python scripts/upload_to_phoenix.py INPUT_FILE [OPTIONS]

# Required
INPUT_FILE                Path to chat.json file

# Options
--dataset NAME            Dataset name (default: copilot-research)
--batch-size N            Examples per batch (default: 50)
--dry-run                 Preview without uploading
--max-examples N          Limit number of examples
--phoenix-endpoint URL    Phoenix server URL
--include-empty           Include turns with empty messages

# Examples
python scripts/upload_to_phoenix.py datasets/chat.json
python scripts/upload_to_phoenix.py datasets/chat.json --dry-run
python scripts/upload_to_phoenix.py datasets/chat.json --max-examples 10
python scripts/upload_to_phoenix.py datasets/chat.json --dataset my-session
python scripts/upload_to_phoenix.py datasets/chat.json --batch-size 25
```

## See Also

- [Phoenix Documentation](https://docs.arize.com/phoenix)
- [Copilot Chat Parser](../agent/observability/copilot_chat_parser.py)
- [Phoenix Datasets Guide](https://docs.arize.com/phoenix/datasets-and-experiments)
