#Requires -Version 5.1
<#
.SYNOPSIS
  Shared worktree bootstrap used by Copilot workspace and other entry points.

.DESCRIPTION
  Invoke-WorktreeBootstrap copies env, optionally installs shared deps, always
  soft-starts the KM agent data plane (unless -SkipKm), then optionally starts
  an agent session envelope.

  Called from scripts/copilot-workspace/bootstrap.ps1 with -SharedDeps -SkipSession.
#>

function Invoke-WorktreeBootstrap {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorktreeRoot,

    [Parameter(Mandatory = $true)]
    [string]$SourceRoot,

    [switch]$SharedDeps,
    [switch]$SkipSession,
    [switch]$SkipKm,
    [switch]$SkipHooks
  )

  $ErrorActionPreference = 'Stop'
  $WorktreeRoot = (Resolve-Path $WorktreeRoot).Path
  $SourceRoot = (Resolve-Path $SourceRoot).Path
  $scripts = Join-Path $WorktreeRoot 'scripts'

  Write-Host "Invoke-WorktreeBootstrap" -ForegroundColor Cyan
  Write-Host "  worktree: $WorktreeRoot"
  Write-Host "  source:   $SourceRoot"

  $copyEnv = Join-Path $scripts 'worktree-copy-env.ps1'
  if (Test-Path $copyEnv) {
    Write-Host '  Copying .env / lockfiles from source...' -ForegroundColor Cyan
    & $copyEnv -SourceRoot $SourceRoot -TargetRoot $WorktreeRoot
    if ($LASTEXITCODE -ne 0) { return $LASTEXITCODE }
  }

  if ($SharedDeps) {
    Write-Host '  SharedDeps: yarn (GenerativeUI) + bun (next-forge)...' -ForegroundColor Cyan
    $genUi = Join-Path $WorktreeRoot 'GenerativeUI_monorepo'
    if (Test-Path (Join-Path $genUi 'package.json')) {
      Push-Location $genUi
      try {
        yarn install
        if ($LASTEXITCODE -ne 0) {
          Write-Warning "yarn install in GenerativeUI_monorepo failed (exit $LASTEXITCODE) — continuing"
        }
      }
      finally { Pop-Location }
    }
    $forge = Join-Path $WorktreeRoot 'next-forge'
    if (Test-Path (Join-Path $forge 'package.json')) {
      Push-Location $forge
      try {
        npx bun install
        if ($LASTEXITCODE -ne 0) {
          Write-Warning "bun install in next-forge failed (exit $LASTEXITCODE) — continuing"
        }
      }
      finally { Pop-Location }
    }
  }

  if (-not $SkipHooks) {
    $hooks = Join-Path $scripts 'install-git-hooks.ps1'
    if (Test-Path $hooks) {
      Write-Host '  Installing git hooks...' -ForegroundColor Cyan
      & $hooks
      if ($LASTEXITCODE -ne 0) {
        Write-Warning "install-git-hooks failed (exit $LASTEXITCODE) — continuing"
      }
    }
  }

  # KM agent data plane — soft unless caller uses km-session-bootstrap -Strict separately
  if (-not $SkipKm) {
    $km = Join-Path $scripts 'km-session-bootstrap.ps1'
    if (Test-Path $km) {
      Write-Host '  KM data plane (soft)...' -ForegroundColor Cyan
      & $km
      # Soft: never fail product/copilot bootstrap on KM warnings
    }
    else {
      Write-Warning "Missing $km — KM bootstrap skipped"
    }
  }

  if (-not $SkipSession) {
    $session = Join-Path $scripts 'agent-session-start.ps1'
    if (Test-Path $session) {
      Write-Host '  Agent session start...' -ForegroundColor Cyan
      $branch = git -C $WorktreeRoot branch --show-current 2>$null
      $taskTitle = if ($branch) { "worktree: $branch" } else { 'worktree bootstrap' }
      & $session -TaskTitle $taskTitle -SkipBeads
      if ($LASTEXITCODE -ne 0) { return $LASTEXITCODE }
    }
  }

  Write-Host 'Invoke-WorktreeBootstrap complete.' -ForegroundColor Green
  return 0
}
