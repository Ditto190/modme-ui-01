# Shared path resolution for Copilot workspace scripts.

function Get-CopilotRepoRoot {
  $scriptDir = Split-Path -Parent $PSScriptRoot
  return Split-Path -Parent $scriptDir
}

function Resolve-CopilotWorktreeRoot {
  param([string]$RepoRoot)
  if ($env:COPILOT_WORKSPACE_PATH -and (Test-Path $env:COPILOT_WORKSPACE_PATH)) {
    return (Resolve-Path $env:COPILOT_WORKSPACE_PATH).Path
  }
  return (Resolve-Path $RepoRoot).Path
}

function Resolve-CopilotSourceRoot {
  param([string]$RepoRoot)
  foreach ($candidate in @($env:COPILOT_ROOT_PATH, $env:ROOT_WORKTREE_PATH)) {
    if ($candidate -and (Test-Path $candidate)) {
      return (Resolve-Path $candidate).Path
    }
  }
  return (Resolve-Path $RepoRoot).Path
}

function Get-CopilotScriptTrigger {
  $trigger = $env:COPILOT_SCRIPT_TRIGGER
  if (-not $trigger -and $env:GITHUB_COPILOT_HOOK_EVENT) {
    $trigger = $env:GITHUB_COPILOT_HOOK_EVENT
  }
  if ($trigger -eq 'sessionStart') { return 'session.create' }
  if ($trigger -eq 'sessionEnd') { return 'session.archive' }
  return $trigger
}

function Write-CopilotLifecycleLog {
  param(
    [string]$RepoRoot,
    [string]$Event,
    [hashtable]$Extra = @{}
  )
  $logDir = Join-Path $RepoRoot 'logs/copilot'
  New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  $entry = @{
    at        = (Get-Date).ToUniversalTime().ToString('o')
    event     = $Event
    workspace = $env:COPILOT_WORKSPACE_NAME
    path      = $env:COPILOT_WORKSPACE_PATH
    trigger   = $env:COPILOT_SCRIPT_TRIGGER
  }
  foreach ($key in $Extra.Keys) { $entry[$key] = $Extra[$key] }
  $entry | ConvertTo-Json -Compress | Add-Content -Path (Join-Path $logDir 'workspace-lifecycle.jsonl') -Encoding utf8
}
