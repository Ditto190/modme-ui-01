# Ensure root .env targets hosted modme-next-forge (not local Docker).
param(
  [switch]$VerifyOnly
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib\supabase-paths.ps1")

$Root = Split-Path $PSScriptRoot -Parent
$EnvPath = Join-Path $Root ".env"
$ProjectRef = "aevemmmmouxqlfyxthzf"
$CloudHost = "aevemmmmouxqlfyxthzf.supabase.co"

if (-not (Test-Path $EnvPath)) {
  Write-Host "Missing $EnvPath — copy from docs/supabase-cloud-setup.md" -ForegroundColor Red
  exit 1
}

function Read-EnvMap {
  param([string]$Path)
  $map = @{}
  if (-not (Test-Path $Path)) { return $map }
  $raw = Get-Content $Path -Raw -Encoding UTF8
  $raw = $raw -replace '^\uFEFF', ''
  foreach ($line in ($raw -split "`r?`n")) {
    $t = $line.Trim()
    if (-not $t -or $t.StartsWith('#')) { continue }
    $eq = $t.IndexOf('=')
    if ($eq -lt 1) { continue }
    $key = $t.Substring(0, $eq).Trim()
    $val = $t.Substring($eq + 1).Trim().Trim('"').Trim("'")
    $map[$key] = $val
  }
  return $map
}

$envMap = Read-EnvMap -Path $EnvPath
$url = $envMap['NEXT_PUBLIC_SUPABASE_URL']
$serviceKey = $envMap['SUPABASE_SERVICE_ROLE_KEY']
$publishable = $envMap['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']

$isLocalUrl = $url -match '127\.0\.0\.1|localhost:54321'

if ($isLocalUrl -and -not $VerifyOnly) {
  Write-Host "Root .env points at local Supabase — switching URL to hosted $ProjectRef" -ForegroundColor Yellow
  node (Join-Path $PSScriptRoot "fix-cloud-supabase-url.mjs")
  $envMap = Read-EnvMap -Path $EnvPath
  $url = $envMap['NEXT_PUBLIC_SUPABASE_URL']
  $serviceKey = $envMap['SUPABASE_SERVICE_ROLE_KEY']
  $isLocalUrl = $url -match '127\.0\.0\.1|localhost:54321'
}

$hasCloudUrl = ($url -and -not $isLocalUrl -and $url -match [regex]::Escape($CloudHost))
$hasService = [bool]$serviceKey
$serviceLooksPublishable = $serviceKey -like 'sb_publishable_*'

Write-Host ""
Write-Host "Hosted Supabase env check ($ProjectRef)" -ForegroundColor Cyan
Write-Host "  Dashboard: https://supabase.com/dashboard/project/$ProjectRef"
Write-Host "  root .env path: $EnvPath"
Write-Host "  NEXT_PUBLIC_SUPABASE_URL: $(if ($hasCloudUrl) { 'OK (cloud)' } elseif ($isLocalUrl) { 'LOCAL' } else { 'MISSING/wrong project' })"
Write-Host "  SUPABASE_SERVICE_ROLE_KEY: $(if ($hasService) { 'set' } else { 'MISSING' })"
if ($serviceLooksPublishable) {
  Write-Host "  WARNING: service key looks like publishable (sb_publishable_*) — use service_role secret" -ForegroundColor Red
}
if (-not $hasService -and $publishable) {
  Write-Host "  NOTE: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is set but scrape scripts need SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Yellow
}

$failed = $false
if (-not $hasCloudUrl) { $failed = $true }
if (-not $hasService -or $serviceLooksPublishable) { $failed = $true }

if ($failed) {
  Write-Host ""
  Write-Host "Root .env must include (from dashboard → Settings → API):" -ForegroundColor Yellow
  Write-Host "  NEXT_PUBLIC_SUPABASE_URL=https://$CloudHost"
  Write-Host "  SUPABASE_SERVICE_ROLE_KEY=<service_role secret — NOT publishable key>"
  Write-Host "  https://supabase.com/dashboard/project/$ProjectRef/settings/api"
  Write-Host ""
  Write-Host "Run: node scripts/diagnose-supabase-env.mjs" -ForegroundColor Cyan
  exit 1
}

if (-not $VerifyOnly) {
  Import-DotEnvFile -Path $EnvPath
}

Write-Host ""
Write-Host "Cloud env OK for agent scripts (intake, scrape-promote, scrape-classify)." -ForegroundColor Green
