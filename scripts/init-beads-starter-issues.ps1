# Idempotent beads setup for Monorepo_ModMe (run from repo root only).
# Usage: powershell -ExecutionPolicy Bypass -File ./scripts/init-beads-starter-issues.ps1

param(
  [string]$Prefix = "modme",
  [string]$UpstreamUrl = "https://github.com/Ditto190/modme-ui-01.git",
  [string]$DoltRemoteUrl = "git+https://github.com/Ditto190/modme-ui-01.git"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path

Set-Location $RepoRoot

if (-not (Test-Path (Join-Path $RepoRoot ".git"))) {
  Write-Error "Not a git repo: $RepoRoot. Run this from Monorepo_ModMe root (not .beads/ or next-forge/)."
}

function Invoke-Bd {
  param([string[]]$Command)
  & npx --yes @beads/bd @Command
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "[beads] Repo root: $RepoRoot" -ForegroundColor Cyan

# Git remotes - canonical upstream is modme-ui-01 (same as origin for this monorepo)
$remotes = @(git remote)
if ($remotes -notcontains "origin") {
  Write-Host "[beads] Adding git remote origin -> $UpstreamUrl" -ForegroundColor Yellow
  git remote add origin $UpstreamUrl
}
if ($remotes -notcontains "upstream") {
  $originUrl = (git remote get-url origin 2>$null)
  $upstreamTarget = if ($originUrl -and $originUrl -match "modme-ui-01") { $originUrl } else { $UpstreamUrl }
  Write-Host "[beads] Adding git remote upstream -> $upstreamTarget" -ForegroundColor Yellow
  git remote add upstream $upstreamTarget
}

# Beads init (skip if metadata already present)
$metadataPath = Join-Path $RepoRoot ".beads/metadata.json"
if (-not (Test-Path $metadataPath)) {
  Write-Host "[beads] Running bd init --prefix $Prefix" -ForegroundColor Cyan
  Invoke-Bd -Command @("init", "--prefix", $Prefix, "--non-interactive", "--skip-agents")
} else {
  Write-Host "[beads] Already initialized (.beads/metadata.json exists)" -ForegroundColor Green
}

# Sync config (bd 1.0.x requires federation.remote for Dolt sync)
Invoke-Bd -Command @("config", "set", "federation.remote", $DoltRemoteUrl)
Invoke-Bd -Command @("config", "set", "github.org", "Ditto190")
Invoke-Bd -Command @("config", "set", "github.repo", "modme-ui-01")

$doltRemotes = ""
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
  $doltRemotes = (& npx --yes @beads/bd dolt remote list 2>&1 | Out-String)
  $validate = (& npx --yes @beads/bd config validate 2>&1 | Out-String)
  $listOut = (& npx --yes @beads/bd list --all 2>&1 | Out-String)
} finally {
  $ErrorActionPreference = $prevEap
}

if ($doltRemotes -notmatch "origin") {
  Write-Host "[beads] Adding Dolt remote origin" -ForegroundColor Cyan
  Invoke-Bd -Command @("dolt", "remote", "add", "origin", $DoltRemoteUrl)
}

if ($validate -notmatch "valid") {
  Write-Warning "[beads] config validate: $validate"
} else {
  Write-Host "[beads] Sync config valid" -ForegroundColor Green
}

if ($listOut -match "No issues found") {
  Write-Host "[beads] Seeding starter issues..." -ForegroundColor Cyan
  $starters = @(
    "chore: Verify compound Full Stack: Forge Core + Agent Server",
    "chore: CI Phase A - confirm pre-commit vs ci.yml split",
    "task: Migration Phase 4 - feature-flag cutover for generative-ui",
    "chore: Document yarn verify:forge + yarn verify:generative in onboarding",
    "task: Complete Storybook workshop parity with GenerativeCanvas",
    "task: Agent terminal orchestration - mprocs TUI + session envelopes",
    "chore: E2E worktree-smoke CI job + local smoke checklist",
    "chore: BUGBOT template pack + labeler modernization",
    "chore: devops-autofix lane - polis router + backlog-health",
    "chore: GitLab issue templates + Duo devops-autofix job"
  )
  foreach ($title in $starters) {
    Invoke-Bd -Command @("create", $title, "--priority", "2")
  }
} else {
  Write-Host "[beads] Issues already exist - skipping seed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done. Next:" -ForegroundColor Green
Write-Host "  yarn beads:ready"
Write-Host "  yarn beads:push    # after closing/updating issues"
Write-Host "  npx @beads/bd show <id>"
