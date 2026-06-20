# Vibe session finish — smart-git workflow for ModMe worktrees
# Groups changes by stack, runs pre-commit checks, optional commit/push/PR to dev.
param(
  [switch]$SkipPull,
  [switch]$DryRun,
  [switch]$Yes,
  [switch]$Push,
  [switch]$CreatePr,
  [string]$CommitMessage = ''
)

$ErrorActionPreference = "Stop"

if ($args -contains '-Help' -or $args -contains '--help' -or $args -contains '-h') {
  @"
vibe-session-finish — session end in a worktree (not main checkout)

Options:
  -DryRun          Preview only; no git mutations or prompts
  -SkipPull        Skip git pull origin dev
  -Yes             Non-interactive (skip Read-Host); use with -CommitMessage for agents
  -CommitMessage   Commit subject (conventional commits)
  -Push            Push after commit (-Yes skips confirmation)
  -CreatePr        gh pr create --base dev after push (-Yes skips confirmation; needs gh auth or GH_TOKEN)

Examples:
  .\scripts\vibe-session-finish.ps1 -DryRun -SkipPull
  .\scripts\vibe-session-finish.ps1 -Yes -CommitMessage "feat(next-forge): add catalogue route" -Push -CreatePr
  yarn vibe:finish:dry-run
"@
  exit 0
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir
$ProjectName = Split-Path -Leaf $RepoRoot

function Write-Group([string]$Title, [string[]]$Files) {
  if ($Files.Count -eq 0) { return }
  Write-Host ""
  Write-Host "  $Title" -ForegroundColor Cyan
  foreach ($f in $Files) {
    Write-Host "    - $f"
  }
}

function Confirm-Step([string]$Prompt) {
  if ($DryRun) {
    Write-Host "[dry-run] would prompt: $Prompt" -ForegroundColor DarkYellow
    return $false
  }
  if ($Yes) {
    return $true
  }
  $answer = Read-Host $Prompt
  return $answer -match '^(y|yes)$'
}

function Get-ChangeGroups {
  $all = git -C $RepoRoot diff --name-only
  $staged = git -C $RepoRoot diff --cached --name-only
  $unstaged = git -C $RepoRoot diff --name-only --diff-filter=ACMRTUXB

  $groups = [ordered]@{
    "next-forge" = @()
    "GenerativeUI" = @()
    "root-orchestration" = @()
    "other" = @()
  }

  foreach ($f in ($all + $staged + $unstaged | Select-Object -Unique)) {
    if ([string]::IsNullOrWhiteSpace($f)) { continue }
    if ($f.StartsWith("next-forge/")) {
      $groups["next-forge"] += $f
    }
    elseif ($f.StartsWith("GenerativeUI_monorepo/")) {
      $groups["GenerativeUI"] += $f
    }
    elseif ($f -match '^(scripts/|docs/|\.cursor/|\.agents/|\.github/|package\.json|CHANGELOG\.md)') {
      $groups["root-orchestration"] += $f
    }
    else {
      $groups["other"] += $f
    }
  }

  return $groups
}

function Get-SuggestedCommitType([hashtable]$Groups) {
  $diff = git -C $RepoRoot diff --stat 2>$null
  if ($diff -match 'fix|bug|error') { return "fix" }
  if ($Groups["next-forge"].Count -gt 0 -or $Groups["GenerativeUI"].Count -gt 0) { return "feat" }
  return "chore"
}

function Get-SuggestedScope([hashtable]$Groups) {
  $scopes = @()
  if ($Groups["next-forge"].Count -gt 0) { $scopes += "next-forge" }
  if ($Groups["GenerativeUI"].Count -gt 0) { $scopes += "generative-ui" }
  if ($Groups["root-orchestration"].Count -gt 0) { $scopes += "repo" }
  if ($scopes.Count -eq 0) { return "repo" }
  if ($scopes.Count -eq 1) { return $scopes[0] }
  return ($scopes -join "+")
}

# Guard: refuse main checkout for feature work
$gitCommonDir = (git -C $RepoRoot rev-parse --git-common-dir).Trim()
if (-not [System.IO.Path]::IsPathRooted($gitCommonDir)) {
  $gitCommonDir = Join-Path $RepoRoot $gitCommonDir
}
$MainRepoRoot = Split-Path -Parent (Resolve-Path $gitCommonDir)
$DevRootName = "$(Split-Path -Leaf $MainRepoRoot)-dev"
$DevRootPath = Join-Path (Split-Path -Parent $MainRepoRoot) $DevRootName
$parentName = Split-Path -Leaf (Split-Path -Parent $RepoRoot)
if ($parentName -ne $DevRootName) {
  $worktreeHint = ""
  if (Test-Path $DevRootPath) {
    $existing = Get-ChildItem $DevRootPath -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -like "dev-agent-*" -or $_.Name -like "dev-human-*" } |
      Select-Object -ExpandProperty FullName -First 3
    if ($existing.Count -gt 0) {
      $worktreeHint = "`nExisting worktrees (open one in Cursor, then run finish there):`n"
      foreach ($wt in $existing) {
        $worktreeHint += "  cd `"$wt`"`n  .\scripts\vibe-session-finish.ps1`n"
      }
    }
  }

  Write-Host @"
vibe:finish only runs inside a worktree under $DevRootPath
(you are in the main checkout: $RepoRoot)

Option A — use an existing worktree:
$worktreeHint
Option B — move uncommitted work from main:
  .\scripts\migrate-main-to-worktree.ps1 -Name "<task>" -Owner cursor -FromCurrentBranch

Option C — new empty worktree:
  .\scripts\new-agent-worktree.ps1 -Name "<task>" -Owner cursor

Dry-run (from a worktree folder):
  .\scripts\vibe-session-finish.ps1 -DryRun -SkipPull
"@ -ForegroundColor Yellow
  exit 1
}

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   VIBE SESSION FINISH" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   Repo:   $RepoRoot"
Write-Host "   Branch: $(git -C $RepoRoot branch --show-current)"
Write-Host ""

if (-not $SkipPull) {
  Write-Host "Syncing with origin/dev..." -ForegroundColor Cyan
  if (-not $DryRun) {
    git -C $RepoRoot pull origin dev
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "git pull origin dev failed - resolve conflicts before committing"
    }
  }
}

Write-Host "Change groups:" -ForegroundColor Cyan
$groups = Get-ChangeGroups
Write-Group "next-forge" $groups["next-forge"]
Write-Group "GenerativeUI_monorepo" $groups["GenerativeUI"]
Write-Group "root / orchestration" $groups["root-orchestration"]
Write-Group "other" $groups["other"]

$activeStacks = @($groups.Keys | Where-Object { $groups[$_].Count -gt 0 })
if ($groups["next-forge"].Count -gt 0 -and $groups["GenerativeUI"].Count -gt 0) {
  Write-Host ""
  Write-Warning "Changes span next-forge AND GenerativeUI. Consider split-to-prs before one commit."
}

$status = git -C $RepoRoot status --short
if ([string]::IsNullOrWhiteSpace($status)) {
  Write-Host ""
  Write-Host "No changes to commit." -ForegroundColor Green
  exit 0
}

Write-Host ""
Write-Host "git status --short:" -ForegroundColor DarkGray
Write-Host $status

$inboxPrefix = "GenerativeUI_monorepo/docs/inbox/"
$allChanged = @(
  $groups["GenerativeUI"] +
  $groups["root-orchestration"] +
  $groups["other"] | Select-Object -Unique
)
$inboxChanged = @(
  $allChanged | Where-Object {
    $_ -like "${inboxPrefix}*" -and
    $_ -notlike "*README.md" -and
    $_ -notlike "*_index.json"
  }
)

if ($inboxChanged.Count -gt 0) {
  Write-Host ""
  Write-Host "Inbox files changed ($($inboxChanged.Count)):" -ForegroundColor Yellow
  foreach ($f in $inboxChanged) {
    Write-Host "    - $f"
  }
  if ($DryRun) {
    Write-Host "[dry-run] would prompt: Run inbox intake before commit? (yes/no) [default: yes]" -ForegroundColor DarkYellow
  }
  else {
    $intakeAnswer = Read-Host "Run inbox intake before commit? (yes/no) [default: yes]"
    if ($intakeAnswer -match '^(y|yes|)$') {
      Write-Host "Running inbox intake (session mode)..." -ForegroundColor Cyan
      & node (Join-Path $ScriptDir "intake-orchestrator.mjs") --mode=session --trigger=session
      if ($LASTEXITCODE -ne 0) {
        Write-Warning "Inbox intake failed (exit $LASTEXITCODE)."
        if (-not (Confirm-Step "Continue without intake? (yes/no)")) {
          exit $LASTEXITCODE
        }
      }
    }
  }
}

Write-Host ""
if ($DryRun) {
  Write-Host "[dry-run] would run pre-commit checks (staged-aware)" -ForegroundColor DarkYellow
}
else {
  Write-Host "Running pre-commit checks (staged-aware)..." -ForegroundColor Cyan
  & node (Join-Path $ScriptDir "pre-commit-checks.mjs")
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$commitType = Get-SuggestedCommitType $groups
$scope = Get-SuggestedScope $groups
$suggestedDefault = "${commitType}(${scope}): prototype update"
if ($DryRun) {
  $defaultMsg = if ($CommitMessage) { $CommitMessage } else { $suggestedDefault }
  Write-Host "[dry-run] commit subject (default: $defaultMsg)" -ForegroundColor DarkYellow
}
elseif ($Yes -and $CommitMessage) {
  $defaultMsg = $CommitMessage
}
elseif ($Yes) {
  $defaultMsg = $suggestedDefault
  Write-Host "Using commit message: $defaultMsg" -ForegroundColor Cyan
}
else {
  $defaultMsg = Read-Host "Commit subject (default: $suggestedDefault)"
  if ([string]::IsNullOrWhiteSpace($defaultMsg)) {
    $defaultMsg = $suggestedDefault
  }
}

Write-Host ""
Write-Host "Proposed commit:" -ForegroundColor Yellow
Write-Host "  $defaultMsg"
Write-Host ""
Write-Host "Stage all modified files with pathspecs? (yes/no)" -ForegroundColor Yellow
$shouldCommit = $Yes -or (Confirm-Step "Stage and commit? (yes/no)")
if (-not $shouldCommit) {
  Write-Host "Aborted before commit." -ForegroundColor DarkYellow
  exit 0
}

if ($DryRun) {
  Write-Host "[dry-run] would commit: $defaultMsg" -ForegroundColor DarkYellow
  exit 0
}

$filesToStage = git -C $RepoRoot diff --name-only --diff-filter=ACMRTUXB
$deleted = git -C $RepoRoot diff --name-only --diff-filter=D
$allFiles = @($filesToStage + $deleted | Select-Object -Unique | Where-Object { $_ })

if ($allFiles.Count -eq 0) {
  Write-Warning "No files to stage."
  exit 1
}

git -C $RepoRoot add -- @allFiles
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& node (Join-Path $ScriptDir "pre-commit-checks.mjs")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

git -C $RepoRoot commit -m $defaultMsg
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Committed." -ForegroundColor Green

$shouldPush = $Push
if (-not $shouldPush -and -not $Yes) {
  $shouldPush = Confirm-Step "Push to remote? (yes/no)"
}
if ($shouldPush) {
  git -C $RepoRoot push -u origin HEAD
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host "Pushed." -ForegroundColor Green

  $shouldPr = $CreatePr
  if (-not $shouldPr -and -not $Yes) {
    $shouldPr = Confirm-Step "Create PR to dev? (yes/no)"
  }
  if ($shouldPr) {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
      Write-Error "gh CLI not found. Install GitHub CLI or set GH_TOKEN and install gh."
    }
    if (-not $env:GH_TOKEN -and -not $env:GITHUB_TOKEN) {
      $ghAuth = gh auth status 2>&1
      if ($LASTEXITCODE -ne 0) {
        Write-Error "gh not authenticated. Run: gh auth refresh -h github.com  Or set GH_TOKEN for headless agents."
      }
    }
    $branch = git -C $RepoRoot branch --show-current
    $scope = ($activeStacks -join ', ')
    $body = @(
      "## Summary",
      "- $defaultMsg",
      "",
      "## Monorepo scope",
      "- $scope",
      "",
      "## Test plan",
      '- [ ] `yarn check:forge` (if next-forge touched)',
      '- [ ] `yarn verify:forge` before merge (if next-forge touched)',
      '- [ ] `yarn pre-commit:check`',
      '- [ ] CI green on dev',
      "",
      "## Changelog",
      '- [Unreleased] updated if agent-visible changes'
    ) -join "`n"
    $prUrl = gh pr create --base dev --title $defaultMsg --body $body 2>&1
    if ($LASTEXITCODE -ne 0) {
      Write-Error $prUrl
    }
    Write-Host "PR created: $prUrl" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Session finish complete." -ForegroundColor Green
