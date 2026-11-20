#Requires -Version 5.1
<#
.SYNOPSIS
  Show Entire CLI status for this repository.
#>
$ErrorActionPreference = 'Continue'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
Set-Location $RepoRoot

$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
  [System.Environment]::GetEnvironmentVariable('Path', 'User')

if (-not (Get-Command entire -ErrorAction SilentlyContinue)) {
  Write-Host 'entire: NOT INSTALLED (run yarn entire:install)' -ForegroundColor Red
  exit 1
}

entire version
entire status
if (Test-Path (Join-Path $RepoRoot '.entire\settings.json')) {
  Write-Host 'settings: .entire/settings.json present' -ForegroundColor Green
}
else {
  Write-Host 'settings: missing — run yarn entire:install' -ForegroundColor Yellow
  exit 1
}
