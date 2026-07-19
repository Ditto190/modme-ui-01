#Requires -Version 5.1
<#
.SYNOPSIS
  Terminal-attach health for the agent data plane (H2).

.DESCRIPTION
  Fail-open probe called from PowerShell profile / integrated terminal open.
  Soft-fixes lean-ctx config and runs km-session-bootstrap (non-strict).

  By default this is silent and non-blocking: stamp debounce immediately, then
  spawn a background PowerShell that writes to the jsonl/log only so the
  interactive prompt is never held by beads/npx/km:status.
#>
param(
  [switch]$Force,
  [switch]$Foreground,
  [int]$DebounceMinutes = 30,
  [switch]$Help
)

$ErrorActionPreference = 'Continue'

if ($Help) {
  @'
modme-terminal-attach — KM / agent plane health on terminal open (fail-open, silent)

  1. Debounce (default 30m) via .cursor/hooks/state/modme-terminal-attach.stamp
  2. Stamp immediately (prevents concurrent shells from stacking)
  3. Background: yarn lean-ctx:ensure -CheckOnly + km-session-bootstrap (non-strict)
     Logs: .cursor/hooks/state/modme-terminal-attach.jsonl (+ .log for child stdout)

  -Foreground  Run probes in this shell (verbose; for debugging)
  -Force       Ignore debounce
  MODME_SKIP_TERMINAL_ATTACH=1  Skip entirely (profile guard)
'@
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir

# Guard: empty $RepoRoot would break Join-Path (seen in broken profiles)
if (-not $RepoRoot -or -not (Test-Path -LiteralPath $RepoRoot)) {
  exit 0
}

$stateDir = Join-Path $RepoRoot '.cursor\hooks\state'
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
$stamp = Join-Path $stateDir 'modme-terminal-attach.stamp'
$log = Join-Path $stateDir 'modme-terminal-attach.jsonl'
$childLog = Join-Path $stateDir 'modme-terminal-attach.bg.log'

if (-not $Force -and (Test-Path -LiteralPath $stamp)) {
  try {
    $age = (Get-Date) - (Get-Item -LiteralPath $stamp).LastWriteTime
    if ($age.TotalMinutes -lt $DebounceMinutes) {
      exit 0
    }
  }
  catch { }
}

function Write-AttachLog([string]$Event, [hashtable]$Extra = @{}) {
  $row = @{
    at    = (Get-Date).ToUniversalTime().ToString('o')
    event = $Event
    repo  = $RepoRoot
  }
  foreach ($k in $Extra.Keys) { $row[$k] = $Extra[$k] }
  try {
    ($row | ConvertTo-Json -Compress) | Add-Content -Path $log -Encoding utf8
  }
  catch { }
}

# Stamp first so parallel terminals debounce instead of all hanging on bd ready.
Set-Content -Path $stamp -Value ((Get-Date).ToUniversalTime().ToString('o')) -Encoding utf8
Write-AttachLog 'start' @{ mode = $(if ($Foreground) { 'foreground' } else { 'background' }) }

$leanEnsure = Join-Path $ScriptDir 'ensure-lean-ctx-config.ps1'
$km = Join-Path $ScriptDir 'km-session-bootstrap.ps1'

function Invoke-ModMeAttachProbes {
  Set-Location $RepoRoot
  if (Test-Path -LiteralPath $leanEnsure) {
    try {
      & $leanEnsure -CheckOnly 2>&1 | Out-Null
      Write-AttachLog 'lean-ctx-check' @{ ok = $true }
    }
    catch {
      Write-AttachLog 'lean-ctx-check' @{ ok = $false; err = "$_" }
    }
  }

  if (Test-Path -LiteralPath $km) {
    try {
      # Full bootstrap (incl. beads) only in this silent/background child — never on the interactive prompt.
      & $km 2>&1 | Out-Null
      Write-AttachLog 'km-bootstrap' @{ exit = $LASTEXITCODE }
    }
    catch {
      Write-AttachLog 'km-bootstrap' @{ ok = $false; err = "$_" }
    }
  }
  else {
    Write-AttachLog 'km-bootstrap' @{ ok = $false; err = 'km-session-bootstrap.ps1 missing' }
  }

  Write-AttachLog 'done'
}

if ($Foreground) {
  Write-Host '[modme-terminal-attach] agent plane health (foreground)…' -ForegroundColor Cyan
  Invoke-ModMeAttachProbes
  exit 0
}

# Silent background update — never block the interactive prompt.
$psExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
if (-not (Test-Path -LiteralPath $psExe)) {
  $psExe = 'powershell.exe'
}

$argList = @(
  '-NoProfile',
  '-ExecutionPolicy', 'Bypass',
  '-WindowStyle', 'Hidden',
  '-File', "`"$($MyInvocation.MyCommand.Path)`"",
  '-Force',
  '-Foreground'
)

try {
  $errLog = Join-Path $stateDir 'modme-terminal-attach.bg.err.log'
  Start-Process -FilePath $psExe -ArgumentList $argList -WorkingDirectory $RepoRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $childLog `
    -RedirectStandardError $errLog `
    -ErrorAction Stop | Out-Null
  Write-AttachLog 'spawned' @{ log = $childLog; errLog = $errLog }
}
catch {
  # Last resort: run probes inline but still quiet (no Host spam).
  Write-AttachLog 'spawn-failed' @{ err = "$_" }
  Invoke-ModMeAttachProbes
}

exit 0
