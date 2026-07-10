#Requires -Version 5.1
<#
.SYNOPSIS
  Copilot workspace lifecycle dispatcher (session.create / session.archive).
#>
param([switch]$Help)

$ErrorActionPreference = 'Stop'

if ($Help) {
  @'
lifecycle.ps1 — branch on COPILOT_SCRIPT_TRIGGER

  session.create  -> bootstrap + session-start
  session.archive -> session-archive
'@
  exit 0
}

. "$PSScriptRoot/lib/paths.ps1"
$repoRoot = Get-CopilotRepoRoot
$worktreeRoot = Resolve-CopilotWorktreeRoot -RepoRoot $repoRoot
$trigger = Get-CopilotScriptTrigger

Write-CopilotLifecycleLog -RepoRoot $worktreeRoot -Event $trigger

switch ($trigger) {
  'session.create' {
    & "$PSScriptRoot/bootstrap.ps1"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & "$PSScriptRoot/session-start.ps1"
    exit $LASTEXITCODE
  }
  'session.archive' {
    & "$PSScriptRoot/session-archive.ps1"
    exit $LASTEXITCODE
  }
  default {
    Write-Warning "Unknown COPILOT_SCRIPT_TRIGGER='$trigger' — running bootstrap only."
    & "$PSScriptRoot/bootstrap.ps1"
    exit $LASTEXITCODE
  }
}
