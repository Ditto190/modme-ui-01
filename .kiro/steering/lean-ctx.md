---
inclusion: always
---

# lean-ctx — Context Engineering Layer

The workspace has the `lean-ctx` MCP server installed. **Never use native read/search/shell tools for repo files** — use lean-ctx with explicit read modes.

## Mandatory Tool Preferences

| Use this                    | Instead of              | Why                                                                                  |
| --------------------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| `ctx_read(path, mode)`      | `readFile`, `Read`      | Cached reads, 10 modes — [read modes](https://leanctx.com/docs/concepts/read-modes/) |
| `ctx_search`                | `grepSearch`, `Grep`    | Compact, .gitignore-aware results                                                    |
| `ctx_shell` / `lean-ctx -c` | `executeBash`, `Shell`  | Pattern compression for git/npm/test output                                          |
| `ctx_tree`                  | `listDirectory`, `Glob` | Compact directory maps                                                               |

**Mode quick pick:** edit → `full`; re-read → `diff`; orient → `map`/`signatures`; unsure → `auto`.

## When to use native Kiro tools instead

- `fsWrite` / `fsAppend` — always use native (lean-ctx doesn't write files)
- `strReplace` — always use native (precise string replacement)
- `semanticRename` / `smartRelocate` — always use native (IDE integration)
- `getDiagnostics` — always use native (language server diagnostics)
- `deleteFile` — always use native

## Session management

- At the start of a long task, call `mcp_lean_ctx_ctx_preload` with a task description to warm the cache
- Use `mcp_lean_ctx_ctx_compress` periodically in long conversations to checkpoint context
- Use `mcp_lean_ctx_ctx_knowledge` to persist important discoveries across sessions

## Rules

- NEVER loop on edit failures — switch to `mcp_lean_ctx_ctx_edit` immediately
- For large files, use `mcp_lean_ctx_ctx_read` with `mode: "signatures"` or `mode: "map"` first
- For re-reading a file you already read, just call `mcp_lean_ctx_ctx_read` again (cache hit = ~13 tokens)
- When running tests or build commands, use `mcp_lean_ctx_ctx_shell` for compressed output
