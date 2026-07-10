#Requires -Version 5.1
<#
.SYNOPSIS
  JSONL session logger for Copilot/Cursor agent sessions (eval + observability pipeline).

.DESCRIPTION
  Writes structured events to logs/copilot/session.log and logs/copilot/prompts.log.
  Fields: timestamp, event, sessionId, agent, worktree, branch (+ message on prompts).

.PARAMETER Action
  start | end | prompt | event

.PARAMETER SessionId
  Session UUID (auto-generated on start if omitted).

.PARAMETER Message
  Prompt text or event payload (required for prompt/event).

.PARAMETER EventType
  For Action=event: toolCall | userCorrection | hookFire | etc.

.EXAMPLE
  .\.github\hooks\session-logger\session-logger.ps1 start
  .\.github\hooks\session-logger\session-logger.ps1 prompt -SessionId $id -Message "fix auth"
  .\.github\hooks\session-logger\session-logger.ps1 end -SessionId $id
#>
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('start', 'end', 'prompt', 'event')]
  [string]$Action,

  [string]$SessionId,
  [string]$Message,
  [string]$EventType
)

$ErrorActionPreference = 'Stop'

if ($env:SKIP_LOGGING -eq 'true') {
  exit 0
}

$HookDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $HookDir '..\..\..')).Path
$ConfigPath = Join-Path $HookDir 'config.json'

$Config = @{ logsDir = 'logs/copilot' }
if (Test-Path -LiteralPath $ConfigPath) {
  $Config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
}

$LogsDir = Join-Path $RepoRoot ($Config.logsDir -replace '\\', [IO.Path]::DirectorySeparatorChar)
if (-not (Test-Path -LiteralPath $LogsDir)) {
  New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null
}

$SessionLog = Join-Path $LogsDir 'session.log'
$PromptsLog = Join-Path $LogsDir 'prompts.log'

function Get-AgentName {
  foreach ($key in @('CURSOR_AGENT', 'AGENT_OWNER', 'COPILOT_AGENT', 'GITHUB_COPILOT_AGENT')) {
    if (-not [string]::IsNullOrWhiteSpace((Get-Item -Path "Env:$key" -ErrorAction SilentlyContinue).Value)) {
      return (Get-Item -Path "Env:$key").Value
    }
  }
  if ($env:AGENT_SESSION_ID) { return 'orchestrated' }
  return 'unknown'
}

function Get-BranchName {
  $branch = git -C $RepoRoot branch --show-current 2>$null
  if ($LASTEXITCODE -eq 0 -and $branch) { return $branch.Trim() }
  return ''
}

function Get-WorktreeName {
  if ($env:AGENT_SESSION_ENVELOPE -and (Test-Path -LiteralPath $env:AGENT_SESSION_ENVELOPE)) {
    try {
      $envObj = Get-Content -LiteralPath $env:AGENT_SESSION_ENVELOPE -Raw | ConvertFrom-Json
      if ($envObj.worktree) { return [string]$envObj.worktree }
    } catch { }
  }
  return Split-Path -Leaf $RepoRoot
}

function Write-JsonLine {
  param([string]$Path, [hashtable]$Obj)
  $json = $Obj | ConvertTo-Json -Depth 6 -Compress
  Add-Content -LiteralPath $Path -Value $json -Encoding utf8
}

function New-BaseEntry {
  param([string]$EventName, [string]$Id)
  @{
    timestamp = (Get-Date).ToUniversalTime().ToString('o')
    event     = $EventName
    sessionId = $Id
    agent     = Get-AgentName
    worktree  = Get-WorktreeName
    branch    = Get-BranchName
  }
}

$resolvedSessionId = $SessionId
if ([string]::IsNullOrWhiteSpace($resolvedSessionId)) {
  $resolvedSessionId = $env:AGENT_SESSION_ID
}

switch ($Action) {
  'start' {
    if ([string]::IsNullOrWhiteSpace($resolvedSessionId)) {
      $resolvedSessionId = [guid]::NewGuid().ToString()
    }
    $entry = New-BaseEntry -EventName 'sessionStart' -Id $resolvedSessionId
    $entry.cwd = (Get-Location).Path
    if ($Config.trackedFiles) {
      $entry.trackedFiles = @($Config.trackedFiles | ForEach-Object { Join-Path $RepoRoot $_ })
    }
    Write-JsonLine -Path $SessionLog -Obj $entry
    Write-Output "Started session $resolvedSessionId"
  }
  'end' {
    $sid = if ($resolvedSessionId) { $resolvedSessionId } else { '' }
    $entry = New-BaseEntry -EventName 'sessionEnd' -Id $sid
    $entry.cwd = (Get-Location).Path
    Write-JsonLine -Path $SessionLog -Obj $entry
    Write-Output "Ended session $resolvedSessionId"
  }
  'prompt' {
    if ([string]::IsNullOrWhiteSpace($Message)) {
      Write-Error 'Message required for prompt action'
      exit 1
    }
    $sid = if ($resolvedSessionId) { $resolvedSessionId } else { '' }
    $entry = New-BaseEntry -EventName 'prompt' -Id $sid
    $entry.message = $Message
    Write-JsonLine -Path $PromptsLog -Obj $entry
    Write-Output 'Logged prompt'
  }
  'event' {
    if ([string]::IsNullOrWhiteSpace($EventType)) {
      Write-Error 'EventType required for event action'
      exit 1
    }
    $sid = if ($resolvedSessionId) { $resolvedSessionId } else { '' }
    $entry = New-BaseEntry -EventName $EventType -Id $sid
    if ($Message) { $entry.detail = $Message }
    Write-JsonLine -Path $SessionLog -Obj $entry
    Write-Output "Logged event $EventType"
  }
}

exit 0
