# Start the lspmux daemon in the background (Windows-first).
# Usage: .\scripts\lspmux\start-daemon.ps1 [-Foreground]

param(
  [switch]$Foreground
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot 'lib.ps1')

$lspmux = Get-LspmuxBinaryPath
if (-not (Test-Path $lspmux)) {
  Write-Host "lspmux not found at $lspmux" -ForegroundColor Red
  Write-Host "Run: .\scripts\lspmux\install.ps1" -ForegroundColor Yellow
  exit 1
}

Ensure-LspmuxConfig | Out-Null

if (Invoke-LspmuxStatus -Quiet) {
  Write-Host "lspmux daemon already running." -ForegroundColor Green
  if (-not $Foreground) {
    & $lspmux status
  }
  exit 0
}

Write-Host "Starting lspmux server..." -ForegroundColor Cyan

if ($Foreground) {
  Write-Host "Press Ctrl+C to stop the daemon." -ForegroundColor DarkGray
  & $lspmux server
  exit $LASTEXITCODE
}

$logDir = Join-Path $env:LOCALAPPDATA 'lspmux\logs'
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
}
$logFile = Join-Path $logDir ("daemon-{0:yyyyMMdd-HHmmss}.log" -f (Get-Date))

Start-Process -FilePath $lspmux -ArgumentList @('server') `
  -WindowStyle Hidden `
  -RedirectStandardOutput $logFile `
  -RedirectStandardError $logFile

Start-Sleep -Seconds 1

if (Invoke-LspmuxStatus -Quiet) {
  Write-Host "lspmux daemon started (log: $logFile)" -ForegroundColor Green
  & $lspmux status
  exit 0
}

Write-Host "Daemon may still be starting. Check log: $logFile" -ForegroundColor Yellow
Write-Host "Or run in foreground: .\scripts\lspmux\start-daemon.ps1 -Foreground" -ForegroundColor DarkGray
exit 1
