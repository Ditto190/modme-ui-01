#Requires -Version 5.1
<#
.SYNOPSIS
  Re-link agent worktree heavy deps to .worktrees/dev via junctions (Windows).
#>
param(
  [string]$WorktreePath = '',
  [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
  @'
worktree-relink-deps.ps1 — remove local heavy deps and junction from .worktrees/dev

  -WorktreePath  Target worktree (default: git toplevel from cwd)
'@
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = if ($WorktreePath) { (Resolve-Path $WorktreePath).Path } else {
  $top = ([string](git rev-parse --show-toplevel 2>$null)).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($top)) {
    throw 'Not inside a git worktree. Pass -WorktreePath explicitly.'
  }
  $top
}

. (Join-Path $ScriptDir 'lib/worktree-context.ps1')
. (Join-Path $ScriptDir 'lib/worktree-bootstrap.ps1')

$ctx = Get-WorktreeContext -RepoRoot $RepoRoot
if (-not (Test-Path $ctx.DevCheckout)) {
  throw "Golden dev checkout missing at $($ctx.DevCheckout). Run .\scripts\init-worktrees.ps1 and yarn workspace:bootstrap first."
}

if (-not (Test-ModMeIsWindows)) {
  Write-Warning 'Junction relink is Windows-only. Run yarn install in the worktree instead.'
  exit 0
}

$linked = Invoke-WorktreeSharedDepJunctions -WorktreeRoot $RepoRoot -DevCheckout $ctx.DevCheckout
if (-not $linked) {
  Write-Warning 'No junctions created — ensure .worktrees/dev has installed dependencies.'
  exit 1
}

Write-Host 'Worktree dependency relink complete.' -ForegroundColor Green
