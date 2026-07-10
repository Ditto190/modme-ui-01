<!-- lean-ctx-owned: PROJECT-LEAN-CTX.md v2 -->

# lean-ctx — Context Engineering Layer

<!-- lean-ctx-rules-v12 -->

## Non-negotiable

**Agents must not use native Read, Grep, Glob, or raw Shell** for codebase exploration when lean-ctx MCP is connected. Use `ctx_read` with an explicit read mode. Cursor user hooks (`~/.cursor/hooks.json`) redirect native read tools to lean-ctx.

## Tool Mapping

| Instead of                   | Use                                       | Example                           |
| ---------------------------- | ----------------------------------------- | --------------------------------- |
| Read/cat/head/tail           | `ctx_read(path, mode)`                    | `ctx_read("src/main.rs", "full")` |
| Grep/rg/find                 | `ctx_search(pattern, path)`               | `ctx_search("fn handle", "src/")` |
| Shell/bash                   | `ctx_shell(command)` or `lean-ctx -c "…"` | `lean-ctx -c "yarn test"`         |
| ls/find tree                 | `ctx_tree(path, depth)`                   | `ctx_tree("src", 3)`              |
| Edit (when Read unavailable) | `ctx_edit(path, old, new)`                | `ctx_edit("f.rs", "old", "new")`  |

Writes: native Edit/Write/StrReplace after `ctx_read(..., "full")`.

## ctx_read Mode Selection

Reference: [leanctx.com/docs/concepts/read-modes](https://leanctx.com/docs/concepts/read-modes/)

| Goal                     | Mode         |
| ------------------------ | ------------ |
| Edit this file           | `full`       |
| Re-read after edit       | `diff`       |
| API surface              | `signatures` |
| File role / deps         | `map`        |
| Large repetitive file    | `entropy`    |
| Comment-heavy file       | `aggressive` |
| Task-filtered slice      | `task`       |
| Register without content | `reference`  |
| Specific lines           | `lines:N-M`  |
| Unsure                   | `auto`       |

Cached re-reads of unchanged files: ~13 tokens.

## Workflow

1. **Orient:** `ctx_overview(task)` or `ctx_compose(task, path)`
2. **Locate:** `ctx_search` / `ctx_semantic_search`
3. **Read:** `ctx_read(path, mode)` — pick mode from table
4. **Edit:** native Edit or `ctx_edit`
5. **Verify:** `ctx_read(path, "diff")` + `ctx_shell("test command")`
6. **Record:** `ctx_knowledge(action="remember", …)`

## Session

- **Start:** `ctx_session(action="load")` + `ctx_knowledge(action="wakeup")`
- **End:** `ctx_session(action="save")` + `ctx_knowledge(action="consolidate")`

## Config (ModMe)

- Global: `~/.config/lean-ctx/config.toml`
- Project: `.lean-ctx.toml`
- Ensure: `yarn lean-ctx:ensure`
- Guide: `docs/lean-ctx-guide.md`

NEVER use native Read/Grep/Glob/Shell when ctx\_\* equivalents are available.

<!-- /lean-ctx -->
