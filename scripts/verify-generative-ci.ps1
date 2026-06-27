# CI-parity verification for GenerativeUI_monorepo (manual pre-PR / agent verify)
param(
  [switch]$SkipLint,
  [switch]$SkipTest,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$GenerativeRoot = Join-Path $RepoRoot "GenerativeUI_monorepo"

Write-Host "== GenerativeUI CI parity verify ==" -ForegroundColor Cyan

if (-not (Test-Path (Join-Path $GenerativeRoot "package.json"))) {
  Write-Error "Missing GenerativeUI_monorepo/package.json"
}

Push-Location $GenerativeRoot
try {
  if (-not $SkipLint) {
    Write-Host "1/3 yarn lint..." -ForegroundColor Cyan
    yarn lint
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  if (-not $SkipTest) {
    Write-Host "2/3 yarn test..." -ForegroundColor Cyan
    yarn test
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  if (-not $SkipBuild) {
    Write-Host "3/3 yarn build..." -ForegroundColor Cyan
    yarn build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
}
finally {
  Pop-Location
}

Write-Host "OK - GenerativeUI CI parity checks passed" -ForegroundColor Green
