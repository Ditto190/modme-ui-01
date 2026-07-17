# Github_Projects lean-ctx workspace profiles

## Config tiers

1. **Env vars** (`LEAN_CTX_*`) — highest
2. **Project** `<repo>/.lean-ctx.toml`
3. **D: workspace global** `D:\Github_Projects\.config\lean-ctx\config.toml` when `LEAN_CTX_CONFIG_DIR` is set (via [Github_Projects.code-workspace](../../Github_Projects.code-workspace))
4. **C: user global** `~\.config\lean-ctx\config.toml` when workspace env is unset

## Session automation

| Trigger | Script |
| --- | --- |
| Cursor `sessionStart` (workspace hooks) | `scripts/github-projects-healthcheck.ps1` |
| Integrated terminal profile `GP PowerShell (lean-ctx)` | `scripts/github-projects-session-bootstrap.ps1` |

Bootstrap runs once per calendar day (marker under `.cursor/hooks/state/`). Use `-Force` to re-run.

## Activate a skill-aligned profile

```powershell
$env:LEAN_CTX_PROFILE = "powershell-windows"   # or ai-native-cli, windows-shell-reliability, bash-shell, os-scripting
$env:LEAN_CTX_PERSONA = "powershell-windows"
# list: lean-ctx profile list
```

| Profile / persona | Skill alignment |
| --- | --- |
| `powershell-windows` | powershell-windows |
| `windows-shell-reliability` | windows-shell-reliability |
| `ai-native-cli` | ai-native-cli |
| `bash-shell` | bash / shell |
| `os-scripting` | os-scripting |
| `shell` (persona only) | /shell |

Personas: `.config/lean-ctx/personas/`. Context profiles: `.local/share/lean-ctx/profiles/` (when `LEAN_CTX_DATA_DIR` points at the D: workspace).

## Verify

```powershell
$env:LEAN_CTX_CONFIG_DIR = "D:\Github_Projects\.config\lean-ctx"
lean-ctx config validate
lean-ctx doctor
.\scripts\github-projects-healthcheck.ps1 -Json
.\scripts\github-projects-session-bootstrap.ps1 -Force
```
