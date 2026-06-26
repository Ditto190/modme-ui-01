#Requires -Version 5.1
<#
.SYNOPSIS
  Sync ModMe lean-ctx config: power profile, max compression, deduped ignores.

.DESCRIPTION
  Writes ~/.config/lean-ctx/config.toml from repo template and runs doctor/gain checks.
  Safe to re-run after lean-ctx updates or plugin cache refreshes.

.EXAMPLE
  .\scripts\lean-ctx\sync-config.ps1
  .\scripts\lean-ctx\sync-config.ps1 -InitGlobal
#>
param(
    [switch]$InitGlobal,
    [switch]$SkipDoctor
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$TemplatePath = Join-Path $RepoRoot 'scripts\lean-ctx\config.toml.template'
$ConfigDir = Join-Path $env:USERPROFILE '.config\lean-ctx'
$ConfigPath = Join-Path $ConfigDir 'config.toml'

if (-not (Test-Path $TemplatePath)) {
    throw "Missing template: $TemplatePath"
}

New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null
Copy-Item -Path $TemplatePath -Destination $ConfigPath -Force
Write-Host "[ok] Wrote $ConfigPath (tool_profile=power, compression_level=max)" -ForegroundColor Green

if ($InitGlobal) {
    if (Get-Command lean-ctx -ErrorAction SilentlyContinue) {
        Write-Host '[run] lean-ctx init --global' -ForegroundColor Cyan
        lean-ctx init --global
        lean-ctx tools power
        lean-ctx discover
    }
    else {
        Write-Warning 'lean-ctx not on PATH — skip init --global'
    }
}

if (-not $SkipDoctor -and (Get-Command lean-ctx -ErrorAction SilentlyContinue)) {
    Write-Host '[run] lean-ctx doctor' -ForegroundColor Cyan
    lean-ctx doctor
    lean-ctx gain
}

Write-Host 'Done. Global hooks: ~/.cursor/hooks.json | Project hooks: .cursor/hooks.json' -ForegroundColor Green
