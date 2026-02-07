#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Simple MCP Server Starter - Starts local MCP servers only
.DESCRIPTION
    Simplified version that focuses on actually starting servers
#>

param([switch]$Verbose)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$LogDir = Join-Path $Root '.logs'
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

Write-Host "`n🚀 Starting Local MCP Servers`n" -ForegroundColor Cyan

$Started = 0
$Failed = 0

# 1. Start everything script if exists
$StartEverything = Join-Path $Root '.copilot\mcp-servers\start-everything.ps1'
if (Test-Path $StartEverything) {
    Write-Host "🔧 Starting: start-everything.ps1"
    try {
        $null = Start-Process pwsh `
            -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $StartEverything `
            -RedirectStandardOutput "$LogDir\mcp-start-everything.log" `
            -RedirectStandardError "$LogDir\mcp-start-everything-error.log" `
            -WindowStyle Hidden `
            -PassThru
        Write-Host "   ✅ Started" -ForegroundColor Green
        $Started++
    }
    catch {
        Write-Host "   ❌ Failed: $_" -ForegroundColor Red
        $Failed++
    }
}

# 2. Start Journal MCP Server
$JournalServer = Join-Path $Root 'agent\journal_mcp_server.py'
if (Test-Path $JournalServer) {
    Write-Host "🔧 Starting: journal_mcp_server.py"
    try {
        $pythonCmd = 'python'
        $venvPython = Join-Path $Root 'agent\.venv\Scripts\python.exe'
        if (Test-Path $venvPython) { $pythonCmd = $venvPython }

        $null = Start-Process $pythonCmd `
            -ArgumentList $JournalServer, "--port", "8002" `
            -RedirectStandardOutput "$LogDir\mcp-journal.log" `
            -RedirectStandardError "$LogDir\mcp-journal-error.log" `
            -WindowStyle Hidden `
            -PassThru
        Write-Host "   ✅ Started (port 8002)" -ForegroundColor Green
        $Started++
    }
    catch {
        Write-Host "   ❌ Failed: $_" -ForegroundColor Red
        $Failed++
    }
}

#3. Start ChromaDB Server
$ChromaServer = Join-Path $Root 'scripts\start_chroma_server.py'
if (Test-Path $ChromaServer) {
    Write-Host "🔧 Starting: ChromaDB server"
    try {
        $pythonCmd = 'python'
        $venvPython = Join-Path $Root 'agent\.venv\Scripts\python.exe'
        if (Test-Path $venvPython) { $pythonCmd = $venvPython }

        $null = Start-Process $pythonCmd `
            -ArgumentList $ChromaServer, "--port", "8001" `
            -RedirectStandardOutput "$LogDir\mcp-chroma-db.log" `
            -RedirectStandardError "$LogDir\mcp-chroma-db-error.log" `
            -WindowStyle Hidden `
            -PassThru
        Write-Host "   ✅ Started (port 8001)" -ForegroundColor Green
        $Started++
    }
    catch {
        Write-Host "   ❌ Failed: $_" -ForegroundColor Red
        $Failed++
    }
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "✅ Started: $Started" -ForegroundColor Green
if ($Failed -gt 0) {
    Write-Host "❌ Failed: $Failed" -ForegroundColor Red
}
Write-Host "📁 Logs: $LogDir`n" -ForegroundColor Cyan

exit $(if ($Failed -gt 0) { 1 } else { 0 })
