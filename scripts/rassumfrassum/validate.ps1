# Validate rassumfrassum (rass) installation.
# Usage: .\scripts\rassumfrassum\validate.ps1 [-Json]

param(
  [switch]$Json
)

$ErrorActionPreference = "Stop"

function Test-CommandAvailable {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

$rassCmd = $null
foreach ($candidate in @('rass', 'rass.exe')) {
  if (Test-CommandAvailable $candidate) {
    $rassCmd = (Get-Command $candidate).Source
    break
  }
}

$checks = @()

function Add-Check {
  param([string]$Id, [string]$Status, [string]$Message)
  $script:checks += [PSCustomObject]@{ id = $Id; status = $Status; message = $Message }
}

if ($rassCmd) {
  Add-Check 'rass_binary' 'ok' "rass found at $rassCmd"
}
else {
  Add-Check 'rass_binary' 'error' 'rass not on PATH - run yarn rass:install'
}

$helpOk = $false
if ($rassCmd) {
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  rass --help 2>&1 | Out-Null
  $helpOk = ($LASTEXITCODE -eq 0)
  $ErrorActionPreference = $prevEap
  if ($helpOk) {
    Add-Check 'rass_help' 'ok' 'rass --help succeeded'
  }
  else {
    Add-Check 'rass_help' 'error' 'rass --help failed'
  }
}

foreach ($tool in @('ty', 'ruff')) {
  if (Test-CommandAvailable $tool) {
    Add-Check $tool 'ok' "$tool on PATH"
  }
  else {
    Add-Check $tool 'warn' "$tool not on PATH (optional for python preset)"
  }
}

$pipShow = python -m pip show rassumfrassum 2>&1 | Out-String
if ($LASTEXITCODE -eq 0) {
  $version = if ($pipShow -match 'Version:\s*(.+)') { $Matches[1].Trim() } else { 'unknown' }
  Add-Check 'pip_package' 'ok' "rassumfrassum $version installed"
}
else {
  Add-Check 'pip_package' 'error' 'rassumfrassum pip package not found'
}

$errorCount = @($checks | Where-Object { $_.status -eq 'error' }).Count
$warnCount = @($checks | Where-Object { $_.status -eq 'warn' }).Count

if ($Json) {
  [PSCustomObject]@{
    ok     = ($errorCount -eq 0)
    errors = $errorCount
    warns  = $warnCount
    checks = $checks
  } | ConvertTo-Json -Depth 4
}
else {
  Write-Host "rassumfrassum validation" -ForegroundColor Cyan
  foreach ($c in $checks) {
    $color = switch ($c.status) {
      'ok' { 'Green' }
      'warn' { 'Yellow' }
      'error' { 'Red' }
    }
    Write-Host "  [$($c.status)] $($c.id): $($c.message)" -ForegroundColor $color
  }
  Write-Host ""
  if ($errorCount -eq 0) {
    Write-Host "summary: OK (warn=$warnCount)" -ForegroundColor Green
  }
  else {
    Write-Host "summary: FAIL errors=$errorCount warn=$warnCount" -ForegroundColor Red
  }
}

if ($errorCount -gt 0) { exit 1 }
exit 0
