# Cursor worktree bootstrap — Windows
# ROOT_WORKTREE_PATH is set by Cursor to the main checkout path.

$ErrorActionPreference = "Stop"

$WorktreeRoot = (Get-Location).Path
$RootWorktree = if ($env:ROOT_WORKTREE_PATH) { $env:ROOT_WORKTREE_PATH } else { $WorktreeRoot }

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   Monorepo_ModMe worktree setup (Windows)" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   Worktree: $WorktreeRoot"
Write-Host "   Root:     $RootWorktree"
Write-Host ""

# 1. Port allocation
Write-Host "1/8 Allocating ports..." -ForegroundColor Cyan
& "$WorktreeRoot/scripts/worktree-allocate-ports.ps1" -WorktreePath $WorktreeRoot
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 2. Corepack
Write-Host "2/8 Enabling corepack..." -ForegroundColor Cyan
corepack enable
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 3. Yarn install (GenerativeUI)
Write-Host "3/8 yarn install (GenerativeUI_monorepo)..." -ForegroundColor Cyan
Push-Location "$WorktreeRoot/GenerativeUI_monorepo"
yarn install
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

# 4. Bun install (next-forge)
Write-Host "4/8 bun install (next-forge)..." -ForegroundColor Cyan
Push-Location "$WorktreeRoot/next-forge"
npx bun install
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

# 5. Copy env files from root worktree
Write-Host "5/8 Copying .env files from root worktree..." -ForegroundColor Cyan
& "$WorktreeRoot/scripts/worktree-copy-env.ps1" -SourceRoot $RootWorktree -TargetRoot $WorktreeRoot
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 6. Poetry install
Write-Host "6/8 poetry install (agent-server)..." -ForegroundColor Cyan
Push-Location "$WorktreeRoot/GenerativeUI_monorepo/apps/agent-server"
poetry install
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

# 7. Optional lean-ctx doctor
Write-Host "7/8 lean-ctx doctor (non-fatal)..." -ForegroundColor Cyan
if (Get-Command lean-ctx -ErrorAction SilentlyContinue) {
  lean-ctx doctor
  if ($LASTEXITCODE -ne 0) {
    Write-Host "   lean-ctx doctor reported issues (continuing)" -ForegroundColor DarkYellow
  }
}
else {
  Write-Host "   lean-ctx not on PATH — skipped" -ForegroundColor DarkYellow
}

# 8. Git pre-commit hook
Write-Host "8/8 Installing git pre-commit hook..." -ForegroundColor Cyan
& "$WorktreeRoot/scripts/install-git-hooks.ps1"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Worktree setup complete." -ForegroundColor Green
Write-Host "Source ports before dev: . .worktree-ports.env" -ForegroundColor Cyan
