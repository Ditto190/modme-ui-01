
# Universal Workbench - Feature Creation Script
# Usage: ./new-feature.ps1 -Name "feature-name" -Owner "agent|human"

param (
  [Parameter(Mandatory = $true)]
  [string]$Name,

  [Parameter(Mandatory = $false)]
  [ValidateSet("agent", "human")]
  [string]$Owner = "human"
)

$ErrorActionPreference = "Stop"

# --- Detect Root ---
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectMainDir = Split-Path -Parent $ScriptDir
$ProjectName = Split-Path -Leaf $ProjectMainDir
$MonorepoRoot = Split-Path -Parent $ProjectMainDir

# Directory where features live (Parallel to main)
$DevWorktreeRoot = Join-Path $MonorepoRoot "$ProjectName-dev"

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   🚀 NEW FEATURE WORKTREE" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Feature: $Name"
Write-Host "   Owner:   $Owner"
Write-Host ""

# --- Helper Functions ---
function Check-Git {
  if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "❌ Git is not installed."
  }
}

# --- Execution ---
Check-Git

if (!(Test-Path $DevWorktreeRoot)) {
  Write-Error "❌ Dev worktree root not found at $DevWorktreeRoot. Run init-worktrees.ps1 first."
}

# 1. Naming Standards
$Env = "dev"
$BranchName = "feature/$Owner/$Name"
$FolderName = "$Env-$Owner-$Name"
$ TargetPath = Join-Path $DevWorktreeRoot $FolderName

# 2. Create Worktree
Write-Host "🌱 Creating worktree for '$BranchName'..." -ForegroundColor Yellow

# Check if branch exists
$BranchExists = git rev-parse --verify $BranchName *>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host "   Branch exists. Attaching worktree..." -ForegroundColor Yellow
  git -C $ProjectMainDir worktree add $TargetPath $BranchName
}
else {
  Write-Host "   Creating new branch from dev..." -ForegroundColor Yellow
  git -C $ProjectMainDir worktree add -b $BranchName $TargetPath dev
}

# 3. Environment Setup
$EnvFile = Join-Path $ProjectMainDir ".env"
$TargetEnvFile = Join-Path $TargetPath ".env"

if (Test-Path $EnvFile) {
  Write-Host "   Copying .env file..." -ForegroundColor Green
  Copy-Item $EnvFile $TargetEnvFile -Force
}
else {
  Write-Host "   ⚠️  No .env file found in main repo to copy." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "🎉 Feature '$Name' Ready!" -ForegroundColor Green
Write-Host "   Path: $TargetPath"
Write-Host "   To start: cd `"$TargetPath`""
Write-Host ""
