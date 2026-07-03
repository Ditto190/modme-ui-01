#Requires -Version 5.1
<#
.SYNOPSIS
  Bootstrap lean-ctx intelligence — graph build, index build, knowledge wakeup.
.DESCRIPTION
  Called from agent-session-start.ps1 when -BootstrapIntelligence is set.
  Uses lean-ctx CLI when available; emits MCP fallback instructions otherwise.
#>
param(
  [string]$RepoRoot = (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)),
  [switch]$SkipGraph,
  [switch]$SkipIndex,
  [switch]$Help
)

$ErrorActionPreference = 'Continue'

if ($Help) {
  @"
lean-ctx-session-bootstrap — graph + index + knowledge wakeup

Options:
  -SkipGraph   Skip lean-ctx index/graph build
  -SkipIndex   Skip index build only
"@
  exit 0
}

$loadEnv = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Definition) 'load-lean-ctx-env.ps1'
if (Test-Path $loadEnv) {
  . $loadEnv -RepoRoot $RepoRoot | Out-Null
}

function Invoke-LeanCtxStep([string[]]$Args, [string]$Label) {
  if (-not (Get-Command lean-ctx -ErrorAction SilentlyContinue)) {
    Write-Host "  [bootstrap] lean-ctx not on PATH — MCP fallback for $Label" -ForegroundColor DarkYellow
    return $false
  }
  Write-Host "  [bootstrap] lean-ctx $($Args -join ' ')" -ForegroundColor Cyan
  & lean-ctx @Args 2>&1 | Out-Host
  return ($LASTEXITCODE -eq 0)
}

Write-Host 'lean-ctx-session-bootstrap' -ForegroundColor Green

if (-not $SkipGraph) {
  Invoke-LeanCtxStep @('index', 'build') 'ctx_graph/index build' | Out-Null
}

if (-not $SkipIndex) {
  Invoke-LeanCtxStep @('index', 'build-full') 'ctx_index build-full' | Out-Null
}

Write-Host '  [bootstrap] MCP: ctx_knowledge action=wakeup' -ForegroundColor DarkCyan
Write-Host '  [bootstrap] MCP: ctx_session action=load' -ForegroundColor DarkCyan

if ($env:LEAN_CTX_PROFILE) {
  Write-Host "  [bootstrap] active profile: $($env:LEAN_CTX_PROFILE)" -ForegroundColor DarkGray
}

Write-Host 'lean-ctx-session-bootstrap: done' -ForegroundColor Green
