# Run inbox ingest with Supabase env loaded. Works from repo root or next-forge/.
param(
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib\supabase-paths.ps1')

$paths = Get-ForgePaths
$needsSync = $false

foreach ($key in @('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY')) {
  if (-not (Get-Item -Path "env:$key" -ErrorAction SilentlyContinue)) {
    $needsSync = $true
    break
  }
}

if ($needsSync -or -not (Test-Path $paths.RootEnv)) {
  & (Join-Path $PSScriptRoot 'sync-supabase-local-env.ps1') -StartIfStopped | Out-Null
}

Import-DotEnvFile -Path $paths.RootEnv

if (-not $env:NEXT_PUBLIC_SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY) {
  throw 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY after env sync'
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
