# Cursor hooks (security-only)

Project Cursor hooks use **security guards only** in `.cursor/hooks.json`:

- `block-models-by-repo-origin.sh` — block disallowed models by repo origin
- `sensitive-prompt-guard.sh` — block prompts that look like secrets
- `audit-log.sh` — append-only audit trail for prompts, shell, and edits

**Stop/focus hooks are intentionally removed** (`update-skills-on-stop`, ralph `stop-hook`, continual-learning stop, `capture-response`) because they caused focus to jump away from the terminal and editor while agents ran.

To refresh upstream hook scripts:

```powershell
.\scripts\install-cursor-cookbook.ps1 -IncludeHooks
```

To opt back into stop hooks for experimentation only, wire them manually in `.cursor/hooks.json` and re-enable plugins in `.cursor/settings.json`.

Do **not** run `install-cursor-plugins.ps1` expecting hook scripts — that script no longer copies them.
