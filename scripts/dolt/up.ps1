#Requires -Version 5.1
<#
.SYNOPSIS
  Start local Dolt sql-server for Beads + catalog CMS (port 3307).
#>
param(
  [string]$HostAddr = '127.0.0.1',
  [int]$Port = 3307,
  [switch]$Foreground,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
  @"
scripts/dolt/up.ps1 — start shared Dolt sql-server for agent data plane

  Data:   <repo>/.dolt-data/server (gitignored)
  Listen: ${HostAddr}:${Port} (Beads default)

  One server per machine; all worktrees share it.
"@
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$DataRoot = Join-Path $RepoRoot '.dolt-data'
$ServerDir = Join-Path $DataRoot 'server'
$PidFile = Join-Path $DataRoot 'sql-server.pid'

$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
  [System.Environment]::GetEnvironmentVariable('Path', 'User')

if (-not (Get-Command dolt -ErrorAction SilentlyContinue)) {
  Write-Error 'dolt not on PATH. Install: winget install DoltHub.Dolt'
}

New-Item -ItemType Directory -Force -Path $ServerDir | Out-Null

# Already running?
if (Test-Path $PidFile) {
  $existing = Get-Content $PidFile -ErrorAction SilentlyContinue
  if ($existing -and (Get-Process -Id $existing -ErrorAction SilentlyContinue)) {
    Write-Host "Dolt sql-server already running (pid $existing) on ${HostAddr}:${Port}" -ForegroundColor Green
    exit 0
  }
}

Push-Location $ServerDir
try {
  if (-not (Test-Path (Join-Path $ServerDir '.dolt'))) {
    Write-Host 'Initializing Dolt data directory...' -ForegroundColor Cyan
    dolt init --name ModMe --email dolt@modme.local 2>&1 | Out-Host
  }

  # Ensure databases exist
  dolt sql -q "CREATE DATABASE IF NOT EXISTS modme;" 2>&1 | Out-Null
  dolt sql -q "CREATE DATABASE IF NOT EXISTS ``modme-catalog``;" 2>&1 | Out-Null

  $doltArgs = @('sql-server', '--host', $HostAddr, '--port', "$Port")

  if ($Foreground) {
    Write-Host "Starting Dolt sql-server (foreground) on ${HostAddr}:${Port}..." -ForegroundColor Cyan
    & dolt @doltArgs
  }
  else {
    Write-Host "Starting Dolt sql-server (background) on ${HostAddr}:${Port}..." -ForegroundColor Cyan
    $outLog = Join-Path $DataRoot 'sql-server.out.log'
    $errLog = Join-Path $DataRoot 'sql-server.err.log'
    $proc = Start-Process -FilePath 'dolt' -ArgumentList $doltArgs -WorkingDirectory $ServerDir `
      -RedirectStandardOutput $outLog -RedirectStandardError $errLog `
      -WindowStyle Hidden -PassThru
    Set-Content -Path $PidFile -Value $proc.Id -Encoding ascii
    Start-Sleep -Seconds 2
    if (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue) {
      Write-Host "Dolt sql-server up (pid $($proc.Id)). Logs: $outLog / $errLog" -ForegroundColor Green
      Write-Host "  BEADS_DOLT_SERVER_HOST=$HostAddr" -ForegroundColor DarkGray
      Write-Host "  BEADS_DOLT_SERVER_PORT=$Port" -ForegroundColor DarkGray
    }
    else {
      Write-Error "Dolt sql-server failed to start. See $errLog"
    }
  }
}
finally {
  Pop-Location
}
