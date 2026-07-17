# Relink agent worktrees to shared dependency junctions from .worktrees/dev
# Usage:
#   .\scripts\worktree-relink-deps.ps1                    # all agent worktrees
#   .\scripts\worktree-relink-deps.ps1 -WorktreePath <path> # single worktree
#   .\scripts\worktree-relink-deps.ps1 -Json

param(
  [string]$WorktreePath = '',
  [string]$SourceRoot = '',
  [switch]$Json
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib/worktree-context.ps1")
. (Join-Path $PSScriptRoot "lib/worktree-link-deps.ps1")

function Test-IsReparsePoint {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $false }
  $item = Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  if ($null -eq $item) { return $false }
  return [bool]($item.Attributes -band [IO.FileAttributes]::ReparsePoint)
}

function Get-DirectorySizeMb {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return 0 }
  if (Test-IsReparsePoint -Path $Path) { return 0 }
  $bytes = (Get-ChildItem -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue |
    Measure-Object -Property Length -Sum).Sum
  if ($null -eq $bytes) { return 0 }
  return [math]::Round($bytes / 1MB, 2)
}

function Remove-RealHeavyDir {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return $false }
  if (Test-IsReparsePoint -Path $Path) { return $false }
  Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
  return $true
}

$ctx = Get-WorktreeContext -RepoRoot (Split-Path -Parent $PSScriptRoot)
$mainRoot = $ctx.MainRepoRoot
$devCheckout = $ctx.DevCheckout
$worktreesRoot = $ctx.WorktreesRoot

if ([string]::IsNullOrWhiteSpace($SourceRoot)) {
  if (Test-Path $devCheckout) {
    $SourceRoot = $devCheckout
  }
  else {
    $SourceRoot = $mainRoot
  }
}
$SourceRoot = (Resolve-Path $SourceRoot).Path

$heavyRels = @(
  'node_modules',
  'GenerativeUI_monorepo/node_modules',
  'next-forge/node_modules',
  'GenerativeUI_monorepo/apps/agent-server/.venv'
)

$targets = @()
if (-not [string]::IsNullOrWhiteSpace($WorktreePath)) {
  $targets += (Resolve-Path $WorktreePath).Path
}
else {
  if (-not (Test-Path $worktreesRoot)) {
    Write-Error "No .worktrees directory at $worktreesRoot"
  }
  Get-ChildItem -LiteralPath $worktreesRoot -Directory | ForEach-Object {
    if ($_.Name -eq 'dev') { return }
    $targets += $_.FullName
  }
}

$results = @()

foreach ($wt in $targets) {
  $wt = (Resolve-Path $wt).Path
  if ($wt -eq $devCheckout) {
    continue
  }

  $removedMb = 0.0
  $removedDirs = @()

  & (Join-Path $PSScriptRoot 'worktree-copy-env.ps1') -SourceRoot $mainRoot -TargetRoot $wt

  foreach ($rel in $heavyRels) {
    $path = Join-Path $wt $rel
    if (-not (Test-Path $path)) { continue }
    if (Test-IsReparsePoint -Path $path) { continue }
    $sizeMb = Get-DirectorySizeMb -Path $path
    if (Remove-RealHeavyDir -Path $path) {
      $removedMb += $sizeMb
      $removedDirs += $rel
    }
  }

  $linkResult = Invoke-WorktreeLinkDeps -WorktreeRoot $wt -SourceRoot $SourceRoot

  $results += [PSCustomObject]@{
    worktree          = $wt
    source            = $linkResult.source
    linked            = @($linkResult.linked)
    failed            = @($linkResult.failed)
    removed_dirs      = $removedDirs
    removed_mb_estimate = $removedMb
  }
}

if ($Json) {
  $results | ConvertTo-Json -Depth 5
}
else {
  Write-Host "worktree-relink-deps: $($results.Count) worktree(s)" -ForegroundColor Cyan
  foreach ($r in $results) {
    Write-Host ""
    Write-Host "  $($r.worktree)" -ForegroundColor Yellow
    Write-Host "    source: $($r.source)"
    if ($r.linked.Count -gt 0) {
      Write-Host "    linked: $($r.linked -join ', ')" -ForegroundColor Green
    }
    if ($r.failed.Count -gt 0) {
      Write-Host "    failed: $($r.failed -join ', ')" -ForegroundColor DarkYellow
    }
    if ($r.removed_dirs.Count -gt 0) {
      Write-Host "    removed: $($r.removed_dirs -join ', ') (~$($r.removed_mb_estimate) MB)" -ForegroundColor Gray
    }
  }
}

$anyFailed = @($results | Where-Object { $_.failed.Count -gt 0 }).Count -gt 0
if ($anyFailed) { exit 1 }
exit 0
