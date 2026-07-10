#Requires -Version 5.1
<#
.SYNOPSIS
  Status for Dolt CLI + local sql-server + catalog path.
#>
$ErrorActionPreference = 'Continue'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$PidFile = Join-Path $RepoRoot '.dolt-data\sql-server.pid'
$CatalogPath = Join-Path $RepoRoot 'config\dolt\catalog'
$Port = 3307

$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
  [System.Environment]::GetEnvironmentVariable('Path', 'User')

$ok = $true

if (Get-Command dolt -ErrorAction SilentlyContinue) {
  Write-Host "dolt: $(dolt version 2>&1)" -ForegroundColor Green
}
else {
  Write-Host 'dolt: NOT INSTALLED (winget install DoltHub.Dolt)' -ForegroundColor Red
  $ok = $false
}

$running = $false
if (Test-Path $PidFile) {
  $pidVal = Get-Content $PidFile -ErrorAction SilentlyContinue
  if ($pidVal -and (Get-Process -Id $pidVal -ErrorAction SilentlyContinue)) {
    Write-Host "sql-server: running (pid $pidVal) on 127.0.0.1:$Port" -ForegroundColor Green
    $running = $true
  }
}

if (-not $running) {
  # Probe TCP even if pid file missing (manual start)
  try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect('127.0.0.1', $Port)
    $tcpClient.Close()
    Write-Host "sql-server: port $Port open (pid file missing)" -ForegroundColor Yellow
    $running = $true
  }
  catch { }
}

if (-not $running) {
  Write-Host "sql-server: NOT RUNNING (yarn dolt:up)" -ForegroundColor Yellow
  $ok = $false
}

if (Test-Path $CatalogPath) {
  Write-Host "catalog: $CatalogPath" -ForegroundColor Green
  if (Test-Path (Join-Path $CatalogPath '.dolt')) {
    Write-Host 'catalog: dolt repo initialized' -ForegroundColor Green
  }
  else {
    Write-Host 'catalog: not initialized (yarn dolt:catalog:init)' -ForegroundColor Yellow
  }
}
else {
  Write-Host 'catalog: path missing' -ForegroundColor Red
  $ok = $false
}

if ($ok) { exit 0 } else { exit 1 }
