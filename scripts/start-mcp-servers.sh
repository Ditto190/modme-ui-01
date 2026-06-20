#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root (script is in scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

LOG_DIR="$ROOT/.logs"
mkdir -p "$LOG_DIR"

MCP_DIR="$ROOT/.copilot/mcp-servers"
if [ ! -d "$MCP_DIR" ]; then
  echo "No MCP servers directory found at: $MCP_DIR"
  echo "Create scripts there (e.g. start-agent.sh) and re-run this script."
  exit 0
fi

started=0

echo "Scanning $MCP_DIR for server start scripts..."

is_running_by_cmdline() {
  local path="$1"
  if pgrep -f "$path" >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

shopt -s nullglob
for f in "$MCP_DIR"/*; do
  [ -e "$f" ] || continue
  name="$(basename "$f")"
  ext="${name##*.}"
  logFile="$LOG_DIR/mcp-${name%.*}.log"

  case "$ext" in
    sh)
      if is_running_by_cmdline "$f"; then
        echo "Already running: $name"
      else
        echo "Starting shell script: $name"
        nohup bash "$f" >> "$logFile" 2>&1 &
        started=$((started+1))
      fi
      ;;
    ps1)
      if is_running_by_cmdline "$f"; then
        echo "Already running: $name"
      else
        if command -v pwsh >/dev/null 2>&1; then
          echo "Starting PowerShell script via pwsh: $name"
          nohup pwsh -NoProfile -ExecutionPolicy Bypass -File "$f" >> "$logFile" 2>&1 &
          started=$((started+1))
        else
          echo "Skipping $name (pwsh not found)"
        fi
      fi
      ;;
    bat|cmd)
      echo "Skipping Windows batch file on POSIX: $name"
      ;;
    exe)
      if is_running_by_cmdline "$f"; then
        echo "Already running: $name"
      else
        echo "Starting executable: $name"
        nohup "$f" >> "$logFile" 2>&1 &
        started=$((started+1))
      fi
      ;;
    *)
      if [ -x "$f" ]; then
        if is_running_by_cmdline "$f"; then
          echo "Already running: $name"
        else
          echo "Starting executable: $name"
          nohup "$f" >> "$logFile" 2>&1 &
          started=$((started+1))
        fi
      else
        echo "Skipping unknown or non-executable file: $name"
      fi
      ;;
  esac
done

echo "Done. Started $started MCP server(s). Logs are in: $LOG_DIR"
