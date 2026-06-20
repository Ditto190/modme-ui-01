# Move uncommitted work from the main checkout into a new agent worktree.

param(
  [Parameter(Mandatory = $true)]
  [string]$Name,

  [Parameter(Mandatory = $false)]
  [ValidateSet("cursor", "copilot", "claude", "antigravity", "human")]
  [string]$Owner = "cursor",

  [switch]$FromCurrentBranch,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if ($args -contains '-Help' -or $args -contains '--help' -or $args -contains '-h') {
  @"
migrate-main-to-worktree — stash main-checkout WIP into a new agent worktree

Options:
  -Name <task>           Task slug (required)
  -Owner cursor|copilot|claude|antigravity|human
  -FromCurrentBranch     Branch worktree from current HEAD (fewer stash conflicts)
  -DryRun                Preview only

Examples:
  .\scripts\migrate-main-to-worktree.ps1 -Name "auth-fix" -Owner cursor
  .\scripts\migrate-main-to-worktree.ps1 -Name "auth-fix" -FromCurrentBranch -DryRun
  yarn worktree:migrate -- -Name "auth-fix" -Owner cursor
"@
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
$ProjectName = Split-Path -Leaf $RepoRoot
$ParentName = Split-Path -Leaf (Split-Path -Parent $RepoRoot)
$ExpectedDevRoot = "${ProjectName}-dev"

if ($ParentName -eq $ExpectedDevRoot) {
  Write-Error "Already in a worktree ($RepoRoot). Run from the main Monorepo_ModMe checkout."
}

$status = git -C $RepoRoot status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
  Write-Error "No uncommitted changes on main checkout. Use new-agent-worktree.ps1 instead."
}

$Name = $Name.Trim().ToLower() -replace '\s+', '-'
$BranchName = "feature/$Owner/$Name"
$FolderName = if ($Owner -eq "human") { "dev-human-$Name" } else { "dev-agent-$Owner-$Name" }
$DevWorktreeRoot = Join-Path (Split-Path -Parent $RepoRoot) $ExpectedDevRoot
$TargetPath = Join-Path $DevWorktreeRoot $FolderName
$CurrentBranch = git -C $RepoRoot branch --show-current
$stashMessage = "migrate-main-to-worktree-$Owner-$Name-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

if (-not $FromCurrentBranch -and $CurrentBranch -ne "dev") {
  Write-Host "Tip: main is on '$CurrentBranch' (not dev). Use -FromCurrentBranch for fewer stash conflicts." -ForegroundColor DarkYellow
}

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   MIGRATE MAIN TO WORKTREE" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   Main:       $RepoRoot"
Write-Host "   Branch:     $CurrentBranch"
Write-Host "   Target:     $TargetPath"
Write-Host "   New branch: $BranchName"
Write-Host "   From HEAD:  $FromCurrentBranch"
Write-Host ""

if (Test-Path $TargetPath) {
  Write-Error "Worktree path already exists: $TargetPath. Pick a different -Name or remove the existing worktree."
}

function New-MigrateWorktree {
  if ($FromCurrentBranch) {
    if (!(Test-Path $DevWorktreeRoot)) {
      Write-Error "Dev worktree root not found at $DevWorktreeRoot. Run init-worktrees.ps1 first."
    }
    $branchExists = $false
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    git -C $RepoRoot show-ref --verify --quiet "refs/heads/$BranchName" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $branchExists = $true }
    $ErrorActionPreference = $prevEap

    if ($branchExists) {
      git -C $RepoRoot worktree add $TargetPath $BranchName
    }
    else {
      git -C $RepoRoot worktree add -b $BranchName $TargetPath HEAD
    }
    if ($LASTEXITCODE -ne 0) {
      throw "git worktree add failed for $TargetPath"
    }

    & "$ScriptDir/worktree-allocate-ports.ps1" -WorktreePath $TargetPath
    if ($LASTEXITCODE -ne 0) { throw "worktree-allocate-ports failed" }

    & "$ScriptDir/worktree-copy-env.ps1" -SourceRoot $RepoRoot -TargetRoot $TargetPath
    if ($LASTEXITCODE -ne 0) { throw "worktree-copy-env failed" }

    & "$ScriptDir/install-git-hooks.ps1"
    if ($LASTEXITCODE -ne 0) { throw "install-git-hooks failed" }
  }
  else {
    & "$ScriptDir/new-agent-worktree.ps1" -Name $Name -Owner $Owner
    if ($LASTEXITCODE -ne 0) {
      throw "new-agent-worktree.ps1 failed (exit $LASTEXITCODE)"
    }
  }
}

if ($DryRun) {
  Write-Host "[dry-run] would stash (including untracked): $stashMessage" -ForegroundColor DarkYellow
  if ($FromCurrentBranch) {
    Write-Host "[dry-run] would git worktree add -b $BranchName $TargetPath HEAD" -ForegroundColor DarkYellow
  }
  else {
    Write-Host "[dry-run] would run new-agent-worktree.ps1 -Name $Name -Owner $Owner" -ForegroundColor DarkYellow
  }
  Write-Host "[dry-run] would git stash pop in $TargetPath" -ForegroundColor DarkYellow
  Write-Host "[dry-run] next: cd $TargetPath; yarn vibe:finish" -ForegroundColor DarkYellow
  exit 0
}

Write-Host "Stashing uncommitted changes..." -ForegroundColor Cyan
git -C $RepoRoot stash push -u -m $stashMessage
if ($LASTEXITCODE -ne 0) {
  Write-Error "git stash push failed"
}

try {
  Write-Host "Creating agent worktree..." -ForegroundColor Cyan
  New-MigrateWorktree

  Write-Host "Restoring stash in worktree..." -ForegroundColor Cyan
  git -C $TargetPath stash pop
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "stash pop reported conflicts or partial apply. Resolve under $TargetPath, then drop stash on main when done."
    Write-Warning "Stash list: git -C `"$RepoRoot`" stash list"
    exit $LASTEXITCODE
  }

  Write-Host ""
  Write-Host "Migration complete." -ForegroundColor Green
  Write-Host "   Open:   $TargetPath"
  Write-Host "   Branch: $BranchName"
  Write-Host ""
  Write-Host "Next steps:" -ForegroundColor Cyan
  Write-Host "   cd `"$TargetPath`""
  Write-Host "   yarn check:forge          # if next-forge changed"
  Write-Host "   yarn vibe:finish          # commit -> push -> PR to dev"
}
catch {
  Write-Warning "Migration failed - restoring stash on main checkout..."
  git -C $RepoRoot stash pop 2>$null | Out-Null
  throw
}
