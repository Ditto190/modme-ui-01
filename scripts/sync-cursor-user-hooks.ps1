#Requires -Version 5.1
<#
.SYNOPSIS
  Merge ModMe session-start hook into user ~/.cursor/hooks.json (preserve lean-ctx hooks).
.DESCRIPTION
  Do NOT replace ~/.cursor/hooks.json — merge sessionStart entry for dev-env healthcheck.
  Run once after clone or when hooks look wrong.

  Usage:
    .\scripts\sync-cursor-user-hooks.ps1
    .\scripts\sync-cursor-user-hooks.ps1 -WhatIf
#>
param(
    [switch]$WhatIf
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
$UserHooks = Join-Path $env:USERPROFILE '.cursor/hooks.json'
$ModMeHook = Join-Path $RepoRoot '.cursor/hooks/session-start-modme.ps1'
$ModMeHook = (Resolve-Path $ModMeHook).Path -replace '\\', '/'

if (-not (Test-Path -LiteralPath $ModMeHook)) {
    throw "Missing hook script: $ModMeHook"
}

$modmeEntry = @{
    command    = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$ModMeHook`""
    failClosed = $false
    timeoutSec = 120
}

$hooks = @{ version = 1; hooks = @{} }

if (Test-Path -LiteralPath $UserHooks) {
    $raw = Get-Content -LiteralPath $UserHooks -Raw -Encoding utf8
    $parsed = $raw | ConvertFrom-Json
    if ($parsed.version) { $hooks.version = $parsed.version }
    if ($parsed.hooks) {
        $parsed.hooks.PSObject.Properties | ForEach-Object {
            $hooks.hooks[$_.Name] = @($_.Value)
        }
    }
}

if (-not $hooks.hooks.ContainsKey('sessionStart')) {
    $hooks.hooks['sessionStart'] = @()
}

$existing = @($hooks.hooks['sessionStart'])
$already = $existing | Where-Object { $_.command -match 'session-start-modme\.ps1' }
if ($already) {
    Write-Host 'ModMe sessionStart hook already present in ~/.cursor/hooks.json' -ForegroundColor Green
}
else {
    $hooks.hooks['sessionStart'] = @($modmeEntry) + $existing
    Write-Host 'Adding ModMe sessionStart hook (prepended before existing entries)' -ForegroundColor Cyan
}

if ($WhatIf) {
    ($hooks | ConvertTo-Json -Depth 10) | Write-Host
    exit 0
}

$dir = Split-Path -Parent $UserHooks
if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

$backup = "$UserHooks.bak.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
if (Test-Path $UserHooks) {
    Copy-Item -LiteralPath $UserHooks -Destination $backup
    Write-Host "Backup: $backup"
}

($hooks | ConvertTo-Json -Depth 10) | Set-Content -LiteralPath $UserHooks -Encoding utf8
Write-Host "Updated: $UserHooks" -ForegroundColor Green
Write-Host ''
Write-Host 'Verify: sessionStart should include BOTH session-start-modme.ps1 AND lean-ctx hook observe' -ForegroundColor DarkGray
