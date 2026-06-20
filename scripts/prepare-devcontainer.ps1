#!/usr/bin/env pwsh
# DevContainer Transition Helper Script
# Prepares the repository for seamless DevContainer usage

Write-Host "🚀 ModMe GenUI - DevContainer Transition Helper" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running in VS Code
if (-not $env:TERM_PROGRAM -eq "vscode") {
    Write-Host "⚠️  Warning: This script is designed to run in VS Code" -ForegroundColor Yellow
    Write-Host ""
}

# Step 1: Verify prerequisites
Write-Host "📋 Step 1: Verifying Prerequisites..." -ForegroundColor Green
Write-Host ""

# Check Docker
Write-Host "  Checking Docker..." -NoNewline
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host " ✅ Docker installed: $dockerVersion" -ForegroundColor Green
    }
    else {
        Write-Host " ❌ Docker not found" -ForegroundColor Red
        Write-Host "     Install Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
        exit 1
    }
}
catch {
    Write-Host " ❌ Docker not found" -ForegroundColor Red
    Write-Host "     Install Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

# Check VS Code Dev Containers extension
Write-Host "  Checking VS Code extensions..." -NoNewline
$extensions = code --list-extensions 2>$null
if ($extensions -contains "ms-vscode-remote.remote-containers") {
    Write-Host " ✅ Dev Containers extension installed" -ForegroundColor Green
}
else {
    Write-Host " ⚠️  Dev Containers extension not found" -ForegroundColor Yellow
    Write-Host "     Install: https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers" -ForegroundColor Yellow
    Write-Host "     Or run: code --install-extension ms-vscode-remote.remote-containers" -ForegroundColor Yellow
}

Write-Host ""

# Step 2: Check repository status
Write-Host "📋 Step 2: Checking Repository Status..." -ForegroundColor Green
Write-Host ""

# Check for uncommitted changes
$gitStatus = git status --porcelain 2>$null
if ($gitStatus) {
    Write-Host "  ⚠️  You have uncommitted changes:" -ForegroundColor Yellow
    Write-Host ""
    git status --short
    Write-Host ""
    $commit = Read-Host "  Commit changes before proceeding? (y/N)"
    if ($commit -eq "y" -or $commit -eq "Y") {
        $message = Read-Host "  Enter commit message"
        git add .
        git commit -m "$message"
        Write-Host "  ✅ Changes committed" -ForegroundColor Green
    }
    else {
        Write-Host "  ⚠️  Continuing with uncommitted changes" -ForegroundColor Yellow
    }
}
else {
    Write-Host "  ✅ No uncommitted changes" -ForegroundColor Green
}

Write-Host ""

# Step 3: Create backup branch
Write-Host "📋 Step 3: Creating Backup Branch..." -ForegroundColor Green
Write-Host ""

$currentBranch = git branch --show-current
$backupBranch = "backup/pre-devcontainer-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

git branch $backupBranch 2>$null
if ($?) {
    Write-Host "  ✅ Backup branch created: $backupBranch" -ForegroundColor Green
}
else {
    Write-Host "  ⚠️  Could not create backup branch" -ForegroundColor Yellow
}

Write-Host ""

# Step 4: Verify DevContainer files
Write-Host "📋 Step 4: Verifying DevContainer Configuration..." -ForegroundColor Green
Write-Host ""

$requiredFiles = @(
    ".devcontainer/devcontainer.json",
    ".devcontainer/Dockerfile",
    ".devcontainer/post-create.sh",
    ".dockerignore"
)

$allFilesPresent = $true
foreach ($file in $requiredFiles) {
    Write-Host "  Checking $file..." -NoNewline
    if (Test-Path $file) {
        Write-Host " ✅" -ForegroundColor Green
    }
    else {
        Write-Host " ❌ Missing" -ForegroundColor Red
        $allFilesPresent = $false
    }
}

if (-not $allFilesPresent) {
    Write-Host ""
    Write-Host "  ❌ Some required files are missing. Cannot proceed." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 5: Check environment configuration
Write-Host "📋 Step 5: Checking Environment Configuration..." -ForegroundColor Green
Write-Host ""

if (Test-Path ".env") {
    Write-Host "  ✅ .env file exists" -ForegroundColor Green
    
    # Check for GOOGLE_API_KEY
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "GOOGLE_API_KEY=.+") {
        Write-Host "  ✅ GOOGLE_API_KEY is set" -ForegroundColor Green
    }
    else {
        Write-Host "  ⚠️  GOOGLE_API_KEY not set in .env" -ForegroundColor Yellow
        Write-Host "     You'll need to set this after opening in DevContainer" -ForegroundColor Yellow
    }
}
else {
    Write-Host "  ⚠️  .env file not found" -ForegroundColor Yellow
    Write-Host "     post-create.sh will create it from .env.example" -ForegroundColor Yellow
}

Write-Host ""

# Step 6: Pre-transition checklist
Write-Host "📋 Step 6: Pre-Transition Checklist" -ForegroundColor Green
Write-Host ""

Write-Host "  Please verify:" -ForegroundColor White
Write-Host "  [ ] Docker Desktop is running" -ForegroundColor White
Write-Host "  [ ] All local servers are stopped (npm run dev)" -ForegroundColor White
Write-Host "  [ ] You have saved all open files" -ForegroundColor White
Write-Host "  [ ] You're ready to wait 5-10 minutes for first build" -ForegroundColor White
Write-Host ""

$ready = Read-Host "  Are you ready to open in DevContainer? (y/N)"
if ($ready -ne "y" -and $ready -ne "Y") {
    Write-Host ""
    Write-Host "  Transition cancelled. Run this script again when ready." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  📚 Resources:" -ForegroundColor Cyan
    Write-Host "     - Readiness Checklist: DEVCONTAINER_READINESS_CHECKLIST.md" -ForegroundColor White
    Write-Host "     - Setup Guide: .devcontainer/README.md" -ForegroundColor White
    Write-Host "     - Quick Start: .devcontainer/QUICKSTART.md" -ForegroundColor White
    exit 0
}

Write-Host ""

# Step 7: Open in DevContainer
Write-Host "📋 Step 7: Opening in DevContainer..." -ForegroundColor Green
Write-Host ""

Write-Host "  ℹ️  Instructing VS Code to reopen in container..." -ForegroundColor Cyan
Write-Host ""
Write-Host "  What happens next:" -ForegroundColor White
Write-Host "    1. VS Code will reload and start building the container" -ForegroundColor Gray
Write-Host "    2. First build takes 5-10 minutes (subsequent builds are faster)" -ForegroundColor Gray
Write-Host "    3. post-create.sh will run automatically to install dependencies" -ForegroundColor Gray
Write-Host "    4. You'll see a terminal with the setup progress" -ForegroundColor Gray
Write-Host ""
Write-Host "  📝 After the container starts:" -ForegroundColor White
Write-Host "    - Run: npm run dev" -ForegroundColor Gray
Write-Host "    - Check: http://localhost:3000 (forwarded port)" -ForegroundColor Gray
Write-Host "    - Test: curl http://localhost:8000/health" -ForegroundColor Gray
Write-Host ""

# Trigger DevContainer open
code --folder-uri "vscode-remote://dev-container+$(Get-Location | ForEach-Object {$_.Path.Replace('\','/')})/workspaces/modme-ui-01"

Write-Host "  ✅ DevContainer open command sent!" -ForegroundColor Green
Write-Host ""
Write-Host "  If the container doesn't open automatically:" -ForegroundColor Yellow
Write-Host "    1. Open VS Code Command Palette (Ctrl+Shift+P)" -ForegroundColor Gray
Write-Host "    2. Type: 'Reopen in Container'" -ForegroundColor Gray
Write-Host "    3. Select: 'Dev Containers: Reopen in Container'" -ForegroundColor Gray
Write-Host ""

Write-Host "🎉 DevContainer transition initiated!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Troubleshooting Resources:" -ForegroundColor Cyan
Write-Host "   - .devcontainer/README.md - Full documentation" -ForegroundColor White
Write-Host "   - DEVCONTAINER_READINESS_CHECKLIST.md - Complete checklist" -ForegroundColor White
Write-Host "   - Docker Desktop logs - If build fails" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tip: If issues occur, you can always 'Reopen Folder Locally'" -ForegroundColor Yellow
Write-Host "   to return to your local setup. Your backup branch: $backupBranch" -ForegroundColor Yellow
Write-Host ""
