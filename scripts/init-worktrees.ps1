
# Monorepo_ModMe - Worktree Initialization Script
# Creates .worktrees/dev persistent checkout from main repo root.

param(
  [switch]$IncludeStaging
)

$ErrorActionPreference = "Stop"

# Avoid direnv LocationChanged errors during git worktree setup
$prevDirenvDisable = $env:DIRENV_DISABLE
$env:DIRENV_DISABLE = "1"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
. "$ScriptDir/lib/worktree-context.ps1"
$ProjectMainDir = Split-Path -Parent $ScriptDir
$ctx = Get-WorktreeContext -RepoRoot $ProjectMainDir
$MainRepoRoot = $ctx.MainRepoRoot
$ProjectName = Split-Path -Leaf $MainRepoRoot
$MonorepoRoot = Split-Path -Parent $MainRepoRoot

function Test-GitBranchExists {
  param([string]$BranchName)
  git -C $MainRepoRoot show-ref --verify --quiet "refs/heads/$BranchName" 2>$null
  return ($LASTEXITCODE -eq 0)
}

function Ensure-Branch ($BranchName) {
  if (Test-GitBranchExists $BranchName) {
    Write-Host "   Branch '$BranchName' already exists." -ForegroundColor Gray
    return
  }
  Write-Host "   Creating branch '$BranchName'..." -ForegroundColor Yellow
  git -C $MainRepoRoot branch $BranchName
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create branch '$BranchName'"
  }
  $remoteExists = git -C $MainRepoRoot ls-remote --heads origin $BranchName 2>$null
  if ($remoteExists) {
    Write-Host "   Remote branch '$BranchName' already exists on origin." -ForegroundColor Gray
  }
  else {
    git -C $MainRepoRoot push -u origin $BranchName 2>$null
    if ($LASTEXITCODE -eq 0) {
      Write-Host "   Pushed '$BranchName' to origin." -ForegroundColor Gray
    }
  }
}

try {
  Write-Host "===========================================" -ForegroundColor Cyan
  Write-Host "   Monorepo_ModMe WORKTREE INITIALIZATION" -ForegroundColor Cyan
  Write-Host "===========================================" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "   Project: $ProjectName" -ForegroundColor Green
  Write-Host "   Main Dir: $MainRepoRoot"
  Write-Host "   Root:     $($ctx.WorktreesRoot)"
  Write-Host "   Parent:   $MonorepoRoot"
  Write-Host ""

  if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Git is not installed."
  }

  Write-Host "Setting up branches..." -ForegroundColor Cyan
  Ensure-Branch "dev"
  if ($IncludeStaging) {
    Ensure-Branch "staging"
  }

  $WorktreesRoot = $ctx.WorktreesRoot
  if (!(Test-Path $WorktreesRoot)) {
    Write-Host "   Creating worktrees root at $WorktreesRoot..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $WorktreesRoot | Out-Null
  }

  $DevCheckout = $ctx.DevCheckout
  if (!(Test-Path $DevCheckout)) {
    Write-Host "   Creating persistent dev checkout at $DevCheckout..." -ForegroundColor Yellow
    git -C $MainRepoRoot worktree add $DevCheckout dev
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed to create dev worktree" }
    Write-Host "   Dev worktree created." -ForegroundColor Green
  }
  else {
    Write-Host "   Dev worktree already exists at $DevCheckout." -ForegroundColor DarkYellow
  }

  if ($IncludeStaging) {
    $StagingWorktreePath = Join-Path $MonorepoRoot "$ProjectName-staging"
    if (!(Test-Path $StagingWorktreePath)) {
      Write-Host "   Creating staging worktree at $StagingWorktreePath..." -ForegroundColor Yellow
      git -C $MainRepoRoot worktree add $StagingWorktreePath staging
      Write-Host "   Staging worktree created." -ForegroundColor Green
    }
    else {
      Write-Host "   Staging worktree already exists." -ForegroundColor DarkYellow
    }
  }

  Write-Host ""
  Write-Host "Initialization complete." -ForegroundColor Cyan
  Write-Host "   Next: .\scripts\new-agent-worktree.ps1 -Name `"my-task`" -Owner cursor" -ForegroundColor Cyan
}
finally {
  if ($null -eq $prevDirenvDisable) {
    Remove-Item Env:DIRENV_DISABLE -ErrorAction SilentlyContinue
  }
  else {
    $env:DIRENV_DISABLE = $prevDirenvDisable
  }
}
