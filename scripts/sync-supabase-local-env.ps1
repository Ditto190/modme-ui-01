# Write local Supabase keys to .env files (from `supabase status`).
# Run from anywhere in the repo.

param(
  [switch]$StartIfStopped
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'lib\supabase-paths.ps1')

$paths = Get-ForgePaths
if (-not (Test-Path (Join-Path $paths.SupabaseDir 'supabase\config.toml'))) {
  throw 'Missing next-forge/supabase/config.toml - are you in the ModMe repo?'
}

$status = $null
try {
  $status = Get-SupabaseLocalStatus -Paths $paths
}
catch {
  if (-not $StartIfStopped) { throw }
  Write-Host 'Starting local Supabase...' -ForegroundColor Cyan
  Invoke-SupabaseCli -CliArgs @('start', '--dns-resolver', 'https') -Paths $paths | Out-Null
  $status = Get-SupabaseLocalStatus -Paths $paths
}

$dbUrl = $status.DB_URL
if (-not $dbUrl) { throw 'supabase status did not return DB_URL' }

Set-DotEnvFile -Path $paths.DatabaseEnv -Values @{
  DATABASE_URL = "`"$dbUrl`""
  DIRECT_URL   = "`"$dbUrl`""
}

Set-DotEnvFile -Path $paths.RootEnv -Values @{
  NEXT_PUBLIC_SUPABASE_URL      = $status.API_URL
  SUPABASE_SERVICE_ROLE_KEY     = $status.SERVICE_ROLE_KEY
  NEXT_PUBLIC_SUPABASE_ANON_KEY = $status.ANON_KEY
}

Set-DotEnvFile -Path $paths.AppEnvLocal -Values @{
  NEXT_PUBLIC_SUPABASE_URL             = $status.API_URL
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $status.PUBLISHABLE_KEY
  DATABASE_URL                         = "`"$dbUrl`""
  DIRECT_URL                           = "`"$dbUrl`""
}

Write-Host "Synced local Supabase env:" -ForegroundColor Green
Write-Host "  $($paths.DatabaseEnv)"
Write-Host "  $($paths.RootEnv)"
Write-Host "  $($paths.AppEnvLocal)"
Write-Host "  API: $($status.API_URL)"
