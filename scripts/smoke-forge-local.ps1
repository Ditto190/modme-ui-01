# Smoke-check next-forge local stack (ModMe)
param(
  [switch]$SkipSupabase,
  [switch]$SkipCheck
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$ForgeRoot = Join-Path $RepoRoot "next-forge"

Write-Host "== next-forge local smoke ==" -ForegroundColor Cyan

if (-not (Test-Path $ForgeRoot)) {
  Write-Error "next-forge not found: $ForgeRoot"
}

Push-Location $ForgeRoot
try {
  if (-not $SkipSupabase) {
    Write-Host "Checking Supabase status..."
    $status = supabase status 2>&1
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "Supabase not running. Run: cd next-forge && bun run db:start"
    }
    else {
      Write-Host $status
    }
  }

  if (-not $SkipCheck) {
    Write-Host "Running bun run check..."
    bun run check
    if ($LASTEXITCODE -ne 0) {
      Write-Error "bun run check failed"
    }
  }

  Write-Host "Dry-run turbo build..."
  bunx turbo build --dry-run
  if ($LASTEXITCODE -ne 0) {
    Write-Error "turbo build --dry-run failed"
  }

  Write-Host "OK - local smoke checks passed" -ForegroundColor Green
}
finally {
  Pop-Location
}
