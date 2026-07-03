# Fail fast when feature work runs from the main checkout instead of .worktrees/.
param(
  [switch]$WarnOnly
)

$ErrorActionPreference = "Stop"

if ($args -contains '-Help' -or $args -contains '--help' -or $args -contains '-h') {
  @"
ensure-worktree — fail (or warn) when cwd is the main checkout

Options:
  -WarnOnly   Print warning and exit 0 instead of failing

Examples:
  yarn worktree:ensure
  .\scripts\ensure-worktree.ps1 -WarnOnly
"@
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir

. (Join-Path $ScriptDir "lib/worktree-context.ps1")
$ctx = Get-WorktreeContext -RepoRoot $RepoRoot

function Write-WorktreeHint {
  Write-Host ""
  Write-Host "Feature work belongs in a worktree under .worktrees/" -ForegroundColor Yellow
  Write-Host "  .\scripts\init-worktrees.ps1                    # persistent dev checkout" -ForegroundColor Gray
  Write-Host "  .\scripts\new-agent-worktree.ps1 -Name `"<task>`" -Owner cursor" -ForegroundColor Gray
  Write-Host "  .\scripts\migrate-main-to-worktree.ps1 -Name `"<task>`" -Owner cursor" -ForegroundColor Gray
  Write-Host "See docs/multi-agent-worktrees.md" -ForegroundColor Gray
}

if ($ctx.IsWorktree) {
  Write-Host "OK: worktree checkout ($($ctx.RepoRoot))" -ForegroundColor Green
  exit 0
}

$message = "Main checkout detected ($($ctx.RepoRoot)). Use a worktree under .worktrees/ for feature work."

if ($WarnOnly) {
  Write-Warning $message
  Write-WorktreeHint
  exit 0
}

Write-Error $message
Write-WorktreeHint
