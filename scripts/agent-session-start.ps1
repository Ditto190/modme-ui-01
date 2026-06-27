#Requires -Version 5.1
<#
.SYNOPSIS
  Start an agent terminal session — beads, session envelope, session-logger, task registry.
#>
param(
  [string]$TaskTitle = '',
  [string]$BeadsIssueId = '',
  [string[]]$ClaimPaths = @(),
  [switch]$SkipBeads,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
  @"
agent-session-start — begin orchestrated agent session in current worktree

Options:
  -TaskTitle      Optional task description (duplicate-checked against registry)
  -BeadsIssueId   Link existing beads issue (modme-xxx)
  -ClaimPaths     Optional path prefixes to claim in agent registry
  -SkipBeads      Skip bd ready / create
"@
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
$registryCli = Join-Path $ScriptDir 'agent-task-registry-cli.mjs'

$sessionId = [guid]::NewGuid().ToString()
$branch = git -C $RepoRoot branch --show-current 2>$null
$worktreeName = Split-Path -Leaf $RepoRoot
$portsEnv = Join-Path $RepoRoot '.worktree-ports.env'

if ($TaskTitle) {
  $dupJson = node $registryCli check-duplicate $TaskTitle
  if ($dupJson -and $dupJson -ne 'null') {
    Write-Warning "Similar in-progress task detected: $dupJson"
  }
}

$beadsIssue = $BeadsIssueId
if (-not $SkipBeads) {
  if (-not $beadsIssue) {
    Write-Host 'Checking beads ready...' -ForegroundColor Cyan
    npx --yes @beads/bd ready 2>&1 | Out-Host
    if ($TaskTitle) {
      Write-Host "Creating beads issue: $TaskTitle" -ForegroundColor Cyan
      npx --yes @beads/bd create $TaskTitle --prefix modme --priority 2 2>&1 | Out-Host
    }
  }
  else {
    npx --yes @beads/bd update $beadsIssue --status in_progress 2>&1 | Out-Host
  }
}

$sessionLogger = Join-Path $RepoRoot '.github/hooks/session-logger/session-logger.ps1'
if (Test-Path $sessionLogger) {
  & $sessionLogger -Action start -SessionId $sessionId | Out-Host
}

$sessionsDir = Join-Path $RepoRoot 'logs/agent-orchestrator/sessions'
New-Item -ItemType Directory -Force -Path $sessionsDir | Out-Null

$envelope = [ordered]@{
  session_id    = $sessionId
  worktree      = $worktreeName
  worktree_path = $RepoRoot
  beads_issue   = $beadsIssue
  branch        = $branch
  ports_env     = if (Test-Path $portsEnv) { '.worktree-ports.env' } else { $null }
  started_at    = (Get-Date).ToUniversalTime().ToString('o')
  trace         = @{
    session_logger = 'logs/copilot/session.log'
    agenttrace     = 'yarn agenttrace --latest'
  }
}

$envelopePath = Join-Path $sessionsDir "$sessionId.json"
$envelope | ConvertTo-Json -Depth 5 | Set-Content -Path $envelopePath -Encoding utf8

$env:AGENT_SESSION_ID = $sessionId
$env:AGENT_SESSION_ENVELOPE = $envelopePath
if ($beadsIssue) { $env:BEADS_ISSUE_ID = $beadsIssue }

$desc = if ($TaskTitle) { $TaskTitle } else { 'agent session' }
node $registryCli register $sessionId $desc $RepoRoot ($beadsIssue ?? '') ($branch ?? '') | Out-Null

if ($ClaimPaths.Count -gt 0) {
  $pathsJson = ($ClaimPaths | ConvertTo-Json -Compress)
  node $registryCli claim $sessionId $pathsJson
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$markerDir = Join-Path $RepoRoot '.cursor/hooks/state'
New-Item -ItemType Directory -Force -Path $markerDir | Out-Null
$marker = Join-Path $markerDir 'lean-ctx-session-markers.jsonl'
@{ at = (Get-Date).ToUniversalTime().ToString('o'); event = 'agent-session-start'; session_id = $sessionId; branch = $branch } |
  ConvertTo-Json -Compress | Add-Content -Path $marker -Encoding utf8

if (Get-Command lean-ctx -ErrorAction SilentlyContinue) {
  lean-ctx -c "echo agent-session-start $sessionId" 2>$null | Out-Null
}

Write-Host ''
Write-Host "Agent session started: $sessionId" -ForegroundColor Green
Write-Host "  envelope: $envelopePath"
Write-Host "  TUI:        yarn agent:tui"
Write-Host "  status:     yarn agent:status --json"
Write-Host ''
