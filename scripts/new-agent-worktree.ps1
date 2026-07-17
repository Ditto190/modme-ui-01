
# Monorepo_ModMe - Agent worktree creation
# Usage: .\scripts\new-agent-worktree.ps1 -Name "auth-fix" -Owner cursor [-SharedDeps] [-FullBootstrap]

[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)]
  [string]$Name,

  [Parameter(Mandatory = $false)]
  [ValidateSet("cursor", "copilot", "claude", "antigravity", "human")]
  [string]$Owner = "cursor",

  [switch]$SharedDeps,

  [switch]$FullBootstrap
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Name)) {
  Write-Host @"

Usage:
  .\scripts\new-agent-worktree.ps1 -Name <task-slug> [-Owner cursor|copilot|claude|antigravity|human] [-SharedDeps] [-FullBootstrap]

Examples:
  .\scripts\new-agent-worktree.ps1 -Name "auth-fix" -Owner cursor
  .\scripts\new-agent-worktree.ps1 -Name "api-refactor" -Owner copilot -FullBootstrap

Run .\scripts\init-worktrees.ps1 first if .worktrees/dev does not exist.
Default bootstrap: shared-deps (junctions from .worktrees/dev).

"@ -ForegroundColor Yellow
  exit 1
}

$Name = $Name.Trim().ToLower() -replace '\s+', '-'

if ($FullBootstrap) {
  $SharedDeps = $false
}
elseif (-not $PSBoundParameters.ContainsKey('SharedDeps')) {
  $SharedDeps = $true
}

$prevDirenvDisable = $env:DIRENV_DISABLE
$env:DIRENV_DISABLE = "1"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectMainDir = Split-Path -Parent $ScriptDir
$ProjectName = Split-Path -Leaf $ProjectMainDir
$DevWorktreeRoot = Join-Path $ProjectMainDir ".worktrees"

try {
  Write-Host "===========================================" -ForegroundColor Cyan
  Write-Host "   NEW AGENT WORKTREE" -ForegroundColor Cyan
  Write-Host "===========================================" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "   Feature: $Name"
  Write-Host "   Owner:   $Owner"
  if ($FullBootstrap) {
    Write-Host "   Bootstrap: full install" -ForegroundColor DarkYellow
  }
  elseif ($SharedDeps) {
    Write-Host "   Bootstrap: shared-deps (junctions)" -ForegroundColor DarkYellow
  }
  Write-Host ""

  function Check-Git {
    if (!(Get-Command git -ErrorAction SilentlyContinue)) {
      Write-Error "Git is not installed."
    }
  }

  Check-Git

  if (!(Test-Path $DevWorktreeRoot)) {
    Write-Error "Worktrees root not found at $DevWorktreeRoot. Run .\scripts\init-worktrees.ps1 first."
  }

  $BranchName = "feature/$Owner/$Name"
  if ($Owner -eq "human") {
    $FolderName = "dev-human-$Name"
  }
  else {
    $FolderName = "dev-agent-$Owner-$Name"
  }
  $TargetPath = Join-Path $DevWorktreeRoot $FolderName

  if (Test-Path $TargetPath) {
    Write-Error "Worktree path already exists: $TargetPath"
  }

  Write-Host "Creating worktree for '$BranchName'..." -ForegroundColor Yellow

  $branchExists = $false
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  git -C $ProjectMainDir show-ref --verify --quiet "refs/heads/$BranchName" 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $branchExists = $true }
  $ErrorActionPreference = $prevEap

  if ($branchExists) {
    Write-Host "   Branch exists. Attaching worktree..." -ForegroundColor Yellow
    git -C $ProjectMainDir worktree add $TargetPath $BranchName
  }
  else {
    Write-Host "   Creating new branch from dev..." -ForegroundColor Yellow
    git -C $ProjectMainDir worktree add -b $BranchName $TargetPath dev
  }

  if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create worktree at $TargetPath"
  }

  . "$ScriptDir/lib/worktree-bootstrap.ps1"
  $devCheckout = Join-Path $DevWorktreeRoot "dev"
  $sourceRoot = if (Test-Path $devCheckout) { $devCheckout } else { $ProjectMainDir }

  if ($FullBootstrap) {
    Invoke-WorktreeBootstrap -WorktreeRoot $TargetPath -SourceRoot $ProjectMainDir -Full -SkipSession
  }
  elseif ($SharedDeps) {
    Invoke-WorktreeBootstrap -WorktreeRoot $TargetPath -SourceRoot $sourceRoot -SharedDeps -SkipSession
  }
  else {
    Invoke-WorktreeBootstrap -WorktreeRoot $TargetPath -SourceRoot $ProjectMainDir -Lite -SkipSession
    & "$ScriptDir/install-git-hooks.ps1"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host ""
  Write-Host "Agent worktree ready." -ForegroundColor Green
  Write-Host "   Path:   $TargetPath"
  Write-Host "   Branch: $BranchName"
  Write-Host "   Ports:  $TargetPath\.worktree-ports.env"
  Write-Host ""
  Write-Host "   Open this folder in your IDE, or let Cursor Agents Window bootstrap via .cursor/worktrees.json"
}
finally {
  if ($null -eq $prevDirenvDisable) {
    Remove-Item Env:DIRENV_DISABLE -ErrorAction SilentlyContinue
  }
  else {
    $env:DIRENV_DISABLE = $prevDirenvDisable
  }
}
