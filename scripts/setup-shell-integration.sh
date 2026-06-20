#!/bin/bash
# VS Code Shell Integration Setup Script for Bash
# This script helps configure shell integration for Bash (Git Bash, WSL, etc.)

set -e

echo ""
echo "🔧 VS Code Shell Integration Setup"
echo "================================"
echo ""

# Check if running in VS Code
if [[ "$TERM_PROGRAM" != "vscode" ]]; then
    echo "⚠️  Not running in VS Code terminal. Shell integration works best when configured from VS Code."
    read -p "Continue anyway? (Y/N): " continue
    if [[ "$continue" != "Y" && "$continue" != "y" ]]; then
        exit 0
    fi
fi

# Get paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PROJECT_BASHRC="$PROJECT_ROOT/.config/bash/bashrc"
USER_BASHRC="$HOME/.bashrc"

echo "📁 Paths:"
echo "   Project Root: $PROJECT_ROOT"
echo "   Project Bashrc: $PROJECT_BASHRC"
echo "   Your Bashrc: $USER_BASHRC"
echo ""

# Check if project bashrc exists
if [[ ! -f "$PROJECT_BASHRC" ]]; then
    echo "❌ Project bashrc not found at: $PROJECT_BASHRC"
    exit 1
fi

# Add source command to user bashrc
echo "📝 Adding source command to your bashrc..."

SOURCE_COMMAND="
# ModMe GenUI Workbench - VS Code Shell Integration
if [[ -f \"$PROJECT_BASHRC\" ]]; then
    source \"$PROJECT_BASHRC\"
fi
"

# Check if already sourced
if [[ -f "$USER_BASHRC" ]] && grep -q "ModMe GenUI Workbench" "$USER_BASHRC"; then
    echo "   ✓ Project bashrc is already sourced in your bashrc."
else
    # Backup existing bashrc
    if [[ -f "$USER_BASHRC" ]]; then
        BACKUP_PATH="$USER_BASHRC.backup.$(date +%Y%m%d-%H%M%S)"
        echo "   ✓ Backing up existing bashrc to: $BACKUP_PATH"
        cp "$USER_BASHRC" "$BACKUP_PATH"
    fi

    # Add source command
    echo "$SOURCE_COMMAND" >> "$USER_BASHRC"
    echo "   ✓ Added source command to your bashrc."
fi
echo ""

# Verify VS Code settings
echo "⚙️  Checking VS Code Settings..."

WORKSPACE_SETTINGS="$PROJECT_ROOT/workspace.code-workspace"
if [[ -f "$WORKSPACE_SETTINGS" ]]; then
    if grep -q '"terminal.integrated.shellIntegration.enabled": true' "$WORKSPACE_SETTINGS"; then
        echo "   ✓ Shell integration is enabled in workspace settings"
    else
        echo "   ⚠️  Shell integration may not be enabled in workspace settings."
        echo "   Please check workspace.code-workspace"
    fi
fi
echo ""

# Summary
echo "✨ Setup Complete!"
echo "================================"
echo ""

echo "Next Steps:"
echo "1. Reload your shell: source ~/.bashrc"
echo "2. Or open a new terminal in VS Code"
echo "3. You should see: '✓ VS Code shell integration enabled'"
echo "4. Type 'help' to see available project commands"
echo ""

echo "Available Commands:"
echo "  dev       - Start both frontend and agent servers"
echo "  ui        - Start Next.js frontend only"
echo "  agent     - Start Python agent only"
echo "  mcp       - Start MCP servers"
echo "  validate  - Validate toolsets configuration"
echo "  docs      - Generate all documentation"
echo "  venv      - Activate Python virtual environment"
echo "  help      - Show available commands"
echo ""

echo "📚 Documentation:"
echo "   - VS Code Shell Integration: https://code.visualstudio.com/docs/terminal/shell-integration"
echo "   - Project Configuration: .config/README.md"
echo ""

# Test shell integration
echo "🧪 Testing Shell Integration..."
SHELL_INTEGRATION_PATH="$(code --locate-shell-integration-path bash 2>/dev/null || true)"
if [[ -f "$SHELL_INTEGRATION_PATH" ]]; then
    echo "   ✓ Shell integration script found: $SHELL_INTEGRATION_PATH"
else
    echo "   ⚠️  Could not locate shell integration script. Make sure VS Code is installed and in PATH."
fi

echo ""
echo "✅ Shell integration setup complete!"
echo ""
