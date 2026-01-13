# VS Code Terminal Shell Integration

This repository includes helper scripts and documentation to enable Visual Studio Code "Shell Integration" for several shells (PowerShell, bash, zsh, fish, Git Bash).

Why enable shell integration?
- Improved command detection, decorations, and navigation.
- Accurate current working directory detection so links open the correct file.
- Terminal IntelliSense and Quick Fixes for common command failures.

Note: VS Code already attempts automatic injection for supported shells. Use manual installation when automatic injection doesn't work (sub-shells, remote SSH sessions without Remote - SSH, older shells, or complex shell setups).

Quick links:
- VS Code docs: https://code.visualstudio.com/docs/terminal/shell-integration
- VS Code setting to disable automatic injection: `terminal.integrated.shellIntegration.enabled`

---

## Manual installation (recommended)

The shell integration script must run during your shell initialization. The commands below call `code --locate-shell-integration-path <shell>` to resolve and source/dot the correct script path.

PowerShell (Windows / pwsh)

1. Open your PowerShell profile in VS Code:

```powershell
code $Profile
```

2. Add this line to the profile (or run the installer script included in `scripts/`):

```powershell
if ($env:TERM_PROGRAM -eq "vscode") { . "$(code --locate-shell-integration-path pwsh)" }
```

Bash / Zsh (Linux, macOS, Git Bash)

Add to `~/.bashrc` or `~/.zshrc`:

```sh
[[ "$TERM_PROGRAM" == "vscode" ]] && . "$(code --locate-shell-integration-path bash)"
```

Replace `bash` with `zsh` or `fish` as appropriate; fish syntax example is shown below.

Fish

Add to your `config.fish`:

```fish
string match -q "$TERM_PROGRAM" "vscode"; and . (code --locate-shell-integration-path fish)
```

Git Bash

Add the same `bash` snippet to `~/.bashrc` used by Git Bash:

```sh
[[ "$TERM_PROGRAM" == "vscode" ]] && . "$(code --locate-shell-integration-path bash)"
```

---

## Installer scripts included in this repo

- `scripts/install-shell-integration.ps1` — a PowerShell helper that will append the PowerShell snippet to your `$Profile` safely (creates a backup and checks if snippet already exists).
- `scripts/install-shell-integration.sh` — a POSIX shell helper to update `~/.bashrc`, `~/.zshrc`, or Fish config. Accepts `--shell` and `--rc-file` flags.

Run them from the workspace root (examples):

PowerShell (run in an elevated or normal pwsh session as the user):

```powershell
# from repo root
powershell -ExecutionPolicy Bypass -File .\scripts\install-shell-integration.ps1
```

POSIX (bash / zsh on Windows via WSL or Git Bash / macOS / Linux):

```bash
# default tries ~/.bashrc
./scripts/install-shell-integration.sh --shell bash

# explicit rc file
./scripts/install-shell-integration.sh --rc-file ~/.zshrc
```

---

## Tips & verification

- After adding the snippet, restart VS Code or the integrated terminal to pick up changes.
- To verify shell integration is active: open a terminal in VS Code and hover the terminal tab — the hover shows the shell integration quality (None/Basic/Rich).
- If you add new commands to your shell init files, run the command `Terminal: Clear Suggest Cached Globals` (`terminal.integrated.suggest.clearCachedGlobals`) from the Command Palette to refresh cached completions.
- If automatic injection works and you used manual installation, you can set `terminal.integrated.shellIntegration.enabled` to `false` in settings to avoid double-loading.

---

If you want, I can:
- Add a short README link to this doc.
- Run the PowerShell installer script locally and show what it would change (I can preview edits).