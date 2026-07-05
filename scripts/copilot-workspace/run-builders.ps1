#Requires -Version 5.1
<#
.SYNOPSIS
  Run ModMe builder pipeline (SWC, Vite, Dolt) for Copilot workspace sessions.
#>
param(
  [string]$Pipeline = 'copilot-session-create',
  [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
  @'
run-builders.ps1 — SWC / Vite / Dolt builder orchestration

  -Pipeline copilot-session-create  (default)
  -Pipeline preflight-builders
  -Pipeline catalog-cms-eval
'@
  exit 0
}

. "$PSScriptRoot/lib/paths.ps1"
$repoRoot = Get-CopilotRepoRoot
$worktreeRoot = Resolve-CopilotWorktreeRoot -RepoRoot $repoRoot

Push-Location $worktreeRoot
try {
  node "$repoRoot/scripts/builders-orchestrator.mjs" pipeline $Pipeline
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host "Builder pipeline '$Pipeline' complete." -ForegroundColor Green
}
finally {
  Pop-Location
}
