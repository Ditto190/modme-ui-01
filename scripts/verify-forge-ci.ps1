# CI-parity verification for next-forge (manual pre-PR / agent verify)
param(
  [switch]$SkipCheck,
  [switch]$SkipTest,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$RunForge = Join-Path $ScriptDir "run-forge-bun.ps1"

Write-Host "== next-forge CI parity verify ==" -ForegroundColor Cyan

if (-not (Test-Path $RunForge)) {
  Write-Error "Missing script: $RunForge"
}

if (-not $SkipCheck) {
  Write-Host "1/3 bun run check..." -ForegroundColor Cyan
  & $RunForge run check
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (-not $SkipTest) {
  Write-Host "2/3 bun run test..." -ForegroundColor Cyan
  & $RunForge run test
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (-not $SkipBuild) {
  Write-Host "3/3 bun run build..." -ForegroundColor Cyan
  & $RunForge run build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "OK - next-forge CI parity checks passed" -ForegroundColor Green
