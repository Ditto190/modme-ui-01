#Requires -Version 5.1
<#
.SYNOPSIS
  Install Entire CLI (Scoop preferred; Go fallback) and enable Cursor local-only.
#>
param(
  [switch]$SkipEnable,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
  @"
scripts/entire/install.ps1 — install Entire CLI + enable in this repo

  Scoop: scoop bucket add entire https://github.com/entireio/scoop-bucket.git
         scoop install entire/cli
  Fallback: go install github.com/entireio/cli/cmd/entire@latest

  Then: entire enable --agent cursor --project --skip-push-sessions --telemetry=false -y
"@
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
Set-Location $RepoRoot

function Refresh-Path {
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
    [System.Environment]::GetEnvironmentVariable('Path', 'User')
}

Refresh-Path

if (-not (Get-Command entire -ErrorAction SilentlyContinue)) {
  if (Get-Command scoop -ErrorAction SilentlyContinue) {
    Write-Host 'Installing Entire via Scoop...' -ForegroundColor Cyan
    scoop bucket add entire https://github.com/entireio/scoop-bucket.git 2>$null
    scoop install entire/cli
  }
  elseif (Get-Command go -ErrorAction SilentlyContinue) {
    Write-Host 'Installing Entire via go install...' -ForegroundColor Cyan
    go install github.com/entireio/cli/cmd/entire@latest
  }
  else {
    Write-Error 'Neither scoop nor go found. Install Scoop or Go, then re-run.'
  }
  Refresh-Path
}

if (-not (Get-Command entire -ErrorAction SilentlyContinue)) {
  Write-Error 'entire not on PATH after install'
}

entire version

if ($SkipEnable) {
  Write-Host 'Skipped enable (-SkipEnable). Run: yarn entire:status' -ForegroundColor Yellow
  exit 0
}

# Project hooks.json must be an object (not []). Empty array breaks Entire's Cursor hook installer.
$hooksPath = Join-Path $RepoRoot '.cursor\hooks.json'
if (Test-Path $hooksPath) {
  $raw = [System.IO.File]::ReadAllText($hooksPath).Trim()
  if ($raw -eq '[]' -or $raw -eq '') {
    [System.IO.File]::WriteAllText($hooksPath, '{"hooks":{},"version":1}')
    Write-Host 'Normalized .cursor/hooks.json from [] to object' -ForegroundColor DarkYellow
  }
}

Write-Host 'Enabling Entire (Cursor, local-only: no telemetry, no session push)...' -ForegroundColor Cyan
entire enable --agent cursor --project --skip-push-sessions --telemetry=false -y
entire status
Write-Host 'Done. Commit .entire/settings.json + .entire/.gitignore when sharing with the team.' -ForegroundColor Green
