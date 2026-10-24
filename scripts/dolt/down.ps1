#Requires -Version 5.1
<#
.SYNOPSIS
  Stop local Dolt sql-server started by scripts/dolt/up.ps1.
#>
$ErrorActionPreference = 'Continue'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$PidFile = Join-Path $RepoRoot '.dolt-data\sql-server.pid'

if (-not (Test-Path $PidFile)) {
  Write-Host 'No pid file — Dolt sql-server not tracked as running.' -ForegroundColor Yellow
  exit 0
}

$pidVal = Get-Content $PidFile -ErrorAction SilentlyContinue
if ($pidVal -and (Get-Process -Id $pidVal -ErrorAction SilentlyContinue)) {
  Stop-Process -Id $pidVal -Force
  Write-Host "Stopped Dolt sql-server (pid $pidVal)" -ForegroundColor Green
}
else {
  Write-Host "Process $pidVal not running; clearing pid file." -ForegroundColor Yellow
}

Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
