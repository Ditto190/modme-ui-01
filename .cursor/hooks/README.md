# Cursor hooks — lean-ctx observability stack

Two-layer hook design (teaching/learning plugins stay **disabled**):

| Layer | File | Role |
|-------|------|------|
| **Global** | `~/.cursor/hooks.json` | lean-ctx `observe` / `rewrite` / `redirect` (compression) |
| **Project** | `.cursor/hooks.json` | Session logger + markers + offline docs (advisory only) |

## Project hooks (enabled)

All scripts use `-WindowStyle Hidden`, `failClosed: false`, and **always `exit 0`**.

| Event | Script | Purpose |
|-------|--------|---------|
| `sessionStart` | `session-bootstrap.ps1` | session-logger start; hint `ctx_session load` |
| `afterFileEdit` | `lean-ctx-post-edit.ps1` | next-forge verify hint |
| `stop` / `sessionEnd` | `session-capture.ps1` | session-logger end, marker jsonl, offline docs + agenttrace jobs |

**Teaching replacement:** use lean-ctx MCP (`ctx_session finding/decision`, `save`, `ctx_knowledge consolidate`) — not SessionStart prose injection.

## Memory persistence (MCP at session end)

- `ctx_session` → `save`
- `ctx_knowledge` → `consolidate`
- `ctx_agent` → `diary` (insight | decision)

See [docs/lean-ctx-guide.md](../../docs/lean-ctx-guide.md).

## Local artifacts (gitignored)

| Path | Content |
|------|---------|
| `logs/copilot/session.log` | session-logger JSONL |
| `logs/copilot/events.log` | hookFire / behavioral events |
| `.cursor/hooks/state/lean-ctx-session-markers.jsonl` | stop markers |
| `reports/session-docs/session-docs-preview.md` | CHANGELOG/inbox preview |

## Manual commands

```powershell
yarn hooks:session:bootstrap
yarn hooks:session:capture
yarn session:docs              # preview inbox/CHANGELOG stub
yarn session:docs:apply        # write inbox when git diff exists
yarn eval:collect --dry-run
yarn lean-ctx:sync-config -InitGlobal
.\scripts\cursor-ai\patch-silent-plugin-hooks.ps1
```

## Windows: plugin SessionStart hooks

Reapply silent wrappers after plugin cache updates — see `patch-silent-plugin-hooks.ps1`.

## Do not re-enable

Stop hooks that rewrite skills, open browsers, or use `failClosed: true` (`update-skills-on-stop`, ralph loop, continual-learning stop).

Session-logger canonical path: [`.github/hooks/session-logger/`](../../.github/hooks/session-logger/) (not `.vendor/awesome-copilot-main`).
