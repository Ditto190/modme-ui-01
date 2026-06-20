# Cursor hooks (security-only)



Project Cursor hooks use **security guards only** in `.cursor/hooks.json`:



**Note: Cursor hooks have been removed due to reliability issues with failClosed behavior.**
For hook definitions, refer to Cursor's official documentation.



**Stop/focus hooks are intentionally removed** (`update-skills-on-stop`, ralph `stop-hook`, continual-learning stop, `capture-response`) because they caused focus to jump away from the terminal and editor while agents ran.



To refresh upstream hook scripts:



```powershell
# do NOT add the -IncludeHooks - will break Cursor
.\scripts\install-cursor-cookbook.ps1

```



To opt back into stop hooks for experimentation only, wire them manually in `.cursor/hooks.json` and re-enable plugins in `.cursor/settings.json`.



Do **not** run `install-cursor-plugins.ps1` expecting hook scripts — that script no longer copies them.

