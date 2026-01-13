# Journal CLI Runner

Lightweight CLI tool for writing and reading journal entries with support for both local file writes and remote MCP server calls.

## Installation

```bash
# From repo root
cd scripts/journal
chmod +x journal-cli.py

# Optional: Install for remote mode
pip install requests
```

## Usage

### Write Entry (Local)

```bash
# Default location: ./.private-journal
python journal-cli.py write "Today I learned about embeddings"

# Custom path
python journal-cli.py write "Entry" --journal-path /custom/path
```

### Write Entry (Remote MCP Server)

```bash
# Call remote server
python journal-cli.py write "Entry" --remote http://localhost:8000

# Or use environment variable
export JOURNAL_REMOTE_URL=http://localhost:8000
python journal-cli.py write "Entry" --remote $JOURNAL_REMOTE_URL
```

### Read Latest Entry

```bash
python journal-cli.py read --last
```

### List Entries

```bash
# List all entries
python journal-cli.py list

# List entries for specific date
python journal-cli.py list --date 2026-01-07
```

## GitHub Actions Integration

```yaml
name: Journal Entry on Push

on:
  push:
    branches: [main]

jobs:
  journal:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Write journal entry
        run: |
          python scripts/journal/journal-cli.py write \
            "Deployment completed for commit ${{ github.sha }}" \
            --journal-path $GITHUB_WORKSPACE/.journal

      - name: Upload journal artifact
        uses: actions/upload-artifact@v4
        with:
          name: journal-entries
          path: .journal/
```

## Architecture

### Local Mode

```
journal-cli.py → journal_adapter.py → .private-journal/
                                        └── YYYY-MM-DD/
                                            └── HH-MM-SS-μμμμμμ.json
```

### Remote Mode

```
journal-cli.py → HTTP POST → MCP Server (FastAPI)
                                └── process_feelings tool
                                    └── .private-journal/
```

## Exit Codes

- `0`: Success
- `1`: Error (see stderr for details)

## Environment Variables

- `JOURNAL_PATH`: Default journal root directory
- `JOURNAL_REMOTE_URL`: Default remote MCP server URL

## Examples

### Quick Write

```bash
python journal-cli.py write "$(date): Successful test run"
```

### CI/CD Integration

```bash
# On build success
python journal-cli.py write "Build passed for ${CI_COMMIT_SHA}" || true

# On deployment
python journal-cli.py write "Deployed to ${ENVIRONMENT}" --remote ${JOURNAL_API_URL}
```

### Cron Job

```bash
# Daily summary
0 23 * * * cd /path/to/repo && python scripts/journal/journal-cli.py write "Daily summary: $(date)"
```

## Testing

```bash
# Write test entry
python journal-cli.py write "Test entry $(date +%s)"

# Verify it was written
python journal-cli.py read --last

# List all entries
python journal-cli.py list
```

## Troubleshooting

### Import Error

```
Error: Could not import journal_adapter
```

**Solution**: Run from repo root or set PYTHONPATH:

```bash
export PYTHONPATH=/workspaces/modme-ui-01/agent:$PYTHONPATH
python scripts/journal/journal-cli.py write "Test"
```

### Remote Connection Error

```
✗ Error: Remote call failed: Connection refused
```

**Solution**: Ensure MCP server is running:

```bash
# Start agent
cd /workspaces/modme-ui-01
npm run dev:agent

# Then try remote write
python scripts/journal/journal-cli.py write "Test" --remote http://localhost:8000
```

## Related Files

- `agent/tools/journal_adapter.py` - Core journal writing logic
- `external/private-journal-mcp/` - Original MCP server reference
- `scripts/knowledge-management/embeddings/` - Embedding integration for search
