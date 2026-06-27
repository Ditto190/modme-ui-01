# Run inbox ingest with Supabase env loaded. Works from repo root or next-forge/.
param(
  [switch]$DryRun,
  [switch]$Local
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib\supabase-paths.ps1')

$paths = Get-ForgePaths

function Test-RootEnvHasCloudPair {
  if (-not (Test-Path $paths.RootEnv)) { return $false }
  $raw = (Get-Content $paths.RootEnv -Raw -Encoding UTF8) -replace '^\uFEFF', ''
  $hasUrl = $raw -match 'NEXT_PUBLIC_SUPABASE_URL=.*aevemmmmouxqlfyxthzf\.supabase\.co'
  $hasKey = $raw -match 'SUPABASE_SERVICE_ROLE_KEY=\S{20,}'
  return $hasUrl -and $hasKey
}

if ($Local) {
  & (Join-Path $PSScriptRoot 'sync-supabase-local-env.ps1') -StartIfStopped | Out-Null
}
elseif (-not (Test-Path $paths.RootEnv)) {
  & (Join-Path $PSScriptRoot 'sync-supabase-local-env.ps1') -StartIfStopped | Out-Null
}
elseif (-not (Test-RootEnvHasCloudPair)) {
  $shellMissing = -not $env:NEXT_PUBLIC_SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY
  if ($shellMissing) {
    Write-Host 'Root .env missing cloud Supabase pair — not auto-syncing local (hosted-first).' -ForegroundColor Yellow
    Write-Host 'Run: node scripts/diagnose-supabase-env.mjs' -ForegroundColor Cyan
  }
}

Import-DotEnvFile -Path $paths.RootEnv

if (-not $env:NEXT_PUBLIC_SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY) {
  throw 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in root .env — run node scripts/diagnose-supabase-env.mjs'
}

$ingest = Join-Path $paths.RepoRoot 'scripts\inbox-ingest.mjs'
$args = @($ingest)
if ($DryRun) { $args += '--dry-run' }

Push-Location $paths.RepoRoot
try {
  & node @args
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
