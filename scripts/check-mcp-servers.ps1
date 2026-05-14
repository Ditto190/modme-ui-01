#!/usr/bin/env pwsh
<#
.SYNOPSIS
Check if MCP servers are running

.DESCRIPTION
Quick verification script to check if expected MCP servers are actually running.
Checks:
- Process existence
- Port availability
- Log file recent activity
#>

param(
    [switch]$Verbose
)

$ErrorActionPreference = 'Continue'

Write-Host "`n=== MCP Server Status Check ===" -ForegroundColor Cyan
Write-Host "Checking running servers...`n" -ForegroundColor Gray

# Check for Python processes (MCP servers)
Write-Host "Python MCP Servers:" -ForegroundColor Yellow
$pythonProcs = Get-Process python -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*mcp_server.py*"
}

if ($pythonProcs) {
    foreach ($proc in $pythonProcs) {
        Write-Host "  ✓ PID $($proc.Id): $($proc.ProcessName)" -ForegroundColor Green
        if ($Verbose) {
            Write-Host "    Command: $($proc.CommandLine)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  ✗ No Python MCP servers found" -ForegroundColor Red
}

# Check for PowerShell processes (startup scripts)
Write-Host "`nPowerShell Startup Scripts:" -ForegroundColor Yellow
$pwshProcs = Get-Process pwsh -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*start-everything*" -or $_.CommandLine -like "*mcp*"
}

if ($pwshProcs) {
    foreach ($proc in $pwshProcs) {
        Write-Host "  ✓ PID $($proc.Id): PowerShell" -ForegroundColor Green
        if ($Verbose) {
            Write-Host "    Command: $($proc.CommandLine)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "  ℹ No MCP startup scripts running" -ForegroundColor Gray
}

# Check specific ports
Write-Host "`nPort Status:" -ForegroundColor Yellow
$ports = @{
    8001 = "ChromaDB Server"
    8002 = "Journal MCP Server"
}

foreach ($port in $ports.Keys) {
    $connection = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($connection) {
        Write-Host "  ✓ Port $port ($($ports[$port])): LISTENING" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Port $port ($($ports[$port])): NOT LISTENING" -ForegroundColor Red
    }
}

# Check log files
Write-Host "`nRecent Log Activity:" -ForegroundColor Yellow
$logDir = Join-Path $PSScriptRoot ".." ".logs"
if (Test-Path $logDir) {
    $recentLogs = Get-ChildItem -Path $logDir -Filter "mcp-*.log" -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-5) } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 5

    if ($recentLogs) {
        foreach ($log in $recentLogs) {
            $age = [math]::Round(((Get-Date) - $log.LastWriteTime).TotalSeconds)
            Write-Host "  ✓ $($log.Name) (updated ${age}s ago)" -ForegroundColor Green
        }
    } else {
        Write-Host "  ℹ No recent log activity (last 5 minutes)" -ForegroundColor Gray
    }
} else {
    Write-Host "  ✗ Log directory not found: $logDir" -ForegroundColor Red
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
$pythonCount = ($pythonProcs | Measure-Object).Count
$portCount = ($ports.Keys | Where-Object { Test-NetConnection -ComputerName localhost -Port $_ -InformationLevel Quiet -WarningAction SilentlyContinue }).Count

Write-Host "Python servers running: $pythonCount" -ForegroundColor $(if ($pythonCount -gt 0) { "Green" } else { "Red" })
Write-Host "Ports listening: $portCount / $($ports.Count)" -ForegroundColor $(if ($portCount -eq $ports.Count) { "Green" } elseif ($portCount -gt 0) { "Yellow" } else { "Red" })

if ($pythonCount -eq 0 -and $portCount -eq 0) {
    Write-Host "`n⚠️  No servers appear to be running!" -ForegroundColor Red
    Write-Host "Try running: npm run mcp:start" -ForegroundColor Yellow
} elseif ($pythonCount -gt 0 -or $portCount -gt 0) {
    Write-Host "`n✓ Some servers are running" -ForegroundColor Green
}

Write-Host ""
