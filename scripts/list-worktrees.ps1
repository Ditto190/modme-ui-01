
# Monorepo_ModMe - List git worktrees with assigned ports

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectMainDir = Split-Path -Parent $ScriptDir

. (Join-Path $ScriptDir "lib/worktree-context.ps1")
$ctx = Get-WorktreeContext -RepoRoot $ProjectMainDir

function Read-WorktreePorts($worktreePath) {
  $envFile = Join-Path $worktreePath ".worktree-ports.env"
  if (!(Test-Path $envFile)) {
    return $null
  }

  $ports = @{}
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Z_]+)=(\d+)\s*$') {
      $ports[$Matches[1]] = $Matches[2]
    }
  }
  return $ports
}

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   GIT WORKTREES" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agent worktrees root: $($ctx.WorktreesRoot)" -ForegroundColor Gray
Write-Host "Golden .worktrees/dev: $($ctx.DevCheckout)" -ForegroundColor Gray
if ($ctx.WorktreesRoot -ne [System.IO.Path]::GetFullPath($ctx.LegacyWorktreesRoot)) {
  Write-Host "Legacy root (still scanned via git): $($ctx.LegacyWorktreesRoot)" -ForegroundColor DarkYellow
}
Write-Host ""

$lines = git -C $ProjectMainDir worktree list --porcelain
if ($LASTEXITCODE -ne 0) {
  Write-Error "git worktree list failed"
}

$entries = @()
$current = @{}

foreach ($line in $lines) {
  if ($line -match '^worktree (.+)$') {
    if ($current.Count -gt 0) { $entries += [PSCustomObject]$current }
    $current = @{ Path = $Matches[1] }
  }
  elseif ($line -match '^branch (.+)$') {
    $current.Branch = $Matches[1] -replace '^refs/heads/', ''
  }
  elseif ($line -match '^HEAD ([a-f0-9]+)$') {
    $current.Head = $Matches[1]
  }
  elseif ($line -eq 'bare') {
    $current.Bare = $true
  }
  elseif ($line -eq 'locked') {
    $current.Locked = $true
  }
}
if ($current.Count -gt 0) { $entries += [PSCustomObject]$current }

foreach ($entry in $entries) {
  $path = $entry.Path
  $branch = if ($entry.Branch) { $entry.Branch } else { "(detached)" }
  Write-Host $path -ForegroundColor Green
  Write-Host "   branch: $branch"

  $ports = Read-WorktreePorts $path
  if ($ports) {
    Write-Host "   slot:   $($ports.WORKTREE_SLOT)" -ForegroundColor Cyan
    Write-Host "   ports:  vibe=$($ports.VIBE_WEB_PORT) dashboard=$($ports.WEB_DASHBOARD_PORT) agent=$($ports.AGENT_SERVER_PORT)"
  }
  else {
    Write-Host "   ports:  (main checkout - use launch-manifest defaults)" -ForegroundColor DarkYellow
  }
  Write-Host ""
}

Write-Host "Total worktrees: $($entries.Count)"
