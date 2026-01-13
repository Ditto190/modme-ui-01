# GreptimeDB Setup and Initialization Script (Windows PowerShell)
# 
# This script installs GreptimeDB locally and configures the environment.

$ErrorActionPreference = "Stop"

Write-Host "🚀 GreptimeDB Setup for ModMe GenUI Workbench" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Check Docker
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue

if ($dockerInstalled) {
    Write-Host "✓ Docker found" -ForegroundColor Green
    $useDocker = $true
} else {
    Write-Host "⚠ Docker not found, will use binary installation" -ForegroundColor Yellow
    $useDocker = $false
}

# Install GreptimeDB
Write-Host "`n📦 Installing GreptimeDB..." -ForegroundColor Cyan

if ($useDocker) {
    Write-Host "Using Docker..."
    
    # Pull image
    docker pull greptime/greptimedb:latest
    
    # Stop existing container if running
    docker stop greptimedb 2>$null
    docker rm greptimedb 2>$null
    
    # Start GreptimeDB
    Write-Host "Starting GreptimeDB container..."
    docker run -d --name greptimedb `
        -p 4000-4004:4000-4004 `
        -v greptimedb_data:/tmp/greptimedb `
        greptime/greptimedb:latest standalone start
    
    Write-Host "✓ GreptimeDB container started" -ForegroundColor Green
    
} else {
    Write-Host "Installing binary..."
    
    # Download URL
    $downloadUrl = "https://github.com/GreptimeTeam/greptimedb/releases/download/v0.6.1/greptime-windows-amd64-v0.6.1.zip"
    
    # Create directory
    $greptimeDir = "$env:USERPROFILE\.greptimedb"
    New-Item -ItemType Directory -Force -Path $greptimeDir | Out-Null
    
    # Download and extract
    $zipPath = "$greptimeDir\greptime.zip"
    Write-Host "Downloading from $downloadUrl..."
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath
    
    Write-Host "Extracting..."
    Expand-Archive -Path $zipPath -DestinationPath $greptimeDir -Force
    Remove-Item $zipPath
    
    # Add to PATH
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -notlike "*$greptimeDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$greptimeDir\greptime-*", "User")
        Write-Host "✓ Added GreptimeDB to PATH" -ForegroundColor Green
        Write-Host "⚠ Restart your terminal to use 'greptime' command" -ForegroundColor Yellow
    }
    
    Write-Host "✓ GreptimeDB binary installed" -ForegroundColor Green
}

# Configure environment
Write-Host "`n⚙️  Configuring environment..." -ForegroundColor Cyan

# Find git root or use current directory
$gitRoot = git rev-parse --show-toplevel 2>$null
if (-not $gitRoot) {
    $gitRoot = Get-Location
}

Set-Location $gitRoot

if (-not (Test-Path .env)) {
    if (Test-Path .env.greptime.example) {
        Copy-Item .env.greptime.example .env
        Write-Host "✓ Created .env from .env.greptime.example" -ForegroundColor Green
    } else {
        @"
GREPTIME_HOST=localhost:4000
GREPTIME_DB=public
GREPTIME_USERNAME=
GREPTIME_PASSWORD=
SERVICE_NAME=modme-genui-agent
SERVICE_VERSION=0.1.0
ENVIRONMENT=development
"@ | Out-File -FilePath .env -Encoding UTF8
        Write-Host "✓ Created .env with default settings" -ForegroundColor Green
    }
} else {
    Write-Host "⚠ .env already exists, skipping" -ForegroundColor Yellow
}

# Verify connection
Write-Host "`n🔍 Verifying GreptimeDB connection..." -ForegroundColor Cyan

Start-Sleep -Seconds 3  # Wait for startup

try {
    $response = Invoke-WebRequest -Uri http://localhost:4000/health -UseBasicParsing -TimeoutSec 5
    Write-Host "✓ GreptimeDB is running and accessible" -ForegroundColor Green
    
    # Show version
    $version = ($response.Content | ConvertFrom-Json).version
    Write-Host "  Version: $version" -ForegroundColor Green
} catch {
    Write-Host "✗ Could not connect to GreptimeDB" -ForegroundColor Red
    Write-Host "  Try manually starting it:" -ForegroundColor Yellow
    if ($useDocker) {
        Write-Host "    docker start greptimedb"
    } else {
        Write-Host "    greptime standalone start"
    }
    exit 1
}

# Install Node.js dependencies for observability
Write-Host "`n📦 Installing Node.js observability dependencies..." -ForegroundColor Cyan

Set-Location src\lib\observability
if (Test-Path package.json) {
    npm install
    Write-Host "✓ Node.js dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠ No package.json found in src\lib\observability" -ForegroundColor Yellow
}

Set-Location ..\..\..

# Summary
Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:"
Write-Host "  1. Start your application: " -NoNewline
Write-Host "npm run dev" -ForegroundColor Green
Write-Host "  2. View metrics at: " -NoNewline
Write-Host "http://localhost:4000" -ForegroundColor Green
Write-Host "  3. Read docs: " -NoNewline
Write-Host "docs\GREPTIME_OBSERVABILITY.md" -ForegroundColor Green
Write-Host "`nQuick test:"
Write-Host "  curl http://localhost:4000/v1/sql -X POST ``" -ForegroundColor Green
Write-Host "    -H 'Content-Type: application/x-www-form-urlencoded' ``" -ForegroundColor Green
Write-Host "    -d 'sql=SHOW TABLES'" -ForegroundColor Green

Write-Host "`n🎉 Happy monitoring!" -ForegroundColor Cyan
