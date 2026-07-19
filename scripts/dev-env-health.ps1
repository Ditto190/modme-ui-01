#Requires -Version 5.1
<#
.SYNOPSIS
  Legacy dev env health entry — delegates to modme-launch.ps1.
.DESCRIPTION
  Advisory wrapper kept for hooks/docs compatibility. Prefer yarn launch:health.
#>

param(
    [switch]$Strict
)

$ErrorActionPreference = 'Continue'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$Launch = Join-Path $ScriptDir 'modme-launch.ps1'

if (-not (Test-Path $Launch)) {
    Write-Warning 'modme-launch.ps1 not found'
    exit 0
}

$args = @('-Mode', 'health')
if ($Strict) { $args += '-Strict' }

& $Launch @args
exit $LASTEXITCODE
