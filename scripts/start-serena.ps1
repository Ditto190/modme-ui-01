#Requires -Version 5.1
<#
.SYNOPSIS
  Start Serena MCP server (HTTP/SSE) for local debugging.
.DESCRIPTION
  Prefer Cursor stdio MCP from .cursor/mcp.json for normal agent use.
  Use this script when you need a standalone HTTP endpoint.
.PARAMETER Port
  Listen port (default 8001).
#>
[CmdletBinding()]
param(
  [int]$Port = 8001
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

& (Join-Path $PSScriptRoot "ensure-serena.ps1")

$serena = (Get-Command serena -ErrorAction SilentlyContinue).Source
if (-not $serena) {
  $serena = Join-Path $env:USERPROFILE ".local\bin\serena.exe"
}

Write-Host "Starting Serena MCP (streamable-http) on port $Port ..."
& $serena start-mcp-server `
  --context ide `
  --project $repoRoot `
  --transport streamable-http `
  --host 127.0.0.1 `
  --port $Port `
  --enable-web-dashboard false `
  --open-web-dashboard false
