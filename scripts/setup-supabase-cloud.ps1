# Setup cloud Supabase for modme-next-forge (Windows-friendly)
# Run from repo root: .\scripts\setup-supabase-cloud.ps1

param(
    [string]$ProjectRef = "aevemmmmouxqlfyxthzf",
    [string]$DbPassword = "",
    [switch]$SkipMigrations
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Forge = Join-Path $Root "next-forge"
$DatabasePkg = Join-Path $Forge "packages\database"
$SupabaseWorkdir = $Forge

function Invoke-Supabase {
    param([string[]]$Args)
    Push-Location $DatabasePkg
    try {
        & bunx supabase @Args --workdir $SupabaseWorkdir --dns-resolver https
        if ($LASTEXITCODE -ne 0) { throw "supabase failed: $($Args -join ' ')" }
    } finally {
        Pop-Location
    }
}

Write-Host "== Supabase cloud setup (modme-next-forge) ==" -ForegroundColor Cyan
Write-Host "Project ref: $ProjectRef"
Write-Host ""

# 1. Ensure CLI login (token preferred on Windows)
if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "Tip: login once with:" -ForegroundColor Yellow
    Write-Host "  cd next-forge\packages\database"
    Write-Host "  bunx supabase login --token sbp_<from https://supabase.com/dashboard/account/tokens>"
    Write-Host ""
}

# 2. Link (skips DB verify if no password — use --dns-resolver https for IPv6 DNS on Windows)
Write-Host "Linking project..."
if ($DbPassword) {
    Invoke-Supabase @("link", "--project-ref", $ProjectRef, "-p", $DbPassword, "--yes")
} else {
    Invoke-Supabase @("link", "--project-ref", $ProjectRef, "--yes")
}

Invoke-Supabase @("projects", "list") | Out-Host

# 3. Env templates
$DbEnv = Join-Path $DatabasePkg ".env"
$DbEnvExample = Join-Path $DatabasePkg ".env.example"
if (-not (Test-Path $DbEnvExample)) {
    @"
# Copy to .env and set [YOUR-DB-PASSWORD] from dashboard → Settings → Database
# Connect → ORMs → Prisma for exact strings

DATABASE_URL="postgresql://postgres.${ProjectRef}:[YOUR-DB-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR-DB-PASSWORD]@db.${ProjectRef}.supabase.co:5432/postgres"
"@ | Set-Content $DbEnvExample -Encoding utf8
    Write-Host "Created $DbEnvExample"
}

if (-not (Test-Path $DbEnv)) {
    Copy-Item $DbEnvExample $DbEnv
    Write-Host "Created $DbEnv — edit [YOUR-DB-PASSWORD] before db:push"
}

$AppEnvLocal = Join-Path $Forge "apps\app\.env.local"
if (-not (Test-Path $AppEnvLocal)) {
    @"
NEXT_PUBLIC_SUPABASE_URL=https://${ProjectRef}.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
"@ | Set-Content $AppEnvLocal -Encoding utf8
    Write-Host "Created $AppEnvLocal — add publishable key from dashboard → API"
}

# 4. Migrations
if (-not $SkipMigrations) {
    if (-not $DbPassword -and -not (Select-String -Path $DbEnv -Pattern '\[YOUR-DB-PASSWORD\]' -Quiet)) {
        $DbPassword = (Get-Content $DbEnv | Where-Object { $_ -match '^DIRECT_URL=' }) -replace '.*postgres:([^@]+)@.*','$1'
    }
    if ((Select-String -Path $DbEnv -Pattern '\[YOUR-DB-PASSWORD\]' -Quiet)) {
        Write-Host ""
        Write-Host "Set database password in packages/database/.env then run:" -ForegroundColor Yellow
        Write-Host "  cd next-forge && bun run db:push"
        Write-Host "  cd next-forge\packages\database && bunx supabase db push --workdir ..\.. --dns-resolver https"
    } else {
        Push-Location $Forge
        $env:SUPABASE_DB_PASSWORD = $DbPassword
        bun run db:push
        Invoke-Supabase @("db", "push")
        Pop-Location
        Write-Host "Schema pushed." -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Done. For intake from repo root:" -ForegroundColor Green
Write-Host '  $env:NEXT_PUBLIC_SUPABASE_URL = "https://'"$ProjectRef"'.supabase.co"'
Write-Host '  $env:SUPABASE_SERVICE_ROLE_KEY = "<service_role from dashboard API>"'
Write-Host "  yarn intake"
