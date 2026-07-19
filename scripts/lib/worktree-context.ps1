# Shared worktree path detection for ModMe scripts (dot-source from scripts/*.ps1).
#
# Agent worktrees root resolution (new agent checkouts):
#   1. -WorktreesRoot param (when callers pass it through)
#   2. $env:WORKTREES_ROOT
#   3. legacy Join-Path $MainRepoRoot ".worktrees"
#
# Golden shared-deps image stays at <main>/.worktrees/dev (may remain on C:).
# Canonical agent root (User env): D:\Github_Projects\worktrees\Monorepo_ModMe

$script:ModMeCanonicalWorktreesRoot = 'D:\Github_Projects\worktrees\Monorepo_ModMe'
# Soft guidance - Cursor MaxCount may be higher; avoid multi-GB duplication
$script:ModMeRecommendedMaxAgentWorktrees = 8
$script:ModMeMinFreeSpaceGB = 20

function Test-ModMeIsWindows {
  if ($null -ne (Get-Variable -Name IsWindows -ErrorAction SilentlyContinue)) {
    return [bool]$IsWindows
  }
  return ($env:OS -eq 'Windows_NT')
}

function Get-ModMeDriveFreeSpaceGB {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  try {
    $full = [System.IO.Path]::GetFullPath($Path)
    $root = [System.IO.Path]::GetPathRoot($full)
    if ([string]::IsNullOrWhiteSpace($root)) { return $null }
    $driveLetter = $root.TrimEnd('\', '/').TrimEnd(':')
    if ([string]::IsNullOrWhiteSpace($driveLetter)) { return $null }
    $drive = Get-PSDrive -Name $driveLetter -ErrorAction SilentlyContinue
    if (-not $drive) { return $null }
    return [math]::Round([double]$drive.Free / 1GB, 2)
  }
  catch {
    return $null
  }
}

function Write-ModMeWorktreeResourceWarnings {
  param(
    [Parameter(Mandatory = $true)]
    [string]$AgentWorktreesRoot,

    [Parameter(Mandatory = $false)]
    [double]$MinFreeGB = $script:ModMeMinFreeSpaceGB,

    [Parameter(Mandatory = $false)]
    [int]$RecommendedMax = $script:ModMeRecommendedMaxAgentWorktrees
  )

  $canonical = $script:ModMeCanonicalWorktreesRoot
  $resolved = [System.IO.Path]::GetFullPath($AgentWorktreesRoot)
  if ($resolved -match '(?i)[\\/]\.copilot[\\/]') {
    Write-Host "   WARN: Agent root resolves under .copilot ($resolved)." -ForegroundColor Yellow
    Write-Host "         Prefer User WORKTREES_ROOT=$canonical (restart IDE if process env drifted)." -ForegroundColor Yellow
  }
  elseif (-not $resolved.Equals([System.IO.Path]::GetFullPath($canonical), [StringComparison]::OrdinalIgnoreCase)) {
    Write-Host "   NOTE: Agent root is $resolved (canonical: $canonical)" -ForegroundColor DarkYellow
  }

  $freeGb = Get-ModMeDriveFreeSpaceGB -Path $resolved
  if ($null -ne $freeGb -and $freeGb -lt $MinFreeGB) {
    Write-Host "   WARN: Only ${freeGb} GB free on drive for $resolved (threshold ${MinFreeGB} GB)." -ForegroundColor Yellow
    Write-Host "         Prefer shared-deps junctions; avoid full yarn/bun/poetry per agent." -ForegroundColor Yellow
  }
  elseif ($null -ne $freeGb) {
    Write-Host "   Disk free: ${freeGb} GB on worktrees drive (min ${MinFreeGB} GB)" -ForegroundColor DarkGray
  }

  if (Test-Path -LiteralPath $resolved) {
    $agentDirs = @(Get-ChildItem -LiteralPath $resolved -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '^(dev-agent-|dev-human-)' })
    $count = $agentDirs.Count
    if ($count -ge $RecommendedMax) {
      Write-Host "   WARN: $count agent worktrees under root (recommended max ~$RecommendedMax)." -ForegroundColor Yellow
      Write-Host "         Remove finished trees: .\scripts\remove-agent-worktree.ps1" -ForegroundColor Yellow
    }
  }
}

function Resolve-AgentWorktreesRoot {
  param(
    [Parameter(Mandatory = $true)]
    [string]$MainRepoRoot,

    [Parameter(Mandatory = $false)]
    [string]$WorktreesRoot
  )

  if (-not [string]::IsNullOrWhiteSpace($WorktreesRoot)) {
    return [System.IO.Path]::GetFullPath($WorktreesRoot.Trim())
  }
  if (-not [string]::IsNullOrWhiteSpace($env:WORKTREES_ROOT)) {
    return [System.IO.Path]::GetFullPath($env:WORKTREES_ROOT.Trim())
  }
  return [System.IO.Path]::GetFullPath((Join-Path $MainRepoRoot '.worktrees'))
}

function Get-GoldenDevCheckout {
  param(
    [Parameter(Mandatory = $true)]
    [string]$MainRepoRoot
  )

  return Join-Path $MainRepoRoot '.worktrees\dev'
}

function Test-PathUnderRoot {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ChildPath,

    [Parameter(Mandatory = $true)]
    [string]$RootPath
  )

  if ([string]::IsNullOrWhiteSpace($RootPath) -or -not (Test-Path -LiteralPath $RootPath)) {
    return $false
  }

  $rootResolved = (Resolve-Path -LiteralPath $RootPath).Path.TrimEnd('\', '/')
  $childResolved = $ChildPath.TrimEnd('\', '/')
  if ($childResolved.Equals($rootResolved, [StringComparison]::OrdinalIgnoreCase)) {
    return $true
  }

  $prefix = $rootResolved + [System.IO.Path]::DirectorySeparatorChar
  $altPrefix = $rootResolved + [System.IO.Path]::AltDirectorySeparatorChar
  return $childResolved.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase) -or
    $childResolved.StartsWith($altPrefix, [StringComparison]::OrdinalIgnoreCase)
}

function Get-WorktreeContext {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [Parameter(Mandatory = $false)]
    [string]$WorktreesRoot
  )

  $gitCommonDir = (git -C $RepoRoot rev-parse --git-common-dir 2>$null).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($gitCommonDir)) {
    throw "Not a git repository: $RepoRoot"
  }

  if (-not [System.IO.Path]::IsPathRooted($gitCommonDir)) {
    $gitCommonDir = Join-Path $RepoRoot $gitCommonDir
  }

  $mainRepoRoot = (Resolve-Path (Split-Path -Parent $gitCommonDir)).Path
  $legacyWorktreesRoot = Join-Path $mainRepoRoot '.worktrees'
  $agentWorktreesRoot = Resolve-AgentWorktreesRoot -MainRepoRoot $mainRepoRoot -WorktreesRoot $WorktreesRoot
  $devCheckout = Get-GoldenDevCheckout -MainRepoRoot $mainRepoRoot
  $repoRootResolved = (Resolve-Path $RepoRoot).Path
  $branch = (git -C $RepoRoot branch --show-current 2>$null).Trim()

  $isMainCheckout = $repoRootResolved.Equals($mainRepoRoot, [StringComparison]::OrdinalIgnoreCase)
  # Any linked git worktree (legacy .worktrees or external WORKTREES_ROOT) shares git-common-dir
  # with main but has a different toplevel path.
  $isWorktree = -not $isMainCheckout

  [PSCustomObject]@{
    RepoRoot             = $repoRootResolved
    MainRepoRoot         = $mainRepoRoot
    WorktreesRoot        = $agentWorktreesRoot
    LegacyWorktreesRoot  = $legacyWorktreesRoot
    DevCheckout          = $devCheckout
    IsWorktree           = $isWorktree
    IsMainCheckout       = $isMainCheckout
    Branch               = $branch
    # Legacy alias for scripts that still reference DevRootPath (agent worktrees root)
    DevRootPath          = $agentWorktreesRoot
    DevRootName          = '.worktrees'
  }
}
