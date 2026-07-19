#Requires -Version 5.1
<#
.SYNOPSIS
  End a worktree agent session — closes envelope and optionally runs vibe-session-finish.
#>
param(
  [switch]$SkipFinish,
  [switch]$VerifyStack,
  [string]$PatternGate,
  [switch]$Help,
  [parameter(ValueFromRemainingArguments = $true)]
  [string[]]$FinishArgs
)

$ErrorActionPreference = 'Stop'

if ($Help) {
  @'
worktree-session-end.ps1 — close agent session envelope in current worktree

  -SkipFinish     Close envelope only (Copilot session.archive default)
  -VerifyStack    Run path-filtered verify before finish
  -PatternGate    Run pattern gate before finish
  Remaining args pass through to vibe-session-finish.ps1
'@
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$finishScript = Join-Path $ScriptDir 'agent-session-finish.ps1'

if (-not (Test-Path $finishScript)) {
  throw "Missing agent-session-finish.ps1: $finishScript"
}

$params = @{
  SkipFinish = $SkipFinish
}
if ($VerifyStack) { $params.VerifyStack = $true }
if ($PatternGate) { $params.PatternGate = $PatternGate }
if ($FinishArgs.Count -gt 0) { $params.FinishArgs = $FinishArgs }

& $finishScript @params
exit $LASTEXITCODE
