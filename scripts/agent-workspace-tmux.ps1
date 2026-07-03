#Requires -Version 5.1
<#
.SYNOPSIS
  tmux dashboard for ModMe parallel agents (PowerShell launcher for WSL/Git Bash).
#>
param(
  [string]$Session = $env:MODME_TMUX_SESSION,
  [ValidateSet('status', 'attach', 'layout')]
  [string]$Command = 'attach',
  [switch]$Help
)

if ($Help -or -not $Session) {
  if (-not $Session) { $Session = 'modme-agents' }
  @"
agent-workspace-tmux.ps1 — launch bash tmux helper on Windows (WSL/Git Bash)

  -Command status|attach|layout
  -Session   tmux session name (default: modme-agents)
"@
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
$bashScript = Join-Path $ScriptDir 'agent-workspace-tmux.sh'

$bash = Get-Command bash -ErrorAction SilentlyContinue
if (-not $bash) {
  Write-Error 'bash not found. Install Git Bash or WSL, or use: yarn agent:tui (mprocs)'
}

$env:MODME_TMUX_SESSION = $Session
& bash $bashScript $Command --session $Session
