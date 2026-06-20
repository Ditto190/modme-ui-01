# Token Management for GitLens & AI Tools

This directory contains tools for managing large token counts in your workspace, preventing GitLens/Copilot from hitting context limits.

## Problem

GitLens warning: **127,000 tokens** with threshold set at **20,000**

- 127k tokens ≈ 95k words ≈ 500k characters (roughly a small book)
- 6× larger than threshold → causes warnings, slow AI responses, or denial of service
- Main culprits: `node_modules`, `.next`, `.venv`, lock files, auto-generated docs

## Solution Files

### 1. `.gitlensignore` (Root Directory)

Comprehensive ignore file specifically for GitLens AI indexing:

```bash
# View what's excluded
cat .gitlensignore

# Main exclusions:
# - node_modules, .next, build/, dist/
# - .venv, __pycache__, *.pyc
# - chroma_data/, output_chunks/, data/
# - Lock files (package-lock.json, uv.lock, etc.)
# - Auto-generated summaries (*_SUMMARY.md)
# - Logs (*.log)
```

### 2. `.gitignore` (Root Directory) - Enhanced

Updated with additional exclusions for:

- ChromaDB vector storage (`chroma_data/`, `output_chunks/`)
- Memory artifacts (`.vault/`, `.logs/`, `.memory/`, `*.db`)
- Auto-generated documentation (`*_SUMMARY.md`, `SESSION_SUMMARY_*.md`)
- Test outputs (`test-mcp-validation/`)

### 3. `scripts/audit-tokens.py` (This Directory)

Python script to scan your repo and identify token-heavy files.

**Usage:**

```bash
# Install dependency
pip install tiktoken

# Basic scan (top 50 files)
python scripts/audit-tokens.py

# Show top 20 files only
python scripts/audit-tokens.py --top 20

# Scan specific directory
python scripts/audit-tokens.py --dir src/

# Only show files above 5000 tokens
python scripts/audit-tokens.py --threshold 5000
```

**Sample Output:**

```
Scanning c:\Users\dylan\.claude-worktrees\modme-ui-01\relaxed-hugle...

Tokens     File
---------- ----------------------------------------------------------------------
15.2k      CODEBASE_INDEX.md
12.8k      CLAUDE.md
8.5k       docs/TOOLSET_MANAGEMENT.md
7.3k       Project_Overview.md
5.2k       CONTRIBUTING.md
...

--------------------------------------------------------------------------------
Total tokens in top 30 files: 185.4k (185,432)

Files excluded: node_modules, .venv, .git, build outputs, lock files, .logs, data/

To reduce GitLens token count:
  1. Ensure .gitlensignore exists (created by this script)
  2. Restart VS Code to apply changes
  3. Check GitLens settings → 'Gitlens: Excluded' patterns
  4. Consider increasing threshold: GitLens → Advanced → Token Limit
```

## How It Works

### GitLens Token Indexing

GitLens scans your workspace to provide AI-powered features like:

- Commit explanations
- Code suggestions
- Blame annotations with AI context

When scanning exceeds the token limit, you get warnings or degraded performance.

### `.gitlensignore` Behavior

- **Same syntax as `.gitignore`**: Glob patterns, negation with `!`, comments with `#`
- **GitLens-specific**: Only affects GitLens indexing, not Git operations
- **Applied on VS Code restart**: Changes take effect after reloading window

### Token Counting

Uses `tiktoken` with `cl100k_base` encoding (same as OpenAI GPT-3.5/4):

- 1 token ≈ 4 characters (English)
- 1 token ≈ 0.75 words on average

## Quick Fix Steps

1. **Ensure ignore files exist** (already created):

   ```bash
   # Check if files exist
   ls -la .gitlensignore .gitignore
   ```

2. **Restart VS Code**:

   ```
   Ctrl+Shift+P → "Developer: Reload Window"
   ```

3. **Verify exclusions in GitLens settings**:

   ```
   Ctrl+, → Search "GitLens: Excluded"
   ```

4. **Run token audit** (optional):

   ```bash
   python scripts/audit-tokens.py --top 30
   ```

5. **If still over limit**, manually add more patterns to `.gitlensignore`:

   ```gitignore
   # Example: Exclude specific large files
   CODEBASE_INDEX.md
   Project_Overview.md

   # Example: Exclude specific directories
   docs/toolsets/
   agent-generator/output/
   ```

## Advanced Strategies

### 1. Chunking & Summarization

For large markdown files that must be indexed:

```python
# scripts/summarize-docs.py (create if needed)
import tiktoken

def chunk_file(file_path, max_tokens=10000):
    enc = tiktoken.get_encoding("cl100k_base")
    with open(file_path, 'r') as f:
        text = f.read()

    tokens = enc.encode(text)
    chunks = [tokens[i:i+max_tokens] for i in range(0, len(tokens), max_tokens)]

    return [enc.decode(chunk) for chunk in chunks]
```

### 2. RAG Integration (Recommended)

For consultation with large docs, use ChromaDB indexing:

```bash
# Index large files into ChromaDB instead of sending raw
python scripts/ingest_chunks.py \
  --mode persistent \
  --persist-dir ./chroma_data \
  --chunks-file docs/
```

Then query via retrieval instead of full-text context.

### 3. GitLens Settings Tuning

**VS Code Settings** (`Ctrl+,`):

```json
{
  "gitlens.ai.experimental.provider": "openai",
  "gitlens.ai.experimental.model": "gpt-4-turbo",
  "gitlens.advanced.maxSearchItems": 100,
  "gitlens.advanced.similarityThreshold": 50,
  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/.venv": true,
    "**/chroma_data": true,
    "**/*.log": true
  }
}
```

### 4. Provider Selection

If on GitLens free trial with 20k limit:

- **Option A**: Upgrade plan for higher limits
- **Option B**: Use local models (Ollama) to bypass cloud limits
- **Option C**: Switch AI provider to one with larger context (Gemini 1.5 Pro = 2M tokens)

## Monitoring & Maintenance

### Check Current Token Count

No built-in command, but you can estimate:

```bash
# Run audit script
python scripts/audit-tokens.py --threshold 1000

# Compare with threshold (20k)
# If total > 20k, add more exclusions
```

### Periodic Audits

Add to your workflow:

```bash
# Weekly audit
npm run audit:tokens  # (add to package.json if needed)

# Before major commits
git status | xargs -I {} python scripts/audit-tokens.py --dir {}
```

### Update Ignore Patterns

When adding new large directories:

1. Run token audit to identify new heavy contributors
2. Add to `.gitlensignore`:

   ```gitignore
   # New large directory
   new-feature-output/
   ```

3. Restart VS Code

## Troubleshooting

### Issue: Still getting token warnings after adding `.gitlensignore`

**Solution:**

1. Verify file is in workspace root (not subdirectory)
2. Check file encoding (must be UTF-8)
3. Restart VS Code: `Ctrl+Shift+P → "Developer: Reload Window"`
4. Clear GitLens cache: `Ctrl+Shift+P → "GitLens: Clear Cache"`

### Issue: Audit script fails with "tiktoken not installed"

**Solution:**

```bash
pip install tiktoken
# or
python -m pip install tiktoken
```

### Issue: Audit script shows 0 tokens for all files

**Solution:**

- Ensure you're running in the correct directory
- Check file permissions (script needs read access)
- Try with `--dir` flag: `python scripts/audit-tokens.py --dir .`

### Issue: GitLens still indexes ignored files

**Solution:**

- GitLens may cache indexed files
- Clear cache: `Ctrl+Shift+P → "GitLens: Clear Cache"`
- Force reload: `Ctrl+Shift+P → "Developer: Reload Window"`
- Check settings: `Ctrl+, → "GitLens: Excluded"`

## Related Documentation

- **GitLens Documentation**: <https://gitlens.amod.io/>
- **GitKraken AI**: <https://www.gitkraken.com/ai>
- **OpenTelemetry Tracing**: Use for monitoring AI tool token usage
- **AI Toolkit Best Practices**: [../.aitk/instructions/tools.instructions.md](../.aitk/instructions/tools.instructions.md)

## Support

For issues:

1. Run token audit: `python scripts/audit-tokens.py`
2. Check ignore files: `.gitlensignore`, `.gitignore`
3. Review GitLens settings: `Ctrl+, → "GitLens"`
4. File issue with output from audit script

---

**Created**: January 4, 2026  
**Maintained by**: ModMe GenUI Team  
**Version**: 1.0.0
