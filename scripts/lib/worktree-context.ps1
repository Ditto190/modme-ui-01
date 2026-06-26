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

  $mainRepoRoot = Split-Path -Parent (Resolve-Path $gitCommonDir)
  $devRootName = "$(Split-Path -Leaf $mainRepoRoot)-dev"
  $devRootPath = Join-Path (Split-Path -Parent $mainRepoRoot) $devRootName
  $parentName = Split-Path -Leaf (Split-Path -Parent $RepoRoot)
  $branch = (git -C $RepoRoot branch --show-current 2>$null).Trim()

  [PSCustomObject]@{
    RepoRoot     = (Resolve-Path $RepoRoot).Path
    MainRepoRoot = $mainRepoRoot
    DevRootName  = $devRootName
    DevRootPath  = $devRootPath
    IsWorktree   = ($parentName -eq $devRootName)
    IsMainCheckout = ($parentName -ne $devRootName)
    Branch       = $branch
  }
}
