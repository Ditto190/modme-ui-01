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
