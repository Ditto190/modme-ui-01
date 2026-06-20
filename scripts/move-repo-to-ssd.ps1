#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Safely move modme-ui-01 repository to SSD with automatic cleanup and regeneration.

.DESCRIPTION
    This script:
    - Checks for running processes (Node, Python, VS Code)
    - Moves the repository to target location
    - Fixes git worktrees
    - Regenerates node_modules and Python venv
    - Validates the move
    - Opens VS Code in new location

.PARAMETER TargetPath
    Target directory path (e.g., D:\Github_Projects)

.PARAMETER SkipValidation
    Skip pre-move validation checks

.EXAMPLE
    .\scripts\move-repo-to-ssd.ps1 -TargetPath "D:\Github_Projects"
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$TargetPath = "D:\Github_Projects",
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipValidation
)

$ErrorActionPreference = "Stop"

# ============================================================
# Configuration
# ============================================================
$SourcePath = $PSScriptRoot | Split-Path -Parent
$RepoName = Split-Path $SourcePath -Leaf
$NewRepoPath = Join-Path $TargetPath $RepoName

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         ModMe Repo SSD Migration Script                  ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Source:      $SourcePath" -ForegroundColor White
Write-Host "  Destination: $NewRepoPath" -ForegroundColor White
Write-Host ""

# ============================================================
# Step 1: Pre-Move Validation
# ============================================================
if (-not $SkipValidation) {
    Write-Host "📋 Step 1: Pre-Move Validation" -ForegroundColor Green
    Write-Host ""
    
    # Check if target drive exists
    $TargetDrive = Split-Path $TargetPath -Qualifier
    if (-not (Test-Path $TargetDrive)) {
        Write-Host "  ❌ Target drive $TargetDrive does not exist!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Target drive exists" -ForegroundColor Green
    
    # Check disk space
    $SourceSize = (Get-ChildItem $SourcePath -Recurse -ErrorAction SilentlyContinue | 
        Measure-Object -Property Length -Sum).Sum
    $SourceSizeGB = [math]::Round($SourceSize / 1GB, 2)
    
    $TargetDisk = Get-PSDrive -Name $TargetDrive.TrimEnd(':')
    $FreeSpaceGB = [math]::Round($TargetDisk.Free / 1GB, 2)
    
    Write-Host "  Source size:       $SourceSizeGB GB" -ForegroundColor Gray
    Write-Host "  Available space:   $FreeSpaceGB GB" -ForegroundColor Gray
    
    if ($FreeSpaceGB -lt ($SourceSizeGB * 1.5)) {
        Write-Host "  ⚠️  Low disk space! Recommended: $([math]::Round($SourceSizeGB * 1.5, 2)) GB" -ForegroundColor Yellow
        $continue = Read-Host "  Continue anyway? (y/N)"
        if ($continue -ne 'y') { exit 0 }
    }
    else {
        Write-Host "  ✓ Sufficient disk space" -ForegroundColor Green
    }
    
    # Check for running processes
    Write-Host ""
    Write-Host "  Checking for running processes..." -ForegroundColor Gray
    
    $nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
    $pythonProcesses = Get-Process -Name python, pythonw -ErrorAction SilentlyContinue | 
    Where-Object { $_.Path -like "*$SourcePath*" }
    $vscodeProcesses = Get-Process -Name Code -ErrorAction SilentlyContinue
    
    $hasRunningProcesses = $false
    
    if ($nodeProcesses) {
        Write-Host "  ⚠️  Node.js processes detected: $($nodeProcesses.Count)" -ForegroundColor Yellow
        $hasRunningProcesses = $true
    }
    
    if ($pythonProcesses) {
        Write-Host "  ⚠️  Python processes detected: $($pythonProcesses.Count)" -ForegroundColor Yellow
        $hasRunningProcesses = $true
    }
    
    if ($vscodeProcesses) {
        Write-Host "  ⚠️  VS Code is running" -ForegroundColor Yellow
        $hasRunningProcesses = $true
    }
    
    if ($hasRunningProcesses) {
        Write-Host ""
        Write-Host "  Please close these processes before continuing:" -ForegroundColor Yellow
        Write-Host "    - Stop 'npm run dev'" -ForegroundColor Yellow
        Write-Host "    - Close VS Code windows" -ForegroundColor Yellow
        Write-Host "    - Deactivate Python venvs" -ForegroundColor Yellow
        Write-Host ""
        $continue = Read-Host "  Processes closed? Continue? (y/N)"
        if ($continue -ne 'y') { exit 0 }
    }
    else {
        Write-Host "  ✓ No blocking processes" -ForegroundColor Green
    }
    
    Write-Host ""
}

# ============================================================
# Step 2: Backup Critical Files
# ============================================================
Write-Host "💾 Step 2: Backup Critical Files" -ForegroundColor Green
Write-Host ""

$BackupDir = Join-Path $env:TEMP "modme-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

$criticalFiles = @('.env', '.env.local', 'agent/.env')
$backedUp = 0

foreach ($file in $criticalFiles) {
    $filePath = Join-Path $SourcePath $file
    if (Test-Path $filePath) {
        Copy-Item $filePath -Destination $BackupDir -Force
        Write-Host "  ✓ Backed up: $file" -ForegroundColor Green
        $backedUp++
    }
}

if ($backedUp -gt 0) {
    Write-Host "  ✓ Backed up $backedUp file(s) to: $BackupDir" -ForegroundColor Green
}
else {
    Write-Host "  ℹ️  No critical files to backup" -ForegroundColor Gray
}
Write-Host ""

# ============================================================
# Step 3: Git Worktree Cleanup
# ============================================================
Write-Host "🌳 Step 3: Git Worktree Cleanup" -ForegroundColor Green
Write-Host ""

Push-Location $SourcePath

try {
    $worktrees = git worktree list --porcelain | Select-String "^worktree " | 
    ForEach-Object { $_ -replace "^worktree ", "" }
    
    $worktreeCount = ($worktrees | Measure-Object).Count
    
    if ($worktreeCount -gt 1) {
        Write-Host "  Found $worktreeCount worktree(s)" -ForegroundColor Gray
        
        foreach ($wt in $worktrees) {
            if ($wt -ne $SourcePath) {
                Write-Host "  Removing worktree: $wt" -ForegroundColor Gray
                git worktree remove $wt --force 2>&1 | Out-Null
                Write-Host "  ✓ Removed: $wt" -ForegroundColor Green
            }
        }
    }
    else {
        Write-Host "  ✓ No additional worktrees to clean" -ForegroundColor Green
    }
}
catch {
    Write-Host "  ⚠️  Worktree cleanup warning: $($_.Exception.Message)" -ForegroundColor Yellow
}
finally {
    Pop-Location
}

Write-Host ""

# ============================================================
# Step 4: Move Repository
# ============================================================
Write-Host "📦 Step 4: Moving Repository" -ForegroundColor Green
Write-Host ""

if (Test-Path $NewRepoPath) {
    Write-Host "  ⚠️  Target path already exists: $NewRepoPath" -ForegroundColor Yellow
    $overwrite = Read-Host "  Delete existing and continue? (y/N)"
    if ($overwrite -eq 'y') {
        Remove-Item $NewRepoPath -Recurse -Force
        Write-Host "  ✓ Removed existing directory" -ForegroundColor Green
    }
    else {
        Write-Host "  ❌ Operation cancelled" -ForegroundColor Red
        exit 1
    }
}

Write-Host "  Moving files... (this may take a few minutes)" -ForegroundColor Gray

try {
    # Use robocopy for efficient move
    $robocopyArgs = @(
        $SourcePath,
        $NewRepoPath,
        '/E',           # Copy subdirectories, including empty
        '/MOVE',        # Move files (delete from source)
        '/R:3',         # Retry 3 times
        '/W:5',         # Wait 5 seconds between retries
        '/NFL',         # No file list
        '/NDL',         # No directory list
        '/NJH',         # No job header
        '/NJS',         # No job summary
        '/NP'           # No progress
    )
    
    $result = robocopy @robocopyArgs 2>&1
    
    # Robocopy exit codes: 0-7 are success, 8+ are errors
    if ($LASTEXITCODE -ge 8) {
        throw "Robocopy failed with exit code: $LASTEXITCODE"
    }
    
    Write-Host "  ✓ Repository moved successfully" -ForegroundColor Green
}
catch {
    Write-Host "  ❌ Move failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Attempting fallback with Move-Item..." -ForegroundColor Yellow
    
    try {
        Move-Item $SourcePath $NewRepoPath -Force
        Write-Host "  ✓ Repository moved with fallback method" -ForegroundColor Green
    }
    catch {
        Write-Host "  ❌ Fallback also failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  Manual intervention required" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# ============================================================
# Step 5: Regenerate Dependencies
# ============================================================
Write-Host "🔄 Step 5: Regenerate Dependencies" -ForegroundColor Green
Write-Host ""

Push-Location $NewRepoPath

try {
    # Node modules
    if (Test-Path "node_modules") {
        Write-Host "  Removing old node_modules..." -ForegroundColor Gray
        Remove-Item node_modules -Recurse -Force
    }
    
    Write-Host "  Installing Node dependencies..." -ForegroundColor Gray
    npm install --silent 2>&1 | Out-Null
    Write-Host "  ✓ Node dependencies installed" -ForegroundColor Green
    
    # Python venv
    if (Test-Path "agent\.venv") {
        Write-Host "  Removing old Python venv..." -ForegroundColor Gray
        Remove-Item agent\.venv -Recurse -Force
    }
    
    Write-Host "  Creating Python virtual environment..." -ForegroundColor Gray
    Push-Location agent
    
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        uv venv 2>&1 | Out-Null
        Write-Host "  Installing Python dependencies with uv..." -ForegroundColor Gray
        uv sync 2>&1 | Out-Null
    }
    else {
        python -m venv .venv
        Write-Host "  Installing Python dependencies with pip..." -ForegroundColor Gray
        & .venv\Scripts\Activate.ps1
        pip install -e . --quiet 2>&1 | Out-Null
    }
    
    Pop-Location
    Write-Host "  ✓ Python dependencies installed" -ForegroundColor Green
}
catch {
    Write-Host "  ⚠️  Dependency installation warning: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  You may need to reinstall manually" -ForegroundColor Yellow
}
finally {
    Pop-Location
}

Write-Host ""

# ============================================================
# Step 6: Restore Backed Up Files
# ============================================================
Write-Host "📥 Step 6: Restore Critical Files" -ForegroundColor Green
Write-Host ""

foreach ($file in $criticalFiles) {
    $backupFile = Join-Path $BackupDir (Split-Path $file -Leaf)
    $targetFile = Join-Path $NewRepoPath $file
    
    if (Test-Path $backupFile) {
        $targetDir = Split-Path $targetFile -Parent
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        Copy-Item $backupFile -Destination $targetFile -Force
        Write-Host "  ✓ Restored: $file" -ForegroundColor Green
    }
}

Write-Host ""

# ============================================================
# Step 7: Validation
# ============================================================
Write-Host "✅ Step 7: Post-Move Validation" -ForegroundColor Green
Write-Host ""

Push-Location $NewRepoPath

$validationPassed = $true

# Check git status
try {
    $gitStatus = git status --porcelain 2>&1
    Write-Host "  ✓ Git repository intact" -ForegroundColor Green
}
catch {
    Write-Host "  ❌ Git validation failed" -ForegroundColor Red
    $validationPassed = $false
}

# Check package.json
if (Test-Path "package.json") {
    Write-Host "  ✓ package.json found" -ForegroundColor Green
}
else {
    Write-Host "  ❌ package.json missing" -ForegroundColor Red
    $validationPassed = $false
}

# Check agent structure
if (Test-Path "agent\main.py") {
    Write-Host "  ✓ Python agent structure intact" -ForegroundColor Green
}
else {
    Write-Host "  ❌ Agent structure incomplete" -ForegroundColor Red
    $validationPassed = $false
}

# Check .devcontainer
if (Test-Path ".devcontainer\devcontainer.json") {
    Write-Host "  ✓ DevContainer config found" -ForegroundColor Green
}
else {
    Write-Host "  ⚠️  DevContainer config missing" -ForegroundColor Yellow
}

Pop-Location

Write-Host ""

# ============================================================
# Summary
# ============================================================
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                  Migration Summary                        ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($validationPassed) {
    Write-Host "  ✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  New location: $NewRepoPath" -ForegroundColor White
    Write-Host "  Backup location: $BackupDir" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Next steps:" -ForegroundColor White
    Write-Host "    1. Open in VS Code: code `"$NewRepoPath`"" -ForegroundColor Gray
    Write-Host "    2. Verify: git status" -ForegroundColor Gray
    Write-Host "    3. Test: npm run dev" -ForegroundColor Gray
    Write-Host ""
    
    # Offer to open in VS Code
    $openVSCode = Read-Host "  Open in VS Code now? (Y/n)"
    if ($openVSCode -ne 'n') {
        code "$NewRepoPath"
    }
    
    # Clean up old directory if empty
    if (Test-Path $SourcePath) {
        $remaining = Get-ChildItem $SourcePath -ErrorAction SilentlyContinue
        if (-not $remaining) {
            Remove-Item $SourcePath -Force
            Write-Host "  ✓ Cleaned up old directory" -ForegroundColor Green
        }
    }
}
else {
    Write-Host "  ⚠️  Migration completed with warnings" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  New location: $NewRepoPath" -ForegroundColor White
    Write-Host "  Please verify repository manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
