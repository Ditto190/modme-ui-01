# Cursor worktree bootstrap — Windows (shared-deps default)
# ROOT_WORKTREE_PATH is set by Cursor to the main checkout path.

$ErrorActionPreference = "Stop"

$WorktreeRoot = (Get-Location).Path
$SourceRoot = if ($env:ROOT_WORKTREE_PATH) { $env:ROOT_WORKTREE_PATH } else { $WorktreeRoot }

. "$WorktreeRoot/scripts/lib/worktree-bootstrap.ps1"
Invoke-WorktreeBootstrap -WorktreeRoot $WorktreeRoot -SourceRoot $SourceRoot -SharedDeps
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Ensuring lean-ctx configuration..." -ForegroundColor Cyan
Push-Location $WorktreeRoot
yarn lean-ctx:ensure 2>&1 | Out-Null
Pop-Location
<<<<<<< HEAD
=======

# 4. Bun install (next-forge)
Write-Host "4/9 bun install (next-forge)..." -ForegroundColor Cyan
Push-Location "$WorktreeRoot/next-forge"
npx bun install
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

# 5. Copy env files from root worktree
Write-Host "5/9 Copying .env files from root worktree..." -ForegroundColor Cyan
& "$WorktreeRoot/scripts/worktree-copy-env.ps1" -SourceRoot $RootWorktree -TargetRoot $WorktreeRoot
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 6. Poetry install
Write-Host "6/9 poetry install (agent-server)..." -ForegroundColor Cyan
Push-Location "$WorktreeRoot/GenerativeUI_monorepo/apps/agent-server"
poetry install
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

# 7. Optional lean-ctx doctor
Write-Host "7/9 lean-ctx doctor (non-fatal)..." -ForegroundColor Cyan
if (Get-Command lean-ctx -ErrorAction SilentlyContinue) {
  lean-ctx doctor
  if ($LASTEXITCODE -ne 0) {
    Write-Host "   lean-ctx doctor reported issues (continuing)" -ForegroundColor DarkYellow
  }
}
else {
  Write-Host "   lean-ctx not on PATH — skipped" -ForegroundColor DarkYellow
}

# 8. Git hooks + agent session
Write-Host "8/9 Installing git hooks..." -ForegroundColor Cyan
& "$WorktreeRoot/scripts/install-git-hooks.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "9/9 KM data plane + agent session envelope..." -ForegroundColor Cyan
# Soft KM bootstrap first (Dolt/Entire/Beads); session start also calls it — idempotent
& "$WorktreeRoot/scripts/km-session-bootstrap.ps1" 2>&1 | Out-Host
$branch = git -C $WorktreeRoot branch --show-current 2>$null
$taskTitle = if ($branch -match 'feature/[^/]+/(.+)') { $Matches[1] -replace '-', ' ' } else { "worktree: $branch" }
# -SkipBeads: beads DB often shared from main checkout; bootstrap still ran bd ready
& "$WorktreeRoot/scripts/agent-session-start.ps1" -TaskTitle $taskTitle -SkipBeads 2>&1 | Out-Null

Write-Host ""
Write-Host "Worktree setup complete." -ForegroundColor Green
Write-Host "Source ports before dev: . .\scripts\load-worktree-ports.ps1" -ForegroundColor Cyan
Write-Host "Dev TUI: yarn agent:tui  (mprocs — install mprocs if missing)" -ForegroundColor Cyan
Write-Host "Status:  yarn agent:status" -ForegroundColor Cyan
>>>>>>> origin/dev
