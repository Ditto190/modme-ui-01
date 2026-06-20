
# Monorepo_ModMe - Worktree Initialization Script
# Creates ../Monorepo_ModMe-dev/dev persistent checkout from main repo root.

param(
  [switch]$IncludeStaging
)

$ErrorActionPreference = "Stop"

# Avoid direnv LocationChanged errors during git worktree setup
$prevDirenvDisable = $env:DIRENV_DISABLE
$env:DIRENV_DISABLE = "1"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectMainDir = Split-Path -Parent $ScriptDir
$ProjectName = Split-Path -Leaf $ProjectMainDir
$MonorepoRoot = Split-Path -Parent $ProjectMainDir

function Test-GitBranchExists {
  param([string]$BranchName)
  git -C $ProjectMainDir show-ref --verify --quiet "refs/heads/$BranchName" 2>$null
  return ($LASTEXITCODE -eq 0)
}

function Ensure-Branch ($BranchName) {
  if (Test-GitBranchExists $BranchName) {
    Write-Host "   Branch '$BranchName' already exists." -ForegroundColor Gray
    return
  }
  Write-Host "   Creating branch '$BranchName'..." -ForegroundColor Yellow
  git -C $ProjectMainDir branch $BranchName
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create branch '$BranchName'"
  }
  $remoteExists = git -C $ProjectMainDir ls-remote --heads origin $BranchName 2>$null
  if ($remoteExists) {
    Write-Host "   Remote branch '$BranchName' already exists on origin." -ForegroundColor Gray
  }
  else {
    git -C $ProjectMainDir push -u origin $BranchName 2>$null
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
  Write-Host "   Main Dir: $ProjectMainDir"
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

  $DevWorktreePath = Join-Path $MonorepoRoot "$ProjectName-dev"
  if (!(Test-Path $DevWorktreePath)) {
    Write-Host "   Creating dev worktree root at $DevWorktreePath..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $DevWorktreePath | Out-Null
  }

  $DevCheckout = Join-Path $DevWorktreePath "dev"
  if (!(Test-Path $DevCheckout)) {
    Write-Host "   Creating persistent dev checkout at $DevCheckout..." -ForegroundColor Yellow
    git -C $ProjectMainDir worktree add $DevCheckout dev
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
      git -C $ProjectMainDir worktree add $StagingWorktreePath staging
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
