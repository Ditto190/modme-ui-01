# Cursor worktree bootstrap - Windows (essential mirror + shared-deps).
# ROOT_WORKTREE_PATH is set by Cursor to the main checkout path.
# Prefer junctions from .worktrees/dev over per-agent yarn/bun/poetry installs.

$ErrorActionPreference = "Stop"

$WorktreeRoot = (Get-Location).Path
$RootWorktree = if ($env:ROOT_WORKTREE_PATH) { $env:ROOT_WORKTREE_PATH } else { $WorktreeRoot }

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   Monorepo_ModMe worktree setup (Windows)" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   Worktree: $WorktreeRoot"
Write-Host "   Root:     $RootWorktree"
Write-Host "   Mode:     shared-deps (essential mirror)"
Write-Host ""

$scriptsDir = Join-Path $WorktreeRoot "scripts"
if (-not (Test-Path (Join-Path $scriptsDir "lib/worktree-bootstrap.ps1"))) {
  $scriptsDir = Join-Path $RootWorktree "scripts"
}

. (Join-Path $scriptsDir "lib/worktree-context.ps1")
. (Join-Path $scriptsDir "lib/worktree-bootstrap.ps1")

$ctx = Get-WorktreeContext -RepoRoot $WorktreeRoot
Write-ModMeWorktreeResourceWarnings -AgentWorktreesRoot $ctx.WorktreesRoot

# SharedDeps default: env + lockfiles + junctions (no multi-GB install)
Write-Host "1/6 Bootstrap (shared-deps)..." -ForegroundColor Cyan
Invoke-WorktreeBootstrap -WorktreeRoot $WorktreeRoot -SourceRoot $RootWorktree -SharedDeps
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Optional lean-ctx doctor
Write-Host "2/6 lean-ctx doctor (non-fatal)..." -ForegroundColor Cyan
if (Get-Command lean-ctx -ErrorAction SilentlyContinue) {
  lean-ctx doctor
  if ($LASTEXITCODE -ne 0) {
    Write-Host "   lean-ctx doctor reported issues (continuing)" -ForegroundColor DarkYellow
  }
}
else {
  Write-Host "   lean-ctx not on PATH - skipped" -ForegroundColor DarkYellow
}

Write-Host "3/6 Installing git hooks..." -ForegroundColor Cyan
$installHooks = Join-Path $WorktreeRoot "scripts/install-git-hooks.ps1"
if (-not (Test-Path $installHooks)) {
  $installHooks = Join-Path $RootWorktree "scripts/install-git-hooks.ps1"
}
if (Test-Path $installHooks) {
  & $installHooks
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
else {
  Write-Host "   install-git-hooks.ps1 not found - skipped" -ForegroundColor DarkYellow
}

Write-Host "4/6 KM data plane bootstrap (soft)..." -ForegroundColor Cyan
$kmBootstrap = Join-Path $WorktreeRoot "scripts/km-session-bootstrap.ps1"
if (-not (Test-Path $kmBootstrap)) {
  $kmBootstrap = Join-Path $RootWorktree "scripts/km-session-bootstrap.ps1"
}
if (Test-Path $kmBootstrap) {
  & $kmBootstrap 2>&1 | Out-Host
}
else {
  Write-Host "   km-session-bootstrap.ps1 not found - skipped" -ForegroundColor DarkYellow
}

Write-Host "5/6 Agent session envelope..." -ForegroundColor Cyan
$sessionStart = Join-Path $WorktreeRoot "scripts/agent-session-start.ps1"
if (-not (Test-Path $sessionStart)) {
  $sessionStart = Join-Path $RootWorktree "scripts/agent-session-start.ps1"
}
if (Test-Path $sessionStart) {
  $branch = git -C $WorktreeRoot branch --show-current 2>$null
  $taskTitle = if ($branch -match 'feature/[^/]+/(.+)') { $Matches[1] -replace '-', ' ' } else { "worktree: $branch" }
  # -SkipBeads: beads DB often shared from main checkout; bootstrap still ran bd ready
  & $sessionStart -TaskTitle $taskTitle -SkipBeads 2>&1 | Out-Null
}
else {
  Write-Host "   agent-session-start.ps1 not found - skipped" -ForegroundColor DarkYellow
}

Write-Host "6/6 Done." -ForegroundColor Cyan
Write-Host ""
Write-Host "Worktree setup complete (essential mirror + shared-deps)." -ForegroundColor Green
Write-Host "If junctions missing: cd .worktrees/dev && yarn workspace:bootstrap" -ForegroundColor Cyan
Write-Host "Then: yarn worktree:relink-deps" -ForegroundColor Cyan
Write-Host "Source ports before dev: . .\scripts\load-worktree-ports.ps1" -ForegroundColor Cyan
Write-Host "Dev TUI: yarn agent:tui  (mprocs — install mprocs if missing)" -ForegroundColor Cyan
Write-Host "Status:  yarn agent:status" -ForegroundColor Cyan
Write-Host "Full install override (avoid unless needed): yarn workspace:bootstrap" -ForegroundColor DarkGray
