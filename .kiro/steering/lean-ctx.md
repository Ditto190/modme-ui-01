---
inclusion: always
---

# lean-ctx — Context Engineering Layer

The workspace has the `lean-ctx` MCP server installed. You MUST prefer lean-ctx tools over native equivalents for token efficiency and caching.

## Mandatory Tool Preferences

| Use this | Instead of | Why |
|----------|-----------|-----|
| `ctx_read(path, mode)` | `readFile`, `readCode` | Cached reads, multiple compression modes, cheap re-reads |
| `ctx_multi_read(paths, mode)` | `readMultipleFiles` | Batch cached reads in one call |
| `ctx_shell(command)` | `executeBash` | Pattern compression for git/npm/test output |
| `ctx_search(pattern, path)` | `grepSearch` | Compact, .gitignore-aware results |
| `ctx_tree(path)` | `listDirectory` | Compact directory maps with file counts |

## When to use native Kiro tools instead

- `fsWrite` / `fsAppend` - always use native for direct file writes
- `strReplace` - always use native (precise string replacement)
- `semanticRename` / `smartRelocate` - always use native (IDE integration)
- `getDiagnostics` - always use native (language server diagnostics)
- `deleteFile` - always use native

Note: lean-ctx still supports file edits through `ctx_edit(path, old, new)` (or native Edit), but direct write operations should stay on native tools.

## Session management

- At the start of a long task, call `ctx_session(action="status")` and `ctx_knowledge(action="wakeup")`
- Use `ctx_compress` periodically in long conversations to checkpoint context
- Use `ctx_knowledge(action="remember", content="...")` to persist important discoveries across sessions

## Rules

- NEVER loop on edit failures - switch to `ctx_edit(path, old, new)` immediately
- For large files, use `ctx_read(path, "signatures")` or `ctx_read(path, "map")` first
- For re-reading a file you already read, call `ctx_read(path, mode)` again for a cache hit
- When running tests or build commands, use `ctx_shell(command)` for compressed output