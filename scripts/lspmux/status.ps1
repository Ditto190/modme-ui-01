# Report lspmux daemon and instance status.
# Usage: .\scripts\lspmux\status.ps1 [-Json]

param(
  [switch]$Json
)

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot 'lib.ps1')

$lspmuxPath = Get-LspmuxBinaryPath
$installed = Test-Path $lspmuxPath
$daemonOk = $false
$statusText = ''

if ($installed) {
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $statusText = & $lspmuxPath status 2>&1 | Out-String
  $daemonOk = ($LASTEXITCODE -eq 0)
  $ErrorActionPreference = $prevEap
}
else {
  $statusText = "lspmux binary not found at $lspmuxPath"
}

if ($Json) {
  [PSCustomObject]@{
    installed   = $installed
    binary_path = $lspmuxPath
    daemon_ok   = $daemonOk
    config_path = Get-LspmuxConfigPath
    output      = $statusText.Trim()
  } | ConvertTo-Json -Depth 4
}
else {
  Write-Host "lspmux status" -ForegroundColor Cyan
  Write-Host "  binary:  $lspmuxPath ($(if ($installed) { 'found' } else { 'missing' }))" -ForegroundColor $(if ($installed) { 'Green' } else { 'Yellow' })
  Write-Host "  config:  $(Get-LspmuxConfigPath)" -ForegroundColor DarkGray
  Write-Host ""
  if ($installed) {
    Write-Host $statusText.TrimEnd()
    Write-Host ""
    if ($daemonOk) {
      Write-Host "daemon: reachable" -ForegroundColor Green
    }
    else {
      Write-Host "daemon: not reachable - run yarn lspmux:start" -ForegroundColor Yellow
    }
  }
  else {
    Write-Host $statusText -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Install: yarn lspmux:install" -ForegroundColor DarkGray
  }
}

if (-not $installed) { exit 2 }
if (-not $daemonOk) { exit 1 }
exit 0
