# Fail fast when feature work runs from the main checkout instead of Monorepo_ModMe-dev.
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

$gitCommonDir = (git -C $RepoRoot rev-parse --git-common-dir).Trim()
if (-not [System.IO.Path]::IsPathRooted($gitCommonDir)) {
  $gitCommonDir = Join-Path $RepoRoot $gitCommonDir
}
$MainRepoRoot = Split-Path -Parent (Resolve-Path $gitCommonDir)
$DevRootName = "$(Split-Path -Leaf $MainRepoRoot)-dev"
$ParentName = Split-Path -Leaf (Split-Path -Parent $RepoRoot)

function Write-WorktreeHint {
  Write-Host ""
  Write-Host "Feature work belongs in an agent worktree under ../$DevRootName/" -ForegroundColor Yellow
  Write-Host "  .\scripts\new-agent-worktree.ps1 -Name `"<task>`" -Owner cursor" -ForegroundColor Gray
  Write-Host "  .\scripts\migrate-main-to-worktree.ps1 -Name `"<task>`" -Owner cursor  # if main has uncommitted changes" -ForegroundColor Gray
  Write-Host "See docs/multi-agent-worktrees.md" -ForegroundColor Gray
}

if ($ParentName -eq $DevRootName) {
  Write-Host "OK: worktree checkout ($RepoRoot)" -ForegroundColor Green
  exit 0
}

$message = "Main checkout detected ($RepoRoot). Use a worktree under ../$DevRootName/ for feature work."

if ($WarnOnly) {
  Write-Warning $message
  Write-WorktreeHint
  exit 0
}

Write-Error $message
Write-WorktreeHint
