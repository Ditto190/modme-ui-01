#Requires -Version 5.1
<#
.SYNOPSIS
  Start an agent terminal session — beads, session envelope, session-logger, task registry.
#>
param(
  [string]$TaskTitle = '',
  [string]$BeadsIssueId = '',
  [string[]]$ClaimPaths = @(),
  [string]$AgentRole = 'dev',
  [switch]$SkipBeads,
  [switch]$BootstrapIntelligence,
  [switch]$DebugTrace,
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
  -AgentRole      A2A role for catalog register (dev|review|test|plan) default dev
  -BootstrapIntelligence  Run lean-ctx-session-bootstrap.ps1 (index + MCP hints)
  -SkipBeads      Skip bd ready / create
  -DebugTrace     Enable LEAN_CTX_DEBUG_LOG=1 for this session (observability debug mode)
"@
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
$registryCli = Join-Path $ScriptDir 'agent-task-registry-cli.mjs'
$catalogCli = Join-Path $ScriptDir 'lean-ctx-agent-catalog.mjs'

# Load project-local lean-ctx data dirs (sets LEAN_CTX_DATA_DIR, LEAN_CTX_STATE_DIR, LEAN_CTX_CACHE_DIR)
$loadLeanCtx = Join-Path $ScriptDir 'load-lean-ctx-env.ps1'
if (Test-Path $loadLeanCtx) {
  . $loadLeanCtx | Out-Null
}

# Enable LEAN_CTX_DEBUG_LOG when -DebugTrace or OBSERVABILITY_DEBUG=1 (not default — production-safe)
if ($DebugTrace -or $env:OBSERVABILITY_DEBUG -eq '1') {
  $env:LEAN_CTX_DEBUG_LOG = '1'
  Write-Host '  [observability] LEAN_CTX_DEBUG_LOG=1 (debug-trace active)' -ForegroundColor DarkYellow
}

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

$leanCtxStateDir = $env:LEAN_CTX_STATE_DIR ?? (Join-Path $RepoRoot 'logs/lean-ctx')
$leanCtxDataDir  = $env:LEAN_CTX_DATA_DIR  ?? (Join-Path $RepoRoot 'data/lean-ctx')

$catalogSnapshot = $null
$catalogVersion = $null
if (Test-Path $catalogCli) {
  Write-Host 'Registering lean-ctx agent catalog (A2A)...' -ForegroundColor Cyan
  node $catalogCli seed 2>&1 | Out-Null
  $regOut = node $catalogCli register --role $AgentRole 2>&1 | Out-String
  Write-Host $regOut
  try {
    $regJson = $regOut | ConvertFrom-Json
    $catalogVersion = $regJson.catalog.version
    $catalogSnapshot = $regJson.catalog
  } catch { }
}

$envelope = [ordered]@{
  session_id    = $sessionId
  worktree      = $worktreeName
  worktree_path = $RepoRoot
  beads_issue   = $beadsIssue
  branch        = $branch
  ports_env     = if (Test-Path $portsEnv) { '.worktree-ports.env' } else { $null }
  started_at    = (Get-Date).ToUniversalTime().ToString('o')
  trace         = @{
    session_logger     = 'logs/copilot/session.log'
    agenttrace         = 'yarn agenttrace --latest'
    lean_ctx           = @{
      journal           = (Join-Path $leanCtxStateDir 'journal*')
      tee               = (Join-Path $leanCtxStateDir 'tee')
      debug_log         = if ($env:LEAN_CTX_DEBUG_LOG -eq '1') { (Join-Path $leanCtxStateDir 'debug.log') } else { $null }
      session_markers   = '.cursor/hooks/state/lean-ctx-session-markers.jsonl'
      archive           = (Join-Path $leanCtxDataDir 'archive')
      catalog_agent     = $catalogSnapshot
      catalog_version   = $catalogVersion
      a2a_role          = $AgentRole
    }
  }
}

$envelopePath = Join-Path $sessionsDir "$sessionId.json"
$envelope | ConvertTo-Json -Depth 5 | Set-Content -Path $envelopePath -Encoding utf8

$env:AGENT_SESSION_ID = $sessionId
$env:AGENT_SESSION_ENVELOPE = $envelopePath
if ($beadsIssue) { $env:BEADS_ISSUE_ID = $beadsIssue }

# OTel session bootstrap — set standard env vars before calling Node bridge
$env:OTEL_SERVICE_NAME = 'modme-agent-orchestrator'
$env:OTEL_RESOURCE_ATTRIBUTES = "session.id=$sessionId,tenant.id=$($env:DEV_TENANT_ID ?? '00000000-0000-4000-8000-000000000001'),agent.platform=cursor,git.branch=$($branch ?? ''),agent.worktree=$worktreeName"
$env:WORKTREE_NAME = $worktreeName
$env:GIT_BRANCH = $branch

$otelScript = Join-Path $ScriptDir 'telemetry/otel-session-start.mjs'
if ((Test-Path $otelScript) -and (Get-Command node -ErrorAction SilentlyContinue)) {
  if ($env:GREPTIME_OTEL_ENABLED -eq '1') {
    $otelResult = node $otelScript 2>&1
    Write-Host "[otel/greptime] $otelResult" -ForegroundColor DarkCyan
  } else {
    # Always run for session envelope registration (dry-run when Greptime not enabled)
    $otelResult = node $otelScript --dry-run 2>&1
    Write-Verbose "[otel] dry-run (GREPTIME_OTEL_ENABLED not set): $otelResult"
  }
}

$evalSync = Join-Path $ScriptDir 'telemetry/lib/eval-session-sync.mjs'
if (Test-Path $evalSync) {
  node $evalSync start --session-id $sessionId --worktree $RepoRoot --branch ($branch ?? '') 2>&1 | Out-Host
}

$desc = if ($TaskTitle) { $TaskTitle } else { 'agent session' }
node $registryCli register $sessionId $desc $RepoRoot ($beadsIssue ?? '') ($branch ?? '') | Out-Null

if ($BootstrapIntelligence) {
  $bootstrap = Join-Path $ScriptDir 'lean-ctx-session-bootstrap.ps1'
  if (Test-Path $bootstrap) {
    & $bootstrap
  }
}

if ($ClaimPaths.Count -gt 0) {
  $pathsJson = ($ClaimPaths | ConvertTo-Json -Compress)
  node $registryCli claim $sessionId $pathsJson
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$markerDir = Join-Path $RepoRoot '.cursor/hooks/state'
New-Item -ItemType Directory -Force -Path $markerDir | Out-Null
$marker = Join-Path $markerDir 'lean-ctx-session-markers.jsonl'
@{ at = (Get-Date).ToUniversalTime().ToString('o'); event = 'a2a-register'; session_id = $sessionId; branch = $branch; agent_type = 'cursor'; role = $AgentRole; catalog_version = $catalogVersion } |
  ConvertTo-Json -Compress | Add-Content -Path $marker -Encoding utf8
@{ at = (Get-Date).ToUniversalTime().ToString('o'); event = 'agent-session-start'; session_id = $sessionId; branch = $branch; a2a_role = $AgentRole; catalog_version = $catalogVersion } |
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
