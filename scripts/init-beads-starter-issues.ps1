# Initialize beads (modme prefix) and seed starter issues from docs/beads-workflow.md
# Uses npx @beads/bd — no global install required.
# Pair with .agents/skills/cicd-automation-workflow-automate/SKILL.md (Phase E).

param(
  [string]$Prefix = "modme",
  [switch]$SkipIssues
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RepoRoot = Split-Path -Parent $ScriptDir

Push-Location $RepoRoot
try {
  $bd = "npx"
  $bdArgs = @("--yes", "@beads/bd")

  $beadsDir = Join-Path $RepoRoot ".beads"
  if (-not (Test-Path $beadsDir)) {
    Write-Host "Initializing beads (prefix: $Prefix)..." -ForegroundColor Cyan
    & $bd @bdArgs init --prefix $Prefix --non-interactive --skip-agents
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  else {
    Write-Host "Beads already initialized at .beads/" -ForegroundColor Yellow
  }

  if ($SkipIssues) {
    Write-Host "Skipping starter issue creation (--SkipIssues)." -ForegroundColor Yellow
    exit 0
  }

  $statsJson = & $bd @bdArgs stats --json 2>$null
  if ($LASTEXITCODE -eq 0 -and $statsJson) {
    $stats = $statsJson | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($stats -and $stats.total -gt 0) {
      Write-Host "Starter issues already exist ($($stats.total) total). Skipping seed." -ForegroundColor Yellow
      exit 0
    }
  }

  Write-Host "Creating starter issues..." -ForegroundColor Cyan

  $issues = @(
    @{ Title = "chore: Verify compound Full Stack: Forge Core + Agent Server"; Type = "chore" },
    @{ Title = "chore: CI Phase A - confirm pre-commit vs ci.yml split"; Type = "chore" },
    @{ Title = "task: Migration Phase 4 - feature-flag cutover for generative-ui"; Type = "task" },
    @{ Title = "chore: Document yarn verify:forge + yarn verify:generative in onboarding"; Type = "chore" },
    @{ Title = "task: Complete Storybook workshop parity with GenerativeCanvas"; Type = "task" }
  )

  foreach ($issue in $issues) {
    & $bd @bdArgs create $issue.Title -t $issue.Type --silent
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "  + $($issue.Title)" -ForegroundColor Green
  }

  Write-Host "Beads ready. Run: npx @beads/bd ready" -ForegroundColor Green
}
finally {
  Pop-Location
}
