# Shared worktree path detection for ModMe scripts (dot-source from scripts/*.ps1).

function Resolve-PreferredWorktreesRoot {
  param(
    [Parameter(Mandatory = $true)]
    [string]$MainRepoRoot
  )

  $projectName = Split-Path -Leaf $MainRepoRoot
  foreach ($candidate in @($env:WORKTREES_ROOT, $env:MODME_WORKTREES_ROOT)) {
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
    if (-not [System.IO.Path]::IsPathRooted($candidate)) {
      return (Join-Path $MainRepoRoot $candidate)
    }
    return $candidate
  }

  if (Test-Path "D:\") {
    return (Join-Path "D:\Github_Projects\copilot-worktrees" $projectName)
  }

  return (Join-Path $MainRepoRoot ".worktrees")
}

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
  $legacyWorktreesRoot = Join-Path $mainRepoRoot ".worktrees"
  $worktreesRoot = Resolve-PreferredWorktreesRoot -MainRepoRoot $mainRepoRoot
  $repoRootResolved = (Resolve-Path $RepoRoot).Path
  $branch = (git -C $RepoRoot branch --show-current 2>$null).Trim()
  $isMainCheckout = ($repoRootResolved -eq $mainRepoRoot)

  [PSCustomObject]@{
    RepoRoot           = $repoRootResolved
    MainRepoRoot       = $mainRepoRoot
    WorktreesRoot      = $worktreesRoot
    LegacyWorktreesRoot = $legacyWorktreesRoot
    DevCheckout        = Join-Path $worktreesRoot "dev"
    IsWorktree         = (-not $isMainCheckout)
    IsMainCheckout     = $isMainCheckout
    Branch             = $branch
    # Legacy alias for scripts that still reference DevRootPath
    DevRootPath        = $worktreesRoot
    DevRootName        = Split-Path -Leaf $worktreesRoot
  }
}
