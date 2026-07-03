# Shared worktree path detection for ModMe scripts (dot-source from scripts/*.ps1).

function Get-WorktreeContext {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $gitCommonDir = (git -C $RepoRoot rev-parse --git-common-dir 2>$null).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($gitCommonDir)) {
    throw "Not a git repository: $RepoRoot"
  }

  if (-not [System.IO.Path]::IsPathRooted($gitCommonDir)) {
    $gitCommonDir = Join-Path $RepoRoot $gitCommonDir
  }

  $mainRepoRoot = (Resolve-Path (Split-Path -Parent $gitCommonDir)).Path
  $worktreesRoot = Join-Path $mainRepoRoot ".worktrees"
  $repoRootResolved = (Resolve-Path $RepoRoot).Path
  $branch = (git -C $RepoRoot branch --show-current 2>$null).Trim()

  $isWorktree = $false
  if (Test-Path $worktreesRoot) {
    $worktreesRootResolved = (Resolve-Path $worktreesRoot).Path
    $isWorktree = $repoRootResolved.StartsWith($worktreesRootResolved, [StringComparison]::OrdinalIgnoreCase)
  }

  [PSCustomObject]@{
    RepoRoot       = $repoRootResolved
    MainRepoRoot   = $mainRepoRoot
    WorktreesRoot  = $worktreesRoot
    DevCheckout    = Join-Path $worktreesRoot "dev"
    IsWorktree     = $isWorktree
    IsMainCheckout = ($repoRootResolved -eq $mainRepoRoot)
    Branch         = $branch
    # Legacy alias for scripts that still reference DevRootPath
    DevRootPath    = $worktreesRoot
    DevRootName    = ".worktrees"
  }
}
