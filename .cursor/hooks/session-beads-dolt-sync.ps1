#Requires -Version 5.1
<#
.SYNOPSIS
  H3 sessionEnd: beads↔Dolt sync + optional Entire checkpoint (fail-open).

.DESCRIPTION
  Adapts awesome-copilot session-auto-commit ideas WITHOUT git add -A / --no-verify.
  Default: yarn beads:push. Optional guarded WIP commit when MODME_SESSION_AUTO_COMMIT=1
  and cwd is a worktree (not main checkout). Governance (secrets → license → audit) gates WIP.
#>
param(
  [switch]$SkipBeadsPush,
  [switch]$Help
)

$ErrorActionPreference = 'Continue'

if ($Help) {
  @'
session-beads-dolt-sync — Cursor sessionEnd hook (fail-open)

  1. yarn beads:push (Dolt sync)
  2. entire checkpoint if CLI present
  3. Optional WIP git commit only if MODME_SESSION_AUTO_COMMIT=1 and in a worktree
     (after .github/hooks/session-governance — never git add -A, never --no-verify)
'@
  exit 0
}

$HookDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent (Split-Path -Parent $HookDir)
if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot 'package.json'))) {
  $RepoRoot = (Get-Location).Path
}

Set-Location $RepoRoot

$stateDir = Join-Path $RepoRoot '.cursor\hooks\state'
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
$log = Join-Path $stateDir 'session-beads-dolt-sync.jsonl'

function Write-SyncLog([string]$Event, [hashtable]$Extra = @{}) {
  $row = @{ at = (Get-Date).ToUniversalTime().ToString('o'); event = $Event }
  foreach ($k in $Extra.Keys) { $row[$k] = $Extra[$k] }
  ($row | ConvertTo-Json -Compress) | Add-Content -Path $log -Encoding utf8
}

Write-SyncLog 'start'

# 1. Beads → Dolt
if (-not $SkipBeadsPush) {
  if (Get-Command yarn -ErrorAction SilentlyContinue) {
    Write-Host '[session-sync] yarn beads:push…' -ForegroundColor Cyan
    yarn beads:push 2>&1 | Out-Host
    Write-SyncLog 'beads-push' @{ exit = $LASTEXITCODE }
  }
  else {
    Write-SyncLog 'beads-push' @{ skipped = $true; reason = 'yarn missing' }
  }
}

# 2. Entire checkpoint (best-effort)
if (Get-Command entire -ErrorAction SilentlyContinue) {
  try {
    entire checkpoint 2>&1 | Out-Null
    Write-SyncLog 'entire-checkpoint' @{ ok = $true }
  }
  catch {
    Write-SyncLog 'entire-checkpoint' @{ ok = $false; err = "$_" }
  }
}

# 3. Optional guarded WIP commit (never --no-verify, never on main checkout)
if ($env:MODME_SESSION_AUTO_COMMIT -eq '1') {
  $inWorktree = $false
  try {
    $common = git -C $RepoRoot rev-parse --git-common-dir 2>$null
    $gitDir = git -C $RepoRoot rev-parse --git-dir 2>$null
    if ($common -and $gitDir -and ($common -ne $gitDir) -and ($common -ne '.')) {
      $inWorktree = $true
    }
    $leaf = Split-Path -Leaf $RepoRoot
    if ($RepoRoot -match '[\\/]\.worktrees[\\/]' -or $leaf -match '^dev-agent-') {
      $inWorktree = $true
    }
  }
  catch { }

  if (-not $inWorktree) {
    Write-SyncLog 'wip-commit' @{ skipped = $true; reason = 'not a worktree' }
  }
  else {
    $status = git -C $RepoRoot status --porcelain 2>$null
    if (-not $status) {
      Write-SyncLog 'wip-commit' @{ skipped = $true; reason = 'clean tree' }
    }
    else {
      $govScript = Join-Path $RepoRoot '.github\hooks\session-governance\Invoke-SessionGovernance.ps1'
      if (Test-Path -LiteralPath $govScript) {
        Write-Host '[session-sync] governance gates…' -ForegroundColor Cyan
        & pwsh -NoProfile -ExecutionPolicy Bypass -File $govScript
        $govExit = $LASTEXITCODE
        Write-SyncLog 'governance' @{ exit = $govExit }
        if ($govExit -ne 0) {
          Write-SyncLog 'wip-commit' @{ skipped = $true; reason = 'governance-blocked' }
          Write-Host '[session-sync] WIP skipped (governance blocked)' -ForegroundColor Yellow
          Write-SyncLog 'done'
          exit 0
        }
      }
      else {
        Write-SyncLog 'governance' @{ skipped = $true; reason = 'missing Invoke-SessionGovernance.ps1' }
      }

      $msg = "chore(session): WIP checkpoint $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
      # Explicit tracked updates only — never git add -A; hooks always run
      git -C $RepoRoot add -u -- . 2>$null
      git -C $RepoRoot commit -m $msg 2>&1 | Out-Host
      Write-SyncLog 'wip-commit' @{ exit = $LASTEXITCODE; msg = $msg }
    }
  }
}

Write-SyncLog 'done'
exit 0
