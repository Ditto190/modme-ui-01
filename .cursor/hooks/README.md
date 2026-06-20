# Cursor hooks (security-only + optional lean-ctx advisory)

Project Cursor hooks use **security guards only** in `.cursor/hooks.json` by default:

**Note: Cursor hooks have been removed due to reliability issues with failClosed behavior.**
For hook definitions, refer to Cursor's official documentation.

## Optional lean-ctx advisory hooks (opt-in)

To automate verify reminders and session-end markers **without blocking agents**:

1. Copy [`.cursor/hooks.json.example`](../hooks.json.example) → `.cursor/hooks.json` (merge, do not overwrite unrelated entries).
2. Ensure `failClosed` is **false** and timeouts ≤ 5s.
3. Scripts (always exit 0):
   - `lean-ctx-post-edit.ps1` — hints `yarn check:forge` after `next-forge/**/*.ts(x)` edits
   - `lean-ctx-stop-marker.ps1` — appends to `state/lean-ctx-session-markers.jsonl` for memory pipelines

Memory persistence (facts, decisions) still uses **lean-ctx MCP** at session end:

- `ctx_session` → `save`
- `ctx_knowledge` → `consolidate`
- `ctx_agent` → `diary` (category: insight | decision)

See [docs/lean-ctx-guide.md](../../docs/lean-ctx-guide.md).

**Stop/focus hooks are intentionally removed** (`update-skills-on-stop`, ralph `stop-hook`, continual-learning stop, `capture-response`) because they caused focus to jump away from the terminal and editor while agents ran.



To refresh upstream hook scripts:



```powershell
# do NOT add the -IncludeHooks - will break Cursor
.\scripts\install-cursor-cookbook.ps1

```



To opt back into stop hooks for experimentation only, wire them manually in `.cursor/hooks.json` and re-enable plugins in `.cursor/settings.json`.



Do **not** run `install-cursor-plugins.ps1` expecting hook scripts — that script no longer copies them.

