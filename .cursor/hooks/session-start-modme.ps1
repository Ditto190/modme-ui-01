#Requires -Version 5.1
<#
.SYNOPSIS
  Cursor sessionStart hook — run ModMe dev healthcheck when this workspace is Monorepo_ModMe.
.DESCRIPTION
  Uses absolute paths so user-level ~/.cursor/hooks.json works regardless of cwd.
  Keeps lean-ctx observe hooks separate; this script is an additional sessionStart entry.
#>
param()

$ErrorActionPreference = 'Continue'

$HookDir = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $HookDir '../..')).Path
$Marker = Join-Path $RepoRoot '.lean-ctx.toml'

if (-not (Test-Path -LiteralPath $Marker)) {
    Write-Verbose "session-start-modme: skip (not Monorepo_ModMe: $RepoRoot)"
    exit 0
}

$HealthScript = Join-Path $RepoRoot 'scripts/dev-env-health.ps1'
if (-not (Test-Path -LiteralPath $HealthScript)) {
    Write-Warning "session-start-modme: missing $HealthScript"
    exit 0
}

& powershell -NoProfile -ExecutionPolicy Bypass -File $HealthScript
exit 0
