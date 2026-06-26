Param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('start', 'end', 'prompt', 'event')]
  [string]$Action,
  [string]$SessionId,
  [string]$Message,
  [string]$EventName,
  [hashtable]$Payload,
  [object]$HookInput
)

$ErrorActionPreference = 'SilentlyContinue'

$HookDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $HookDir "..\..\..")).Path
$ConfigPath = Join-Path $HookDir 'config.json'
$Config = @{}
if (Test-Path $ConfigPath) { $Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json }

if ($env:SKIP_LOGGING -eq '1') { exit 0 }

$LogsDir = Join-Path $RepoRoot $Config.logsDir
if (-not (Test-Path $LogsDir)) { New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null }
$SessionLog = Join-Path $LogsDir 'session.log'
$PromptsLog = Join-Path $LogsDir 'prompts.log'
$EventsLog = Join-Path $LogsDir 'events.log'

function Write-JsonLine($path, $obj) {
  $json = $obj | ConvertTo-Json -Depth 8 -Compress
  Add-Content -Path $path -Value $json -Encoding utf8
}

function Get-BranchName {
  param([string]$Root)
  git -C $Root branch --show-current 2>$null
}

function Get-WorktreeFlag {
  param([string]$Root)
  [bool]($Root -match 'Monorepo_ModMe-dev')
}

$timestamp = (Get-Date).ToUniversalTime().ToString('o')
$branch = Get-BranchName -Root $RepoRoot
$worktree = Get-WorktreeFlag -Root $RepoRoot
$conversationId = $null
if ($HookInput) {
  $conversationId = $HookInput.conversation_id
  if (-not $conversationId) { $conversationId = $HookInput.conversationId }
}

switch ($Action) {
  'start' {
    $id = if ($SessionId) { $SessionId } elseif ($conversationId) { $conversationId } else { [guid]::NewGuid().ToString() }
    $cwd = $RepoRoot
    $tracked = @()
    if ($Config.trackedFiles) {
      $tracked = $Config.trackedFiles | ForEach-Object { Join-Path $RepoRoot $_ }
    }
    $entry = @{
      event          = 'sessionStart'
      id             = $id
      timestamp      = $timestamp
      cwd            = $cwd
      branch         = $branch
      worktree       = $worktree
      conversation_id = $conversationId
      trackedFiles   = $tracked
      agent          = 'cursor'
    }
    Write-JsonLine -path $SessionLog -obj $entry
  }
  'end' {
    $id = if ($SessionId) { $SessionId } elseif ($conversationId) { $conversationId } else { '' }
    $entry = @{
      event          = 'sessionEnd'
      id             = $id
      timestamp      = $timestamp
      cwd            = $RepoRoot
      branch         = $branch
      worktree       = $worktree
      conversation_id = $conversationId
      agent          = 'cursor'
    }
    Write-JsonLine -path $SessionLog -obj $entry
  }
  'prompt' {
    if (-not $Message) { exit 1 }
    $entry = @{
      event          = 'prompt'
      sessionId      = $SessionId
      timestamp      = $timestamp
      message        = $Message
      branch         = $branch
      worktree       = $worktree
      conversation_id = $conversationId
      agent          = 'cursor'
    }
    Write-JsonLine -path $PromptsLog -obj $entry
  }
  'event' {
    $name = if ($EventName) { $EventName } else { 'hookFire' }
    $entry = @{
      event          = 'event'
      name           = $name
      sessionId      = $SessionId
      timestamp      = $timestamp
      branch         = $branch
      worktree       = $worktree
      conversation_id = $conversationId
      agent          = 'cursor'
      payload        = $Payload
    }
    if ($HookInput) {
      $entry.hook_event_name = $HookInput.hook_event_name
      $entry.cursor_version  = $HookInput.cursor_version
    }
    Write-JsonLine -path $EventsLog -obj $entry
  }
}

exit 0
