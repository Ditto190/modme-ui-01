#Requires -Version 5.1
<#
.SYNOPSIS
  End a worktree agent session: trace audit, verify, commit/PR, optional worktree removal.
#>
param(
  [switch]$VerifyStack,
  [switch]$SkipFinish,
  [switch]$RemoveWorktree,
  [switch]$Yes,
  [string]$CommitMessage,
  [switch]$Push,
  [switch]$CreatePr,
  [switch]$DryRun,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'

if ($Help) {
  @"
worktree-session-end — close session envelope, optional vibe finish, optional worktree cleanup

Options:
  -VerifyStack      Path-filtered verify before finish (via agent-session-finish)
  -SkipFinish       Close envelope only; no commit/PR
  -RemoveWorktree   After successful finish, remove this worktree (agent task folders only)
  -Yes              Non-interactive vibe-session-finish
  -CommitMessage    Conventional commit message
  -Push             Push branch after commit
  -CreatePr         Open PR to dev via gh
  -DryRun           Preview vibe-session-finish without mutating git

Examples:
  .\scripts\worktree-session-end.ps1 -VerifyStack -Yes -CommitMessage "feat: summary" -Push -CreatePr
  .\scripts\worktree-session-end.ps1 -SkipFinish -RemoveWorktree -Yes
"@
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
. "$ScriptDir/lib/worktree-context.ps1"

$ctx = Get-WorktreeContext -RepoRoot $RepoRoot

if ($ctx.IsMainCheckout) {
  Write-Error "worktree-session-end must run from a worktree under .worktrees/, not the main checkout."
}

$finishPassthrough = @()
if ($VerifyStack) { $finishPassthrough += '-VerifyStack' }
if ($SkipFinish) { $finishPassthrough += '-SkipFinish' }
if ($Yes) { $finishPassthrough += '-Yes' }
if ($CommitMessage) { $finishPassthrough += '-CommitMessage'; $finishPassthrough += $CommitMessage }
if ($Push) { $finishPassthrough += '-Push' }
if ($CreatePr) { $finishPassthrough += '-CreatePr' }
if ($DryRun) { $finishPassthrough += '-DryRun' }

& "$ScriptDir/agent-session-finish.ps1" @finishPassthrough
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $SkipFinish) {
  $vibeArgs = @()
  if ($Yes) { $vibeArgs += '-Yes' }
  if ($CommitMessage) { $vibeArgs += '-CommitMessage'; $vibeArgs += $CommitMessage }
  if ($Push) { $vibeArgs += '-Push' }
  if ($CreatePr) { $vibeArgs += '-CreatePr' }
  if ($DryRun) { $vibeArgs += '-DryRun' }
  if ($vibeArgs.Count -gt 0) {
    & "$ScriptDir/vibe-session-finish.ps1" @vibeArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
}

if ($RemoveWorktree) {
  $leaf = Split-Path -Leaf $RepoRoot
  if ($leaf -eq 'dev') {
    Write-Warning "Refusing -RemoveWorktree on persistent .worktrees/dev checkout."
  }
  elseif ($leaf -match '^dev-agent-' -or $leaf -match '^dev-human-') {
    & "$ScriptDir/remove-agent-worktree.ps1" -Path $RepoRoot -Yes
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  else {
    Write-Warning "Worktree path does not match dev-agent-* or dev-human-*; skipped removal."
  }
}

$markerDir = Join-Path $RepoRoot '.cursor/hooks/state'
New-Item -ItemType Directory -Force -Path $markerDir | Out-Null
$marker = Join-Path $markerDir 'lean-ctx-session-markers.jsonl'
@{
  at          = (Get-Date).ToUniversalTime().ToString('o')
  event       = 'worktree-session-end'
  worktree    = Split-Path -Leaf $RepoRoot
  removed     = [bool]$RemoveWorktree
  branch      = $ctx.Branch
} | ConvertTo-Json -Compress | Add-Content -Path $marker -Encoding utf8

Write-Host ''
Write-Host 'Worktree session ended.' -ForegroundColor Green
Write-Host "  End session again: yarn worktree:session:end" -ForegroundColor Cyan
