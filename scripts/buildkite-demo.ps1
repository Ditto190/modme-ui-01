# Local walkthrough of .buildkite/pipeline.yml — no Buildkite account required.
# Usage: .\scripts\buildkite-demo.ps1 [-SkipInstall] [-DryRun]

param(
    [switch]$SkipInstall,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Monorepo = Join-Path $Root "GenerativeUI_monorepo"

$steps = @(
    @{
        Key     = "secret-guard"
        Label   = ":shield: Secret guard"
        Action  = {
            $tracked = git -C $Root ls-files 2>$null | Where-Object {
                $_ -match '(^|/)\.env$|\.env\.local$|\.env\.production$'
            }
            if ($tracked) {
                throw "Tracked env files found: $($tracked -join ', ')"
            }
            "No secret env files tracked"
        }
    }
    @{
        Key     = "install"
        Label   = ":yarn: Install dependencies"
        Skip    = $SkipInstall
        Action  = {
            Push-Location $Monorepo
            try {
                corepack enable 2>$null
                yarn install --immutable 2>$null
                if ($LASTEXITCODE -ne 0) { yarn install }
                "Dependencies installed"
            } finally {
                Pop-Location
            }
        }
    }
    @{
        Key     = "lint"
        Label   = ":eslint: Lint"
        Action  = {
            Push-Location $Monorepo
            try { yarn lint; "Lint passed" } finally { Pop-Location }
        }
    }
    @{
        Key     = "test"
        Label   = ":test_tube: Test"
        Action  = {
            Push-Location $Monorepo
            try { yarn test; "Tests passed" } finally { Pop-Location }
        }
    }
    @{
        Key     = "build"
        Label   = ":package: Build"
        Action  = {
            Push-Location $Monorepo
            try { yarn build; "Build passed" } finally { Pop-Location }
        }
    }
)

Write-Host ""
Write-Host "  Buildkite pipeline demo — Monorepo_ModMe" -ForegroundColor Cyan
Write-Host "  Mirrors .buildkite/pipeline.yml" -ForegroundColor DarkGray
Write-Host ""

$failed = $false
foreach ($step in $steps) {
    if ($step.Skip) {
        Write-Host "  [$($step.Key)] SKIP (flag)" -ForegroundColor DarkYellow
        continue
    }

    Write-Host "  $($step.Label)" -ForegroundColor Green
    Write-Host "  key: $($step.Key)" -ForegroundColor DarkGray

    if ($DryRun) {
        Write-Host "  (dry run - skipped)" -ForegroundColor DarkYellow
        Write-Host ""
        continue
    }

    try {
        $result = & $step.Action
        Write-Host "  -> $result" -ForegroundColor White
    } catch {
        Write-Host "  FAILED: $_" -ForegroundColor Red
        $failed = $true
        break
    }
    Write-Host ""
}

if ($failed) {
    Write-Host "Pipeline failed. Fix the error and re-run." -ForegroundColor Red
    exit 1
}

Write-Host ":rocket: CI green - same outcome as a successful Buildkite build." -ForegroundColor Cyan
Write-Host "Open http://localhost:3000/dev/buildkite for the visual demo." -ForegroundColor DarkGray
Write-Host ""
