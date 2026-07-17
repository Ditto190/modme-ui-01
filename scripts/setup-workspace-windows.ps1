# Native workspace bootstrap (no devcontainer) — Windows entry point.
# Usage: .\scripts\setup-workspace-windows.ps1 [-Lite] [-SkipSession]

[CmdletBinding()]
param(
  [string]$WorktreeRoot = (Get-Location).Path,

  [string]$SourceRoot,

  [switch]$Lite,

  [switch]$SharedDeps,

  [switch]$Full,

  [switch]$SkipSession
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
. "$ScriptDir/lib/worktree-context.ps1"
. "$ScriptDir/lib/worktree-bootstrap.ps1"

$WorktreeRoot = (Resolve-Path $WorktreeRoot).Path
$ctx = Get-WorktreeContext -RepoRoot $WorktreeRoot

Write-Host ""
Write-Host "   Native workspace bootstrap" -ForegroundColor Cyan
Write-Host "   Repo:        $($ctx.RepoRoot)"
Write-Host "   Main:        $($ctx.MainRepoRoot)"
Write-Host "   Branch:      $($ctx.Branch)"
Write-Host "   Is worktree: $($ctx.IsWorktree)"
Write-Host "   Dev checkout: $($ctx.DevCheckout)"
Write-Host ""

$loadLeanCtx = Join-Path $ScriptDir "load-lean-ctx-env.ps1"
if (Test-Path $loadLeanCtx) {
  . $loadLeanCtx -RepoRoot $WorktreeRoot | Out-Null
  if ($env:LEAN_CTX_DATA_DIR) {
    Write-Host "   lean-ctx data:  $($env:LEAN_CTX_DATA_DIR)" -ForegroundColor Gray
  }
  if ($env:LEAN_CTX_STATE_DIR) {
    Write-Host "   lean-ctx state: $($env:LEAN_CTX_STATE_DIR)" -ForegroundColor Gray
  }
  if ($env:LEAN_CTX_CACHE_DIR) {
    Write-Host "   lean-ctx cache: $($env:LEAN_CTX_CACHE_DIR)" -ForegroundColor Gray
  }
  Write-Host ""
}

if ($ctx.IsMainCheckout) {
  & "$ScriptDir/ensure-worktree.ps1" -WarnOnly
  Write-Host ""
}

if ([string]::IsNullOrWhiteSpace($SourceRoot)) {
  if ($env:ROOT_WORKTREE_PATH) {
    $SourceRoot = $env:ROOT_WORKTREE_PATH
  }
  else {
    $SourceRoot = $ctx.MainRepoRoot
  }
}

Invoke-WorktreeBootstrap `
  -WorktreeRoot $WorktreeRoot `
  -SourceRoot $SourceRoot `
  -Lite:$Lite `
  -SharedDeps:$SharedDeps `
  -Full:$Full `
  -SkipSession:$SkipSession

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $Lite) {
  Write-Host "Ensuring lean-ctx configuration..." -ForegroundColor Cyan
  Push-Location $WorktreeRoot
  yarn lean-ctx:ensure
  if ($LASTEXITCODE -ne 0) {
    Write-Host "   lean-ctx:ensure reported issues (continuing)" -ForegroundColor DarkYellow
  }

  $intelBootstrap = Join-Path $ScriptDir "lean-ctx-session-bootstrap.ps1"
  if (Test-Path $intelBootstrap) {
    & $intelBootstrap -RepoRoot $WorktreeRoot
  }
  Pop-Location
  Write-Host ""
}

if (-not $SkipSession -and -not $Lite) {
  $sessionScript = Join-Path $ScriptDir "agent-session-start.ps1"
  if (Test-Path $sessionScript) {
    Write-Host "Starting agent session (intelligence bootstrap)..." -ForegroundColor Cyan
    $branch = git -C $WorktreeRoot branch --show-current 2>$null
    $taskTitle = if ($branch -match 'feature/[^/]+/(.+)') {
      $Matches[1] -replace '-', ' '
    }
    else {
      "worktree: $branch"
    }
    & $sessionScript -TaskTitle $taskTitle -SkipBeads -BootstrapIntelligence
    if ($LASTEXITCODE -ne 0) {
      Write-Host "   agent-session-start reported issues (continuing)" -ForegroundColor DarkYellow
    }
  }
}

Write-Host ""
Write-Host "Workspace bootstrap complete." -ForegroundColor Green
