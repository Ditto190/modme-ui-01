# VS Code Shell Integration - Quick Reference

> **TL;DR**: Enhanced terminal features for VS Code terminals

## 🚀 Quick Setup

### PowerShell (Windows)

```powershell
# Run setup script
.\scripts\setup-shell-integration.ps1

# Or manually add to your PowerShell profile ($PROFILE)
if ($env:TERM_PROGRAM -eq "vscode") {
    . "$(code --locate-shell-integration-path pwsh)"
}
```

### Bash (Git Bash, WSL, macOS, Linux)

```bash
# Run setup script
bash scripts/setup-shell-integration.sh

# Or manually add to ~/.bashrc
[[ "$TERM_PROGRAM" == "vscode" ]] && . "$(code --locate-shell-integration-path bash)"
```

## ⚡ Keyboard Shortcuts

| Action                       | Shortcut              | Description                        |
| ---------------------------- | --------------------- | ---------------------------------- |
| Navigate to prev command     | `Ctrl/Cmd+Up`         | Jump to previous command           |
| Navigate to next command     | `Ctrl/Cmd+Down`       | Jump to next command               |
| Select to prev command       | `Shift+Ctrl/Cmd+Up`   | Select from cursor to prev command |
| Select to next command       | `Shift+Ctrl/Cmd+Down` | Select from cursor to next command |
| Recent commands              | `Ctrl+Alt+R`          | Open command history picker        |
| Recent directories           | `Ctrl+G`              | Open directory history picker      |
| Manually trigger suggestions | `Ctrl+Space`          | Trigger IntelliSense in terminal   |

## 🎨 Visual Features

### Command Decorations

- ✅ **Blue circle** = Successful command (exit code 0)
- ❌ **Red circle with X** = Failed command (non-zero exit code)
- 📍 **Scroll bar marks** = Command positions for quick navigation

### Command Guide

Hover over any command to see a **vertical guide line** showing the command boundary.

### Sticky Scroll

The command at the top of the terminal viewport "sticks" when scrolling, making it easy to see what command the output belongs to.

## 💡 IntelliSense Features

When enabled, the terminal provides:

- **File/folder suggestions** - Press Tab to complete
- **Command argument suggestions** - Context-aware completions
- **Option suggestions** - Flag and parameter completions
- **Quick suggestions** - Automatically as you type

## 🔧 Quick Fixes

VS Code scans command output and suggests fixes:

- **Port already in use** → Kill process and retry
- **Git push without upstream** → Set upstream and retry
- **Git command typo** → Suggest correct command
- **GitHub PR creation** → Open PR link

## 📋 Project Commands

Once shell integration is set up, you get these project-specific aliases:

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

## 🔍 Verification

### Check if shell integration is active

Open a terminal and run any command. You should see:

1. ✅ **Colored decoration** on the left (blue for success, red for failure)
2. 📍 **Mark in scroll bar** at the command's position
3. 📏 **Command guide** appears when hovering over the command

### Check integration quality

Hover over the **terminal tab** → See "Shell Integration: Rich/Basic/None"

- **Rich** = Fully working (ideal)
- **Basic** = Working with limited features
- **None** = Not active (needs setup)

## 🛠️ Settings

All settings are in [workspace.code-workspace](../workspace.code-workspace):

```jsonc
{
  "terminal.integrated.shellIntegration.enabled": true,
  "terminal.integrated.shellIntegration.decorationsEnabled": "both",
  "terminal.integrated.shellIntegration.showCommandGuide": true,
  "terminal.integrated.shellIntegration.history": 100,
  "terminal.integrated.stickyScroll.enabled": true,
  "terminal.integrated.suggest.enabled": true,
  "terminal.integrated.suggest.quickSuggestions": true,
}
```

## 🐛 Troubleshooting

### Shell integration not working?

**Check environment variable:**

```powershell
# PowerShell
$env:TERM_PROGRAM  # Should be "vscode"
```

```bash
# Bash
echo $TERM_PROGRAM  # Should be "vscode"
```

**Reload VS Code:**

`Ctrl+Shift+P` → "Developer: Reload Window"

**Re-run setup:**

```powershell
# PowerShell
.\scripts\setup-shell-integration.ps1 -Force

# Bash
bash scripts/setup-shell-integration.sh
```

### Decorations not showing?

1. Open VS Code Settings (`Ctrl+,`)
2. Search for `terminal.integrated.shellIntegration.enabled`
3. Make sure it's checked (enabled)
4. Check `terminal.integrated.shellIntegration.decorationsEnabled` is set to `both` or `always`

### Commands not in history?

- Run a few commands first
- Try `Ctrl+Alt+R` to open recent commands
- Check `terminal.integrated.shellIntegration.history` setting (default: 100)

## 📚 Full Documentation

- [.config/README.md](../.config/README.md) - Complete shell integration guide
- [VS Code Docs](https://code.visualstudio.com/docs/terminal/shell-integration) - Official documentation

---

**Last Updated**: January 4, 2026  
**Project**: ModMe GenUI Workbench
