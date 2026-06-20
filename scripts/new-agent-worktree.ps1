
# Monorepo_ModMe - Agent worktree creation
# Usage: .\scripts\new-agent-worktree.ps1 -Name "auth-fix" -Owner cursor

[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)]
  [string]$Name,

  [Parameter(Mandatory = $false)]
  [ValidateSet("cursor", "copilot", "claude", "antigravity", "human")]
  [string]$Owner = "cursor"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Name)) {
  Write-Host @"

Usage:
  .\scripts\new-agent-worktree.ps1 -Name <task-slug> [-Owner cursor|copilot|claude|antigravity|human]

Examples:
  .\scripts\new-agent-worktree.ps1 -Name "auth-fix" -Owner cursor
  .\scripts\new-agent-worktree.ps1 -Name "api-refactor" -Owner copilot

Run .\scripts\init-worktrees.ps1 first if Monorepo_ModMe-dev does not exist.

"@ -ForegroundColor Yellow
  exit 1
}

$Name = $Name.Trim().ToLower() -replace '\s+', '-'

$prevDirenvDisable = $env:DIRENV_DISABLE
$env:DIRENV_DISABLE = "1"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectMainDir = Split-Path -Parent $ScriptDir
$ProjectName = Split-Path -Leaf $ProjectMainDir
$MonorepoRoot = Split-Path -Parent $ProjectMainDir
$DevWorktreeRoot = Join-Path $MonorepoRoot "$ProjectName-dev"

try {
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   NEW AGENT WORKTREE" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Feature: $Name"
Write-Host "   Owner:   $Owner"
Write-Host ""

function Check-Git {
  if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Git is not installed."
  }
}

Check-Git

if (!(Test-Path $DevWorktreeRoot)) {
  Write-Error "Dev worktree root not found at $DevWorktreeRoot. Run .\scripts\init-worktrees.ps1 first."
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

Write-Host "Allocating ports..." -ForegroundColor Cyan
& "$ScriptDir/worktree-allocate-ports.ps1" -WorktreePath $TargetPath
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Copying .env files from main checkout..." -ForegroundColor Cyan
& "$ScriptDir/worktree-copy-env.ps1" -SourceRoot $ProjectMainDir -TargetRoot $TargetPath
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Installing git pre-commit hook..." -ForegroundColor Cyan
& "$ScriptDir/install-git-hooks.ps1"
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
