#!/usr/bin/env pwsh
# Start the MCP "everything" reference server
# This server demonstrates all MCP protocol features

param()

Set-StrictMode -Version Latest

Write-Host "Starting MCP Everything Server..." -ForegroundColor Cyan
Write-Host "This is a reference implementation demonstrating all MCP protocol features." -ForegroundColor Gray

# Run the everything server via npx (downloads if not installed)
try {
    npx -y @modelcontextprotocol/server-everything stdio
}
catch {
    Write-Host "Failed to start everything server: $_" -ForegroundColor Red
    exit 1
}
