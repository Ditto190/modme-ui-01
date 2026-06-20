# Shell Configuration for VS Code

This directory contains shell integration profiles for VS Code terminals.

## 📚 Documentation

- [VS Code Shell Integration Docs](https://code.visualstudio.com/docs/terminal/shell-integration)
- [Project Workspace Settings](../workspace.code-workspace)

## 🔧 Configuration Files

### PowerShell Profile

**Location**: `.config/powershell/Microsoft.PowerShell_profile.ps1`

**Features**:

- ✅ Automatic VS Code shell integration
- ✅ Project-specific aliases (`dev`, `agent`, `ui`, `mcp`, `validate`, `docs`, `venv`)
- ✅ Convenient helper functions
- ✅ Welcome message with available commands

**Manual Setup** (if needed):

```powershell
# Check current profile location
$PROFILE

# Create symbolic link to project profile (run as Administrator)
New-Item -ItemType SymbolicLink -Path $PROFILE -Target "$PWD\.config\powershell\Microsoft.PowerShell_profile.ps1" -Force
```

### Bash Profile (Git Bash)

**Location**: `.config/bash/bashrc`

**Features**:

- ✅ Automatic VS Code shell integration
- ✅ Project-specific aliases
- ✅ Bash-compatible helper functions
- ✅ Welcome message

**Manual Setup** (if needed):

```bash
# Add to ~/.bashrc or ~/.bash_profile
if [ -f ~/modme-ui-01/.config/bash/bashrc ]; then
    source ~/modme-ui-01/.config/bash/bashrc
fi
```

## 🚀 Available Commands

Once shell integration is active, you'll have access to these project commands:

| Command    | Description                           |
| ---------- | ------------------------------------- |
| `dev`      | Start both frontend and agent servers |
| `ui`       | Start Next.js frontend only           |
| `agent`    | Start Python agent only               |
| `mcp`      | Start MCP servers                     |
| `validate` | Validate toolsets configuration       |
| `docs`     | Generate all documentation            |
| `venv`     | Activate Python virtual environment   |
| `help`     | Show available commands               |

## ✨ Shell Integration Features

When shell integration is enabled in VS Code, you get:

### Command Decorations

- ✅ Visual indicators for successful commands (blue circles)
- ❌ Visual indicators for failed commands (red crosses)
- 📍 Annotations in the scroll bar for easy navigation

### Command Navigation

- `Ctrl/Cmd+Up` - Navigate to previous command
- `Ctrl/Cmd+Down` - Navigate to next command
- `Shift+Ctrl/Cmd+Up` - Select from cursor to previous command
- `Shift+Ctrl/Cmd+Down` - Select from cursor to next command

### IntelliSense in Terminal

- 💡 File and folder suggestions
- 💡 Command argument suggestions
- 💡 Option suggestions
- `Ctrl+Space` - Manually trigger suggestions

### Recent Commands

- `Ctrl+Alt+R` - Open recent command picker
- Search through command history with fuzzy search
- Copy command output to clipboard
- Pin frequently used commands

### Sticky Scroll

- Command that's partially visible at the top stays visible
- Click to jump to command location in terminal buffer

### Quick Fixes

- 🔧 Automatic suggestions for common errors
- 🔧 Port already in use? Kill process suggestion
- 🔧 Git push failed? Upstream setup suggestion

## 🎯 VS Code Settings

The following settings are configured in [workspace.code-workspace](../workspace.code-workspace):

```jsonc
{
  "terminal.integrated.shellIntegration.enabled": true,
  "terminal.integrated.shellIntegration.decorationsEnabled": "both",
  "terminal.integrated.shellIntegration.showCommandGuide": true,
  "terminal.integrated.shellIntegration.history": 100,
  "terminal.integrated.stickyScroll.enabled": true,
  "terminal.integrated.suggest.enabled": true,
  "terminal.integrated.suggest.quickSuggestions": true,
  "terminal.integrated.suggest.suggestOnTriggerCharacters": true,
}
```

## 🔍 Verification

To verify shell integration is working:

1. Open a new terminal in VS Code
2. Run any command (e.g., `npm run dev`)
3. Check for:
   - ✅ Command decorations (colored circles on the left)
   - ✅ Scroll bar annotations
   - ✅ Command guide (vertical line on hover)
   - ✅ IntelliSense suggestions when typing

## 🐛 Troubleshooting

### Shell Integration Not Working

**Check if automatic injection is enabled**:

Open VS Code Settings (`Ctrl+,`) and verify:

- `terminal.integrated.shellIntegration.enabled` is `true`

**Check if shell integration script is loaded**:

```powershell
# PowerShell
if ($env:TERM_PROGRAM -eq "vscode") {
    Write-Host "Running in VS Code ✓"
} else {
    Write-Host "Not running in VS Code ✗"
}
```

```bash
# Bash
if [[ "$TERM_PROGRAM" == "vscode" ]]; then
    echo "Running in VS Code ✓"
else
    echo "Not running in VS Code ✗"
fi
```

**Manual installation** (if automatic fails):

```powershell
# PowerShell - add to your $PROFILE
if ($env:TERM_PROGRAM -eq "vscode") {
    . "$(code --locate-shell-integration-path pwsh)"
}
```

```bash
# Bash - add to ~/.bashrc
[[ "$TERM_PROGRAM" == "vscode" ]] && . "$(code --locate-shell-integration-path bash)"
```

### Decorations Not Showing

If decorations are not visible, check:

1. Hover over terminal tab to see "Shell Integration Quality"
2. If "None", shell integration is not active
3. If "Basic" or "Rich", decorations should work
4. Try reloading VS Code window: `Ctrl+Shift+P` → "Developer: Reload Window"

### Commands Not in History

If commands aren't appearing in recent command picker (`Ctrl+Alt+R`):

1. Verify shell integration is active (see above)
2. Check history limit: `terminal.integrated.shellIntegration.history` setting
3. Run a few commands and try again

## 📝 Notes

- **Windows**: PowerShell is the default terminal profile
- **Git Bash**: Supported via bash configuration
- **WSL**: Use the bash configuration in WSL environments
- **Automatic Injection**: Enabled by default for supported shells
- **Manual Installation**: Only needed for advanced use cases or if automatic fails

## 🔗 Related Files

- [workspace.code-workspace](../workspace.code-workspace) - Workspace-level settings
- [.vscode/settings.json](../.vscode/settings.json) - Folder-level settings
- [scripts/start-mcp-servers.ps1](../scripts/start-mcp-servers.ps1) - MCP server startup script
- [scripts/toolset-management/validate-toolsets.js](../scripts/toolset-management/validate-toolsets.js) - Toolset validation

---

**Last Updated**: January 4, 2026  
**Project**: ModMe GenUI Workbench  
**Documentation**: <https://code.visualstudio.com/docs/terminal/shell-integration>
