#Requires -Version 5.1
<#
.SYNOPSIS
  Windows launcher for ModMe control-cli harness (JSON default).
#>
param(
  [string]$Probe = 'all',
  [switch]$Human,
  [switch]$Brief,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
$harness = Join-Path $ScriptDir 'control-cli-harness.mjs'

if ($Help) {
  @"
control-cli-harness.ps1 — probe orchestration stack

  -Probe   status|mprocs|smoke|tmux|all (default: all)
  -Human   Transcript output
  -Brief   One-line identity
"@
  exit 0
}

$argsList = @()
if ($Brief) { $argsList += '--brief' }
elseif ($Human) { $argsList += '--human' }
else { $argsList += @('--probe', $Probe) }

Set-Location $RepoRoot
& node $harness @argsList
exit $LASTEXITCODE
