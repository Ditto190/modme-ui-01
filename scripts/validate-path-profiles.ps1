#Requires -Version 5.1
<#
.SYNOPSIS
  Windows launcher for ModMe path profile validator (JSON default).
#>
param(
  [switch]$Human,
  [switch]$Strict,
  [switch]$NoWriteCache,
  [switch]$Brief,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
$validator = Join-Path $ScriptDir 'validate-path-profiles.mjs'

if ($Help) {
  @"
validate-path-profiles.ps1 — bootstrap path profile gate

  -Human        Transcript output with [OK]/[!] tags
  -Strict       Treat warnings as failures
  -NoWriteCache Skip cache write
  -Brief        One-line identity
"@
  exit 0
}

$argsList = @()
if ($Brief) { $argsList += '--brief' }
if ($Human) { $argsList += '--human' }
if ($Strict) { $argsList += '--strict' }
if ($NoWriteCache) { $argsList += '--no-write-cache' }

Set-Location $RepoRoot
& node $validator @argsList
exit $LASTEXITCODE
