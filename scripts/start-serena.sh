#!/usr/bin/env bash
set -euo pipefail
# Start a local Serena MCP server (requires `uvx` / `uv` runtime)
# Usage: ./scripts/start-serena.sh [port]

PORT=${1:-8001}

if ! command -v uvx >/dev/null 2>&1; then
  echo "uvx not found. Install uv per https://docs.astral.sh/uv/getting-started/installation/"
  exit 1
fi

echo "Starting Serena MCP server on port ${PORT} (this may download code from GitHub)..."
uvx --from git+https://github.com/oraios/serena serena start-mcp-server --port "${PORT}"
