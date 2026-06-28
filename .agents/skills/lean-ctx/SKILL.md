---
name: lean-ctx
description: Mandatory context layer for ModMe agents. NEVER use native Read/Grep/Glob/Shell for repo files — use ctx_read with explicit read modes, ctx_search, and lean-ctx -c. Use when reading, searching, or exploring any codebase file.
---

# lean-ctx — ModMe Agent Skill

## Non-negotiable (ModMe policy)

When lean-ctx MCP is connected, **do not** call native `Read`, `Grep`, `Glob`, or raw `Shell` for repository files.

| Forbidden | Required                           |
| --------- | ---------------------------------- |
| Read      | `ctx_read(path, mode)`             |
| Grep      | `ctx_search(pattern, path)`        |
| Glob / ls | `ctx_tree(path, depth)`            |
| Shell     | `lean-ctx -c "cmd"` or `ctx_shell` |

Cursor user hooks (`~/.cursor/hooks.json`) redirect native read tools to lean-ctx. Writes use native Edit/Write after `ctx_read(..., "full")`.

## ctx_read — pick a mode

Docs: https://leanctx.com/docs/concepts/read-modes/

| Situation         | Mode         |
| ----------------- | ------------ |
| Will edit         | `full`       |
| After edit        | `diff`       |
| API surface       | `signatures` |
| File role / deps  | `map`        |
| Large boilerplate | `entropy`    |
| Comment-heavy     | `aggressive` |
| Task-scoped       | `task`       |
| Pointer only      | `reference`  |
| Known lines       | `lines:N-M`  |
| Exploring         | `auto`       |

Re-read unchanged file: ~13 tokens (cache hit).

## Session workflow

```
START  → ctx_session(load) + ctx_knowledge(wakeup) + ctx_overview(task)
LOCATE → ctx_search / ctx_semantic_search
READ   → ctx_read(path, mode)
EDIT   → native Edit (after full read)
VERIFY → ctx_read(path, diff) + lean-ctx -c "yarn check:forge"
RECORD → ctx_knowledge(remember) + ctx_session(save)
```

## ModMe config

- Rules: `LEAN-CTX.md`, `.cursor/rules/lean-ctx.mdc`
- Project: `.lean-ctx.toml` · Global: `~/.config/lean-ctx/config.toml`
- Ensure: `yarn lean-ctx:ensure`
- Playbook: `docs/lean-ctx-guide.md`

## Core MCP tools

`ctx_read` · `ctx_search` · `ctx_shell` · `ctx_tree` · `ctx_edit` · `ctx_overview` · `ctx_session` · `ctx_knowledge` · `ctx_graph`

Full upstream skill: `~/.claude/skills/lean-ctx/SKILL.md` · https://leanctx.com/docs
