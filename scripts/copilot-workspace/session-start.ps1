#Requires -Version 5.1
<#
.SYNOPSIS
  Start ModMe agent session envelope for a Copilot workspace session.
#>
param([switch]$Help)

$ErrorActionPreference = 'Stop'

if ($Help) { Write-Host 'session-start.ps1 — yarn agent:session:start wrapper'; exit 0 }

. "$PSScriptRoot/lib/paths.ps1"
$repoRoot = Get-CopilotRepoRoot
$worktreeRoot = Resolve-CopilotWorktreeRoot -RepoRoot $repoRoot

$taskTitle = if ($env:COPILOT_WORKSPACE_NAME) { $env:COPILOT_WORKSPACE_NAME } else { 'copilot workspace' }

Push-Location $worktreeRoot
try {
  & "$repoRoot/scripts/agent-session-start.ps1" -TaskTitle $taskTitle -BootstrapIntelligence -SkipBeads
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
