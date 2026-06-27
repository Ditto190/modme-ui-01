# Sync root .env values into next-forge dotenv targets (gitignored).
# Run from repo root: .\scripts\sync-env-from-root.ps1

param(
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib\read-dotenv.ps1")

$Root = Split-Path $PSScriptRoot -Parent
$RootEnv = Join-Path $Root ".env"
$Forge = Join-Path $Root "next-forge"

if (-not (Test-Path $RootEnv)) {
    Write-Error "Root .env not found. Copy .env.example to .env and fill values first."
}

$src = Get-DotEnvMap -Path $RootEnv

function Resolve-First {
    param([string[]]$Keys)
    foreach ($k in $Keys) {
        if ($src.ContainsKey($k) -and $src[$k]) { return $src[$k] }
    }
    return $null
}

$supabaseUrl = Resolve-First @(
    'NEXT_PUBLIC_SUPABASE_URL'
    'SUPABASE_SERVER_URL'
)
$publishableKey = Resolve-First @(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
)
$serviceRole = Resolve-First @('SUPABASE_SERVICE_ROLE_KEY')
$databaseUrl = Resolve-First @('DATABASE_URL')
$directUrl = Resolve-First @('DIRECT_URL')
$authSecret = Resolve-First @('AUTH_SECRET')

if (-not $authSecret) {
    $authSecret = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
    Write-Host "Generated AUTH_SECRET (add to root .env to persist)" -ForegroundColor Yellow
}

$targets = @(
    @{
        Path  = Join-Path $Forge "packages\database\.env"
        Values = @{
            DATABASE_URL = $databaseUrl
            DIRECT_URL   = $directUrl
        }
    },
    @{
        Path  = Join-Path $Forge "apps\app\.env.local"
        Values = @{
            NEXT_PUBLIC_SUPABASE_URL              = $supabaseUrl
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  = $publishableKey
            DATABASE_URL                          = $databaseUrl
            DIRECT_URL                            = $directUrl
            AUTH_SECRET                           = $authSecret
            NEXT_PUBLIC_APP_URL                   = 'http://localhost:3100'
            NEXT_PUBLIC_WEB_URL                   = 'http://localhost:3101'
            NEXT_PUBLIC_API_URL                   = 'http://localhost:3102'
            NEXT_PUBLIC_DOCS_URL                  = 'http://localhost:3104'
        }
    },
    @{
        Path  = Join-Path $Forge "apps\api\.env.local"
        Values = @{
            NEXT_PUBLIC_SUPABASE_URL              = $supabaseUrl
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  = $publishableKey
            DATABASE_URL                          = $databaseUrl
            DIRECT_URL                            = $directUrl
            AUTH_SECRET                           = $authSecret
        }
    },
    @{
        Path  = Join-Path $Forge "apps\web\.env.local"
        Values = @{
            NEXT_PUBLIC_SUPABASE_URL              = $supabaseUrl
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  = $publishableKey
            NEXT_PUBLIC_WEB_URL                   = 'http://localhost:3101'
        }
    }
)

Write-Host "== Sync env from root .env ==" -ForegroundColor Cyan
foreach ($t in $targets) {
    $missing = @($t.Values.GetEnumerator() | Where-Object { -not $_.Value } | ForEach-Object { $_.Key })
    if ($missing.Count -gt 0) {
        Write-Host "  skip $($t.Path) - missing: $($missing -join ', ')" -ForegroundColor Yellow
        continue
    }
    if ($DryRun) {
        Write-Host "  [dry-run] would write $($t.Path)" -ForegroundColor DarkGray
        continue
    }
    Set-DotEnvFile -Path $t.Path -Values $t.Values -Merge
    Write-Host "  + $($t.Path)" -ForegroundColor Green
}

if ($serviceRole -and -not $DryRun) {
    Write-Host ""
    Write-Host "Root intake vars (set in shell or root .env):" -ForegroundColor Cyan
    Write-Host "  NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl"
    Write-Host "  SUPABASE_SERVICE_ROLE_KEY=<set in root .env>"
}

Write-Host ""
Write-Host "Done. Verify: yarn dev:forge:core" -ForegroundColor Green
