# Vibe session finish — smart-git workflow for ModMe worktrees
# Groups changes by stack, runs pre-commit checks, optional commit/push/PR to dev.
param(
  [switch]$SkipPull,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

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
$parentName = Split-Path -Leaf (Split-Path -Parent $RepoRoot)
if ($parentName -ne "$ProjectName-dev") {
  Write-Error @"
This script is for agent worktrees under ${ProjectName}-dev/.
Create one with: .\scripts\new-agent-worktree.ps1 -Name "<task>" -Owner cursor
"@
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
      Write-Warning "git pull origin dev failed — resolve conflicts before committing"
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

Write-Host ""
Write-Host "Running pre-commit checks (staged-aware)..." -ForegroundColor Cyan
if (-not $DryRun) {
  & node (Join-Path $ScriptDir "pre-commit-checks.mjs")
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$commitType = Get-SuggestedCommitType $groups
$scope = Get-SuggestedScope $groups
$defaultMsg = Read-Host "Commit subject (default: ${commitType}(${scope}): prototype update)"
if ([string]::IsNullOrWhiteSpace($defaultMsg)) {
  $defaultMsg = "${commitType}(${scope}): prototype update"
}

Write-Host ""
Write-Host "Proposed commit:" -ForegroundColor Yellow
Write-Host "  $defaultMsg"
Write-Host ""
Write-Host "Stage all modified files with pathspecs? (yes/no)" -ForegroundColor Yellow
if (-not (Confirm-Step "Stage and commit? (yes/no)")) {
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

if (Confirm-Step "Push to remote? (yes/no)") {
  git -C $RepoRoot push -u origin HEAD
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host "Pushed." -ForegroundColor Green

  if (Confirm-Step "Create PR to dev? (yes/no)") {
    $branch = git -C $RepoRoot branch --show-current
    $body = @"
## Summary
- $defaultMsg

## Monorepo scope
- $(($activeStacks -join ', '))

## Test plan
- [ ] ``yarn check:forge`` (if next-forge touched)
- [ ] ``yarn verify:forge`` before merge (if next-forge touched)
- [ ] ``yarn pre-commit:check``
- [ ] CI green on \`dev\`

## Changelog
- [Unreleased] updated if agent-visible changes
"@
    gh pr create --base dev --title $defaultMsg --body $body
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "PR created." -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Session finish complete." -ForegroundColor Green
