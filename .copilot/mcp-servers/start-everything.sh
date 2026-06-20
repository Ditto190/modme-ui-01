#!/usr/bin/env bash
# Start the MCP "everything" reference server
# This server demonstrates all MCP protocol features

set -euo pipefail

echo "Starting MCP Everything Server..."
echo "This is a reference implementation demonstrating all MCP protocol features."

# Run the everything server via npx (downloads if not installed)
if ! npx -y @modelcontextprotocol/server-everything stdio; then
    echo "Failed to start everything server" >&2
    exit 1
fi
