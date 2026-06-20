
# Monorepo_ModMe - Remove an agent worktree safely

param(
  [Parameter(Mandatory = $true)]
  [string]$Path,

  [switch]$Force,

  [switch]$DeleteBranch
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectMainDir = Split-Path -Parent $ScriptDir

if (!(Test-Path $Path)) {
  Write-Error "Worktree path not found: $Path"
}

$resolvedPath = (Resolve-Path $Path).Path
$resolvedNorm = $resolvedPath -replace '\\', '/'
$worktrees = git -C $ProjectMainDir worktree list --porcelain
$branch = $null
$matched = $false

for ($i = 0; $i -lt $worktrees.Count; $i++) {
  if ($worktrees[$i] -match '^worktree (.+)$') {
    $wtPath = $Matches[1] -replace '\\', '/'
    if ($wtPath -ieq $resolvedNorm) {
      $matched = $true
      for ($j = $i + 1; $j -lt $worktrees.Count; $j++) {
        if ($worktrees[$j] -match '^worktree ') { break }
        if ($worktrees[$j] -match '^branch (.+)$') {
          $branch = $Matches[1] -replace '^refs/heads/', ''
          break
        }
      }
      break
    }
  }
}

if (-not $matched) {
  Write-Error "Path is not a registered git worktree: $resolvedPath"
}

if ($resolvedPath -eq $ProjectMainDir) {
  Write-Error "Refusing to remove the main checkout."
}

Write-Host "Removing worktree:" -ForegroundColor Yellow
Write-Host "   Path:   $resolvedPath"
Write-Host "   Branch: $branch"
Write-Host ""

if (-not $Force) {
  $confirm = Read-Host "Remove this worktree? [y/N]"
  if ($confirm -notin @('y', 'Y', 'yes', 'Yes')) {
    Write-Host "Cancelled."
    exit 0
  }
}

$removeArgs = @("worktree", "remove")
if ($Force) { $removeArgs += "--force" }
$removeArgs += $resolvedPath

git -C $ProjectMainDir @removeArgs
if ($LASTEXITCODE -ne 0) {
  Write-Error "git worktree remove failed"
}

Write-Host "Worktree removed." -ForegroundColor Green

if ($DeleteBranch) {
  git -C $ProjectMainDir branch -d $branch
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Branch '$branch' could not be deleted (may have unmerged commits)." -ForegroundColor DarkYellow
    $forceBranch = Read-Host "Force-delete branch '$branch'? [y/N]"
    if ($forceBranch -in @('y', 'Y', 'yes', 'Yes')) {
      git -C $ProjectMainDir branch -D $branch
    }
  }
  else {
    Write-Host "Branch '$branch' deleted." -ForegroundColor Green
  }
}
elseif ($branch -match '^feature/') {
  Write-Host "Branch '$branch' still exists. Delete with: git branch -d $branch" -ForegroundColor Cyan
}

git -C $ProjectMainDir worktree prune
Write-Host "Done."
