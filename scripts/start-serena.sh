#!/usr/bin/env bash
set -euo pipefail
# Start a local Serena MCP server (HTTP). Prefer Cursor stdio via .cursor/mcp.json.
# Usage: ./scripts/start-serena.sh [port]

PORT=${1:-8001}
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v serena >/dev/null 2>&1; then
  SERENA=(serena)
elif [[ -x "${HOME}/.local/bin/serena" ]]; then
  SERENA=("${HOME}/.local/bin/serena")
elif command -v uvx >/dev/null 2>&1; then
  SERENA=(uvx --from serena-agent serena)
else
  echo "serena not found. Install: uv tool install -p 3.13 serena-agent"
  exit 1
fi

echo "Starting Serena MCP server on port ${PORT}..."
"${SERENA[@]}" start-mcp-server \
  --context ide \
  --project "$ROOT" \
  --transport streamable-http \
  --host 127.0.0.1 \
  --port "${PORT}" \
  --enable-web-dashboard false \
  --open-web-dashboard false
