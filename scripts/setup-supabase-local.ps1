# One-shot local Supabase: start Docker, Prisma push, SQL migrations, sync .env files.
# Run from repo root: yarn supabase:local:setup

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib\supabase-paths.ps1')

$paths = Get-ForgePaths
Write-Host '== Local Supabase setup (Docker) ==' -ForegroundColor Cyan

Write-Host '1/4 Starting Supabase Docker...' -ForegroundColor Cyan
$running = $false
try {
  Get-SupabaseLocalStatus -Paths $paths | Out-Null
  $running = $true
  Write-Host '  (already running)' -ForegroundColor DarkGray
}
catch {
  # not running yet
}
if (-not $running) {
  Invoke-SupabaseCli -CliArgs @('start', '--dns-resolver', 'https') -Paths $paths -AllowFailure | Out-Null
  Get-SupabaseLocalStatus -Paths $paths | Out-Null
}

Write-Host '2/4 Prisma db push (local Postgres)...' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'sync-supabase-local-env.ps1') | Out-Host
Import-DotEnvFile -Path $paths.DatabaseEnv
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
  & (Join-Path $PSScriptRoot 'run-forge-bun.ps1') run db:push
  if ($LASTEXITCODE -ne 0) { throw "bun run db:push failed (exit $LASTEXITCODE)" }
}
finally {
  $ErrorActionPreference = $prevEap
}

Write-Host '3/4 SQL migrations (pgvector, RLS, seeds)...' -ForegroundColor Cyan
Invoke-SupabaseCli -CliArgs @('db', 'push', '--local', '--yes') -Paths $paths | Out-Null

Write-Host '4/4 Syncing .env files from supabase status...' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'sync-supabase-local-env.ps1') | Out-Null

Write-Host ''
Write-Host 'Local Supabase ready.' -ForegroundColor Green
Write-Host '  Studio: http://127.0.0.1:54323'
Write-Host '  Intake: yarn intake:dry-run   (from repo root)'
Write-Host '          bun run intake:dry-run (from next-forge/)'
