#Requires -Version 5.1
<#
.SYNOPSIS
  Start GenerativeUI agent workbench stack (web-dashboard + agent-server) with worktree ports.
#>
param([switch]$Help)

$ErrorActionPreference = 'Stop'

if ($Help) { Write-Host 'run-workbench.ps1 — load ports and print dev commands'; exit 0 }

. "$PSScriptRoot/lib/paths.ps1"
$repoRoot = Get-CopilotRepoRoot
$worktreeRoot = Resolve-CopilotWorktreeRoot -RepoRoot $repoRoot

$loadPorts = Join-Path $repoRoot 'scripts/load-worktree-ports.ps1'
if (Test-Path $loadPorts) {
  . $loadPorts -RepoRoot $worktreeRoot
}

$dashboardPort = if ($env:WEB_DASHBOARD_PORT) { $env:WEB_DASHBOARD_PORT } else { '3001' }
$agentPort = if ($env:AGENT_SERVER_PORT) { $env:AGENT_SERVER_PORT } else { '8000' }

Write-Host ''
Write-Host 'Agent workbench (run in separate terminals or use yarn agent:tui):' -ForegroundColor Cyan
Write-Host "  web-dashboard : yarn --cwd GenerativeUI_monorepo workspace @generative-ui/web-dashboard dev  # :$dashboardPort"
Write-Host "  agent-server  : cd GenerativeUI_monorepo/apps/agent-server && poetry run uvicorn src.main:app --reload --port $agentPort"
Write-Host ''
Write-Host 'Or: yarn agent:tui' -ForegroundColor Green
