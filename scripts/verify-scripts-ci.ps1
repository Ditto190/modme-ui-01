# CI-parity verification for root scripts/ (orchestration vitest + Python CLIs)
param(
  [switch]$SkipVitest,
  [switch]$SkipPython,
  [switch]$SkipShell,
  [switch]$SkipTrunk
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir

Write-Host "== Scripts CI parity verify ==" -ForegroundColor Cyan
Push-Location $RepoRoot
try {
  if (-not $SkipVitest) {
    Write-Host "1/4 yarn test:orchestration..." -ForegroundColor Cyan
    yarn test:orchestration
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Write-Host "2/4 yarn test:knowledge-management..." -ForegroundColor Cyan
    yarn test:knowledge-management
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  if (-not $SkipPython) {
    Write-Host "3/4 yarn test:scripts:python..." -ForegroundColor Cyan
    yarn test:scripts:python
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  if (-not $SkipShell) {
    Write-Host "4/4 yarn test:shell..." -ForegroundColor Cyan
    yarn test:shell
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  if (-not $SkipTrunk) {
    $trunk = Get-Command trunk -ErrorAction SilentlyContinue
    if ($null -eq $trunk) {
      Write-Host "trunk not on PATH - skipping yarn trunk:check (advisory)" -ForegroundColor Yellow
    } else {
      Write-Host "trunk advisory: yarn trunk:check..." -ForegroundColor Cyan
      yarn trunk:check
      if ($LASTEXITCODE -ne 0) {
        Write-Host "trunk:check reported issues (advisory only for verify:scripts)" -ForegroundColor Yellow
      }
    }
  }
}
finally {
  Pop-Location
}

Write-Host "OK - scripts CI parity checks passed" -ForegroundColor Green
