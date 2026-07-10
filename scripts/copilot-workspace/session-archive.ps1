#Requires -Version 5.1
<#
.SYNOPSIS
  Archive Copilot workspace session — preflight fast + close envelope without commit.
#>
param([switch]$Help)

$ErrorActionPreference = 'Stop'

if ($Help) { Write-Host 'session-archive.ps1 — preflight + session envelope close'; exit 0 }

. "$PSScriptRoot/lib/paths.ps1"
$repoRoot = Get-CopilotRepoRoot
$worktreeRoot = Resolve-CopilotWorktreeRoot -RepoRoot $repoRoot

Push-Location $worktreeRoot
try {
  if (Get-Command yarn -ErrorAction SilentlyContinue) {
    yarn preflight:fast 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  $finish = Join-Path $repoRoot 'scripts/worktree-session-end.ps1'
  if (Test-Path $finish) {
    & $finish -SkipFinish
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  Write-CopilotLifecycleLog -RepoRoot $worktreeRoot -Event 'session.archive' -Extra @{ status = 'ok' }
  Write-Host 'Copilot session archive complete.' -ForegroundColor Green
}
finally {
  Pop-Location
}
