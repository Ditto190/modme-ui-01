
# Universal Workbench - Worktree Initialization Script
# Implements Zyahav's workflow for Windows

$ErrorActionPreference = "Stop"

# --- Detect Root ---
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectMainDir = Split-Path -Parent $ScriptDir
$ProjectName = Split-Path -Leaf $ProjectMainDir
$MonorepoRoot = Split-Path -Parent $ProjectMainDir

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   🚀 UNIVERSAL WORKBENCH INITIALIZATION" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Project: $ProjectName" -ForegroundColor Green
Write-Host "   Main Dir: $ProjectMainDir"
Write-Host "   Root Dir: $MonorepoRoot"
Write-Host ""

# --- Helper Functions ---
function Check-Git {
    if (!(Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Error "❌ Git is not installed."
    }
}

function Ensure-Branch ($BranchName) {
    if (!(git show-ref --verify --quiet refs/heads/$BranchName)) {
        Write-Host "   Creating branch '$BranchName'..." -ForegroundColor Yellow
        git branch $BranchName
        git push origin $BranchName
    } else {
        Write-Host "   Branch '$BranchName' already exists." -ForegroundColor Gray
    }
}

# --- Execution ---
Check-Git

Set-Location $ProjectMainDir

# 1. Setup Branches
Write-Host "🌱 Setting up branches..." -ForegroundColor Cyan
Ensure-Branch "dev"
Ensure-Branch "staging"

# 2. Setup Dev Worktree
$DevWorktreePath = Join-Path $MonorepoRoot "$ProjectName-dev"
if (!(Test-Path $DevWorktreePath)) {
    Write-Host "   Creating Dev Worktree at $DevWorktreePath..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $DevWorktreePath | Out-Null
    # We create the 'dev' worktree inside a 'dev' subdirectory to allow for multiple agent worktrees later
    # Structure: UniversalWorkbench-dev/dev (the persistent dev branch)
    # Structure: UniversalWorkbench-dev/dev-agent-feature (feature branches)
    
    $DevCheckout = Join-Path $DevWorktreePath "dev"
    git worktree add $DevCheckout dev
    Write-Host "   ✅ Dev worktree created." -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Dev worktree path already exists." -ForegroundColor DarkYellow
}

# 3. Setup Staging Worktree
$StagingWorktreePath = Join-Path $MonorepoRoot "$ProjectName-staging"
if (!(Test-Path $StagingWorktreePath)) {
    Write-Host "   Creating Staging Worktree at $StagingWorktreePath..." -ForegroundColor Yellow
    git worktree add $StagingWorktreePath staging
    Write-Host "   ✅ Staging worktree created." -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Staging worktree path already exists." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "✨ Initialization Complete!" -ForegroundColor Cyan
Write-Host "   Use 'scripts/new-feature.ps1' to start working." -ForegroundColor Cyan
