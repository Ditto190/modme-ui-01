#Requires -Version 5.1
<#
.SYNOPSIS
  Run Entire doctor / cleanup for stuck sessions.
#>
param([switch]$Trace)

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

if ($Trace) {
  entire doctor trace
}
else {
  entire doctor
}

entire status
