#Requires -Version 5.1
<#
.SYNOPSIS
  End agent session — trace audit, beads update, vibe-session-finish wrapper.
#>
param(
  [string]$SessionId = $env:AGENT_SESSION_ID,
  [string]$BeadsIssueId = $env:BEADS_ISSUE_ID,
  [string]$CloseReason = 'completed',
  [switch]$SkipFinish,
  [switch]$VerifyStack,
  [switch]$Help,
  [parameter(ValueFromRemainingArguments = $true)]
  [string[]]$FinishArgs
)

$ErrorActionPreference = 'Stop'

if ($Help) {
  @"
agent-session-finish — end orchestrated session and optional smart-git finish

Passes remaining args to vibe-session-finish.ps1 (e.g. -DryRun -Yes -CommitMessage -Push -CreatePr).
  -VerifyStack   Run yarn verify:forge/generative based on changed paths before finish
  -SkipFinish     Skip vibe-session-finish (trace + beads only)
"@
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
$registryCli = Join-Path $ScriptDir 'agent-task-registry-cli.mjs'

# Load lean-ctx env (idempotent — safe to call even if already loaded at session start)
$loadLeanCtx = Join-Path $ScriptDir 'load-lean-ctx-env.ps1'
if (Test-Path $loadLeanCtx) {
  . $loadLeanCtx | Out-Null
}

if (-not $SessionId -and $env:AGENT_SESSION_ENVELOPE -and (Test-Path $env:AGENT_SESSION_ENVELOPE)) {
  try {
    $envData = Get-Content $env:AGENT_SESSION_ENVELOPE -Raw | ConvertFrom-Json
    $SessionId = $envData.session_id
    if (-not $BeadsIssueId) { $BeadsIssueId = $envData.beads_issue }
  } catch { }
}

# agenttrace (advisory)
if (Get-Command yarn -ErrorAction SilentlyContinue) {
  yarn agenttrace --latest 2>&1 | Out-Host
}

# session-logger end
$sessionLogger = Join-Path $RepoRoot '.github/hooks/session-logger/session-logger.ps1'
if ($SessionId -and (Test-Path $sessionLogger)) {
  & $sessionLogger -Action end -SessionId $SessionId | Out-Host
}

$evalSync = Join-Path $ScriptDir 'telemetry/lib/eval-session-sync.mjs'
if ($SessionId -and (Test-Path $evalSync)) {
  node $evalSync finish --session-id $SessionId 2>&1 | Out-Host
}

# OTel flush — write final trace_ref span and close agent.session span in Greptime
$otelStart = Join-Path $ScriptDir 'telemetry/otel-session-start.mjs'
if ($SessionId -and (Test-Path $otelStart) -and (Get-Command node -ErrorAction SilentlyContinue)) {
  $otelFlush = node $otelStart --session-id $SessionId --dry-run 2>&1
  Write-Host "[otel-flush] $otelFlush" -ForegroundColor DarkCyan
}

$telemetryCli = Join-Path $ScriptDir 'telemetry/telemetry-cli.mjs'
if (Test-Path $telemetryCli) {
  # Async fire-and-forget telemetry collect (non-blocking session finish)
  Start-Job -ScriptBlock {
    param($Cli, $Root)
    Set-Location $Root
    node $Cli collect --since=1d 2>&1 | Out-Null
  } -ArgumentList $telemetryCli, $RepoRoot | Out-Null
  Write-Host '[telemetry] async collect job started (1d window)' -ForegroundColor DarkGray
}

# Optional stack verify
if ($VerifyStack) {
  Write-Host 'Running path-filtered stack verify...' -ForegroundColor Cyan
  node (Join-Path $ScriptDir 'pre-push-checks.mjs')
  if ($LASTEXITCODE -ne 0) {
    Write-Host '[agent-orchestrator] level=error event=verify_stack_failed' -ForegroundColor Red
    $errLog = Join-Path $RepoRoot 'logs/agent-orchestrator/errors.jsonl'
    New-Item -ItemType Directory -Force -Path (Split-Path $errLog) | Out-Null
    @{ at = (Get-Date).ToUniversalTime().ToString('o'); level = 'error'; event = 'verify_stack_failed'; session_id = $SessionId } |
      ConvertTo-Json -Compress | Add-Content -Path $errLog -Encoding utf8
    exit $LASTEXITCODE
  }
}

if ($SessionId) {
  node $registryCli update $SessionId closed $CloseReason | Out-Null
  node $registryCli release $SessionId | Out-Null
}

if ($BeadsIssueId) {
  npx --yes @beads/bd update $BeadsIssueId --status closed --comment $CloseReason 2>&1 | Out-Host
}

# lean-ctx diary marker
$markerDir = Join-Path $RepoRoot '.cursor/hooks/state'
New-Item -ItemType Directory -Force -Path $markerDir | Out-Null
$marker = Join-Path $markerDir 'lean-ctx-session-markers.jsonl'
@{ at = (Get-Date).ToUniversalTime().ToString('o'); event = 'agent-session-finish'; session_id = $SessionId; reason = $CloseReason } |
  ConvertTo-Json -Compress | Add-Content -Path $marker -Encoding utf8

if ($SessionId -and $env:AGENT_SESSION_ENVELOPE -and (Test-Path $env:AGENT_SESSION_ENVELOPE)) {
  try {
    $envObj = Get-Content $env:AGENT_SESSION_ENVELOPE -Raw | ConvertFrom-Json
    $envObj | Add-Member -NotePropertyName finished_at -NotePropertyValue (Get-Date).ToUniversalTime().ToString('o') -Force
    $envObj | ConvertTo-Json -Depth 5 | Set-Content -Path $env:AGENT_SESSION_ENVELOPE -Encoding utf8
  } catch { }
}

if (-not $SkipFinish) {
  $finishScript = Join-Path $ScriptDir 'vibe-session-finish.ps1'
  if ($FinishArgs.Count -gt 0) {
    & $finishScript @FinishArgs
  } else {
    & $finishScript
  }
  exit $LASTEXITCODE
}

Write-Host 'Agent session finished (finish skipped).' -ForegroundColor Green
