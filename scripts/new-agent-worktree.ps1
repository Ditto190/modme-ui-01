
# Monorepo_ModMe - Agent worktree creation
# Usage: .\scripts\new-agent-worktree.ps1 -Name "auth-fix" -Owner cursor
# Agent root: WORKTREES_ROOT / -WorktreesRoot / legacy <repo>/.worktrees
# Golden shared-deps image remains at <repo>/.worktrees/dev

[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)]
  [string]$Name,

  [Parameter(Mandatory = $false)]
  [ValidateSet("cursor", "copilot", "claude", "antigravity", "human")]
  [string]$Owner = "cursor",

  [Parameter(Mandatory = $false)]
  [string]$WorktreesRoot
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Name)) {
  Write-Host @"

Usage:
  .\scripts\new-agent-worktree.ps1 -Name <task-slug> [-Owner cursor|copilot|claude|antigravity|human] [-WorktreesRoot <path>]

Examples:
  .\scripts\new-agent-worktree.ps1 -Name "auth-fix" -Owner cursor
  .\scripts\new-agent-worktree.ps1 -Name "api-refactor" -Owner copilot
  `$env:WORKTREES_ROOT = "D:\Github_Projects\worktrees\Monorepo_ModMe"
  .\scripts\new-agent-worktree.ps1 -Name "my-task" -Owner cursor

Run .\scripts\init-worktrees.ps1 first if .worktrees/dev does not exist.
Agent trees use WORKTREES_ROOT / -WorktreesRoot when set; otherwise <repo>/.worktrees.

"@ -ForegroundColor Yellow
  exit 1
}

$Name = $Name.Trim().ToLower() -replace '\s+', '-'

$prevDirenvDisable = $env:DIRENV_DISABLE
$env:DIRENV_DISABLE = "1"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectMainDir = Split-Path -Parent $ScriptDir
$ProjectName = Split-Path -Leaf $ProjectMainDir

. (Join-Path $ScriptDir "lib/worktree-context.ps1")
$AgentWorktreesRoot = Resolve-AgentWorktreesRoot -MainRepoRoot $ProjectMainDir -WorktreesRoot $WorktreesRoot
$GoldenDev = Get-GoldenDevCheckout -MainRepoRoot $ProjectMainDir

try {
  Write-Host "===========================================" -ForegroundColor Cyan
  Write-Host "   NEW AGENT WORKTREE" -ForegroundColor Cyan
  Write-Host "===========================================" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "   Feature: $Name"
  Write-Host "   Owner:   $Owner"
  Write-Host "   Root:    $AgentWorktreesRoot"
  Write-Host ""

  function Check-Git {
    if (!(Get-Command git -ErrorAction SilentlyContinue)) {
      Write-Error "Git is not installed."
    }
  }

  Check-Git

  if (!(Test-Path $GoldenDev)) {
    Write-Error "Golden .worktrees/dev not found at $GoldenDev. Run .\scripts\init-worktrees.ps1 first."
  }

  if (!(Test-Path $AgentWorktreesRoot)) {
    Write-Host "   Creating agent worktrees root at $AgentWorktreesRoot..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $AgentWorktreesRoot | Out-Null
  }

  Write-ModMeWorktreeResourceWarnings -AgentWorktreesRoot $AgentWorktreesRoot

  $BranchName = "feature/$Owner/$Name"
  if ($Owner -eq "human") {
    $FolderName = "dev-human-$Name"
  }
  else {
    $FolderName = "dev-agent-$Owner-$Name"
  }
  $TargetPath = Join-Path $AgentWorktreesRoot $FolderName

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

  Write-Host "Allocating ports..." -ForegroundColor Cyan
  & "$ScriptDir/worktree-allocate-ports.ps1" -WorktreePath $TargetPath
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "Copying essential env + lockfiles from main checkout..." -ForegroundColor Cyan
  & "$ScriptDir/worktree-copy-env.ps1" -SourceRoot $ProjectMainDir -TargetRoot $TargetPath
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "Linking shared deps from .worktrees/dev (junctions; no full install)..." -ForegroundColor Cyan
  $bootstrapLib = Join-Path $ScriptDir "lib/worktree-bootstrap.ps1"
  if (Test-Path $bootstrapLib) {
    . $bootstrapLib
    if (Test-Path $GoldenDev) {
      $linked = Invoke-WorktreeSharedDepJunctions -WorktreeRoot $TargetPath -DevCheckout $GoldenDev
      if (-not $linked) {
        Write-Host "   No junctions created - run yarn workspace:bootstrap in .worktrees/dev, then yarn worktree:relink-deps" -ForegroundColor DarkYellow
      }
    }
  }
  else {
    Write-Host "   worktree-bootstrap.ps1 missing - skip shared-deps link" -ForegroundColor DarkYellow
  }

  Write-Host "Installing git pre-commit hook..." -ForegroundColor Cyan
  & "$ScriptDir/install-git-hooks.ps1"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host ""
  Write-Host "Agent worktree ready (essential mirror + shared-deps)." -ForegroundColor Green
  Write-Host "   Path:   $TargetPath"
  Write-Host "   Branch: $BranchName"
  Write-Host "   Ports:  $TargetPath\.worktree-ports.env"
  Write-Host "   Root:   $AgentWorktreesRoot"
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
