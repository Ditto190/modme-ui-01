#Requires -Version 5.1
<#
.SYNOPSIS
  Cursor sessionStart hook — idempotent modme-launch auto mode (advisory, exit 0).
#>

$ErrorActionPreference = 'Continue'

$HookDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Resolve-Path (Join-Path $HookDir '..\..')
$Launch = Join-Path $RepoRoot 'scripts\modme-launch.ps1'

if (-not (Test-Path $Launch)) {
    exit 0
}

try {
    & $Launch -Mode auto
}
catch {
    Write-Warning "[modme-session-launch] $_"
}

exit 0
