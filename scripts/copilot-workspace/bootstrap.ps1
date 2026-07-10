#Requires -Version 5.1
<#
.SYNOPSIS
  Copilot workspace bootstrap — shared-deps worktree setup + generated env.
#>
param([switch]$Help)

$ErrorActionPreference = 'Stop'

if ($Help) {
  @'
bootstrap.ps1 — Copilot App Run script or session.create helper

Maps COPILOT_ROOT_PATH / COPILOT_WORKSPACE_PATH to ModMe worktree bootstrap.
'@
  exit 0
}

. "$PSScriptRoot/lib/paths.ps1"
$repoRoot = Get-CopilotRepoRoot
$worktreeRoot = Resolve-CopilotWorktreeRoot -RepoRoot $repoRoot
$sourceRoot = Resolve-CopilotSourceRoot -RepoRoot $repoRoot

Push-Location $worktreeRoot
try {
  & "$PSScriptRoot/generate-env.ps1" -WorktreePath $worktreeRoot
  . "$repoRoot/scripts/lib/worktree-bootstrap.ps1"
  Invoke-WorktreeBootstrap -WorktreeRoot $worktreeRoot -SourceRoot $sourceRoot -SharedDeps -SkipSession
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  & "$repoRoot/scripts/ensure-lean-ctx-config.ps1" 2>&1 | Out-Null

  Write-Host 'Running builder pipeline (SWC / Vite / Dolt)...' -ForegroundColor Cyan
  & "$PSScriptRoot/run-builders.ps1" -Pipeline copilot-session-create
  if ($LASTEXITCODE -ne 0) {
    Write-Warning 'Builder pipeline reported issues (optional Dolt may be absent).'
  }

  Write-Host 'Copilot workspace bootstrap complete.' -ForegroundColor Green
}
finally {
  Pop-Location
}
