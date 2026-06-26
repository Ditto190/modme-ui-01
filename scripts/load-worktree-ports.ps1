# Load .worktree-ports.env into the current PowerShell session (idempotent).
# Usage: . .\scripts\load-worktree-ports.ps1
#        .\scripts\load-worktree-ports.ps1 -RepoRoot <path>

param(
  [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"

if ($args -contains '-Help' -or $args -contains '--help' -or $args -contains '-h') {
  @"
load-worktree-ports — load .worktree-ports.env into the current pwsh session

Usage:
  . .\scripts\load-worktree-ports.ps1
  yarn worktree:ports

Options:
  -RepoRoot <path>   Worktree root (default: parent of scripts/)

Examples:
  cd ..\Monorepo_ModMe-dev\dev-agent-cursor-my-task
  . .\scripts\load-worktree-ports.ps1
  yarn dev:forge:core
"@
  exit 0
}

$portsFile = Join-Path $RepoRoot '.worktree-ports.env'
if (-not (Test-Path $portsFile)) {
  Write-Error @"
Missing .worktree-ports.env in $RepoRoot

Generate with:
  .\scripts\worktree-allocate-ports.ps1 -WorktreePath `"$RepoRoot`"

Or open a worktree created by new-agent-worktree.ps1 / Cursor setup.
"@
}

$loaded = 0
Get-Content $portsFile | ForEach-Object {
  if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)=(.+)\s*$') {
    Set-Item -Path "env:$($Matches[1])" -Value $Matches[2].Trim()
    $loaded++
  }
}

Write-Host "Loaded $loaded port variables from .worktree-ports.env" -ForegroundColor Green
Write-Host "  FORGE_APP_PORT=$env:FORGE_APP_PORT  WEB_DASHBOARD_PORT=$env:WEB_DASHBOARD_PORT  AGENT_SERVER_PORT=$env:AGENT_SERVER_PORT  LSPMUX_CONNECT=$env:LSPMUX_CONNECT" -ForegroundColor DarkGray
