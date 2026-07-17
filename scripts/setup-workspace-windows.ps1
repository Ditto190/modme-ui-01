#Requires -Version 5.1
<#
.SYNOPSIS
  Bootstrap the current checkout — full, shared-deps, or lite.
#>
param(
  [switch]$Full,
  [switch]$SharedDeps,
  [switch]$Lite,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
  @'
setup-workspace-windows.ps1 — worktree bootstrap entrypoint

  -Full         Full yarn install in current checkout
  -SharedDeps   Junction-link heavy deps from .worktrees/dev when possible
  -Lite         Env + ports + hooks only
'@
  exit 0
}

if (-not ($Full -or $SharedDeps -or $Lite)) {
  $SharedDeps = $true
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir

. (Join-Path $ScriptDir 'lib/worktree-context.ps1')
. (Join-Path $ScriptDir 'lib/worktree-bootstrap.ps1')

$ctx = Get-WorktreeContext -RepoRoot $RepoRoot
$sourceRoot = if ($ctx.IsWorktree) { $ctx.MainRepoRoot } else { $ctx.RepoRoot }

Invoke-WorktreeBootstrap -WorktreeRoot $ctx.RepoRoot -SourceRoot $sourceRoot -Full:$Full -SharedDeps:$SharedDeps -Lite:$Lite -SkipSession
exit $LASTEXITCODE
