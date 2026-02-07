#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Simple MCP Server Starter with Dependency Management
.DESCRIPTION
    Checks and installs Python dependencies before starting servers
#>

param([switch]$Verbose)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$LogDir = Join-Path $Root '.logs'
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

Write-Host "`n🚀 Starting Local MCP Servers`n" -ForegroundColor Cyan

$Started = 0
$Failed = 0

# ============================================================
# Step 1: Check Python Dependencies
# ============================================================
Write-Host "📦 Checking Python dependencies...`n" -ForegroundColor Yellow

$venvPython = Join-Path $Root 'agent\.venv\Scripts\python.exe'

if (-not (Test-Path $venvPython)) {
    Write-Host "  ⚠️  Virtual environment not found!" -ForegroundColor Red
    Write-Host "  Run: npm run install:agent" -ForegroundColor Yellow
    exit 1
}

# Check for required packages and install if missing
$packages = @('fastmcp', 'chromadb')
foreach ($pkg in $packages) {
    $checkResult = & $venvPython -c "import $pkg" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  📥 Installing $pkg..." -ForegroundColor Yellow
        & $venvPython -m pip install $pkg --quiet 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ $pkg installed" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Failed to install $pkg" -ForegroundColor Red
            $Failed++
        }
    } else {
        Write-Host "  ✓ $pkg available" -ForegroundColor Green
    }
}

Write-Host ""

# ============================================================
# Step 2: Start Servers
# ============================================================
Write-Host "🔧 Starting servers...`n" -ForegroundColor Yellow

# 1. Start everything script if exists
$StartEverything = Join-Path $Root '.copilot\mcp-servers\start-everything.ps1'
if (Test-Path $StartEverything) {
    Write-Host "🔧 start-everything.ps1"
    try {
        $proc = Start-Process pwsh `
            -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $StartEverything `
            -RedirectStandardOutput "$LogDir\mcp-start-everything.log" `
            -RedirectStandardError "$LogDir\mcp-start-everything-error.log" `
            -WindowStyle Hidden `
            -PassThru

        if ($proc) {
            Write-Host "   ✅ Started (PID: $($proc.Id))" -ForegroundColor Green
            $Started++
        }
    }
    catch {
        Write-Host "   ❌ Failed: $_" -ForegroundColor Red
        $Failed++
    }
}

# 2. Start Journal MCP Server
$JournalServer = Join-Path $Root 'agent\journal_mcp_server.py'
if (Test-Path $JournalServer) {
    Write-Host "🔧 journal_mcp_server.py"
    try {
        $proc = Start-Process $venvPython `
            -ArgumentList $JournalServer, "--port", "8002" `
            -RedirectStandardOutput "$LogDir\mcp-journal.log" `
            -RedirectStandardError "$LogDir\mcp-journal-error.log" `
            -WindowStyle Hidden `
            -PassThru

        if ($proc) {
            Write-Host "   ✅ Started (PID: $($proc.Id), port 8002)" -ForegroundColor Green
            $Started++
        }

        # Wait a moment to see if it crashes immediately
        Start-Sleep -Milliseconds 500
        if ($proc.HasExited) {
            Write-Host "   ⚠️  Process exited immediately! Check:" -ForegroundColor Yellow
            Write-Host "      $LogDir\mcp-journal-error.log" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "   ❌ Failed: $_" -ForegroundColor Red
        $Failed++
    }
}

# 3. Start ChromaDB Server
$ChromaServer = Join-Path $Root 'scripts\start_chroma_server.py'
if (Test-Path $ChromaServer) {
    Write-Host "🔧 ChromaDB server"
    try {
        $proc = Start-Process $venvPython `
            -ArgumentList $ChromaServer, "--port", "8001" `
            -RedirectStandardOutput "$LogDir\mcp-chroma.log" `
            -RedirectStandardError "$LogDir\mcp-chroma-error.log" `
            -WindowStyle Hidden `
            -PassThru

        if ($proc) {
            Write-Host "   ✅ Started (PID: $($proc.Id), port 8001)" -ForegroundColor Green
            $Started++
        }

        # Wait a moment to see if it crashes immediately
        Start-Sleep -Milliseconds 500
        if ($proc.HasExited) {
            Write-Host "   ⚠️  Process exited immediately! Check:" -ForegroundColor Yellow
            Write-Host "      $LogDir\mcp-chroma-error.log" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "   ❌ Failed: $_" -ForegroundColor Red
        $Failed++
    }
}

# ============================================================
# Summary
# ============================================================
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "✅ Started: $Started" -ForegroundColor Green
if ($Failed -gt 0) {
    Write-Host "❌ Failed: $Failed" -ForegroundColor Red
}
Write-Host "📁 Logs: $LogDir" -ForegroundColor Gray
Write-Host "`nℹ️  To check status: npm run mcp:status" -ForegroundColor Gray
Write-Host "    Or run: pwsh scripts\check-mcp-servers.ps1" -ForegroundColor Gray
Write-Host ""
