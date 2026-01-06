#!/usr/bin/env bash
# POSIX helper to add VS Code shell integration snippets to common rc files.
# Usage: ./scripts/install-shell-integration.sh --shell bash

set -euo pipefail
SHELL_TYPE="bash"
RC_FILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --shell)
      SHELL_TYPE="$2"
      shift 2
      ;;
    --rc-file)
      RC_FILE="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--shell bash|zsh|fish] [--rc-file /path/to/rc]"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if ! command -v code >/dev/null 2>&1; then
  echo "The 'code' CLI is not in PATH. Ensure you're able to run 'code' before running this script." >&2
  exit 1
fi

# Determine rc file if not provided
if [[ -z "$RC_FILE" ]]; then
  case "$SHELL_TYPE" in
    bash)
      RC_FILE="$HOME/.bashrc"
      ;;
    zsh)
      RC_FILE="$HOME/.zshrc"
      ;;
    fish)
      if [[ -n "${XDG_CONFIG_HOME:-}" ]]; then
        RC_FILE="$XDG_CONFIG_HOME/fish/config.fish"
      else
        RC_FILE="$HOME/.config/fish/config.fish"
      fi
      ;;
    *)
      echo "Unsupported shell: $SHELL_TYPE" >&2
      exit 1
      ;;
  esac
fi

mkdir -p "$(dirname "$RC_FILE")"
if [[ ! -f "$RC_FILE" ]]; then
  touch "$RC_FILE"
fi

case "$SHELL_TYPE" in
  bash|zsh)
    SNIPPET='[[ "$TERM_PROGRAM" == "vscode" ]] && . "$(code --locate-shell-integration-path bash)"'
    ;;
  fish)
    SNIPPET='string match -q "$TERM_PROGRAM" "vscode"; and . (code --locate-shell-integration-path fish)'
    ;;
  *)
    echo "Unknown shell type: $SHELL_TYPE" >&2
    exit 1
    ;;
esac

# Check for existing snippet
if grep -F "$(echo "$SNIPPET" | sed 's/"/\"/g')" "$RC_FILE" >/dev/null 2>&1; then
  echo "Snippet already present in $RC_FILE"
  exit 0
fi

# Backup
BACKUP="${RC_FILE}.bak.$(date +%Y%m%d%H%M%S)"
cp "$RC_FILE" "$BACKUP"

# Append with marker comment
{
  echo "";
  echo "# VS Code shell integration (added by modme-ui helper)";
  echo "$SNIPPET";
} >> "$RC_FILE"

echo "Added shell integration snippet to: $RC_FILE"
echo "Backup created at: $BACKUP"
echo "Restart VS Code or open a new integrated terminal to activate shell integration."