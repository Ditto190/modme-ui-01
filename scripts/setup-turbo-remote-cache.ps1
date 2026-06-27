# Turbo remote cache setup helper — validates compose stack, optional server health check,
# syncs local .env files and GitHub vars/secrets without printing secret values.
# Run from repo root: .\scripts\setup-turbo-remote-cache.ps1 [-CheckServer] [-ApplyLocalEnv] [-ApplyGh] [-StartDocker] [-DryRun]

param(
    [switch]$CheckServer,
    [switch]$ApplyLocalEnv,
    [switch]$ApplyGh,
    [switch]$StartDocker,
    [switch]$LocalDev,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib\read-dotenv.ps1")

$Root = Split-Path $PSScriptRoot -Parent
$ComposeDir = Join-Path $PSScriptRoot "turbo-remote-cache"
$ComposeFile = Join-Path $ComposeDir "docker-compose.yml"
$EnvExample = Join-Path $ComposeDir "env.example"
$ServerEnv = Join-Path $ComposeDir ".env"
$RootEnv = Join-Path $Root ".env"
$ForgeEnv = Join-Path $Root "next-forge\.env"

function New-TurboRandomSecret {
    param([int]$ByteLength = 32)
    $bytes = New-Object byte[] $ByteLength
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Get-MergedTurboConfig {
    $keys = @(
        'TURBO_REMOTE_CACHE_ENABLED',
        'TURBO_API',
        'TURBO_TOKEN',
        'TURBO_TEAM',
        'TURBO_REMOTE_CACHE_SIGNATURE_KEY',
        'S3_ACCESS_KEY',
        'S3_SECRET_KEY',
        'S3_REGION',
        'STORAGE_PATH'
    )
    $merged = @{}
    foreach ($path in @($RootEnv, $ForgeEnv, $ServerEnv)) {
        if (-not (Test-Path $path)) { continue }
        $map = Get-DotEnvMap -Path $path
        foreach ($k in $keys) {
            if ($map.ContainsKey($k) -and $map[$k]) { $merged[$k] = $map[$k] }
        }
    }
    if (-not $merged['TURBO_TEAM']) { $merged['TURBO_TEAM'] = 'modme' }
    if (-not $merged['TURBO_API']) { $merged['TURBO_API'] = 'http://localhost:8080' }
    if (-not $merged['TURBO_REMOTE_CACHE_ENABLED']) { $merged['TURBO_REMOTE_CACHE_ENABLED'] = 'true' }
    if (-not $merged['S3_REGION']) { $merged['S3_REGION'] = 'us-east-1' }
    if (-not $merged['STORAGE_PROVIDER']) { $merged['STORAGE_PROVIDER'] = 'local' }
    if (-not $merged['STORAGE_PATH']) {
        $merged['STORAGE_PATH'] = if ($merged['STORAGE_PROVIDER'] -eq 'local') { '/mnt/cache' } else { 'modme-turbo-cache' }
    }
    return $merged
}

function Invoke-ApplyLocalTurboEnv {
    param([hashtable]$Config, [switch]$DryRun)

    $generated = @()
    if (-not $Config['TURBO_TOKEN']) {
        $Config['TURBO_TOKEN'] = New-TurboRandomSecret
        $generated += 'TURBO_TOKEN'
    }
    if (-not $Config['TURBO_REMOTE_CACHE_SIGNATURE_KEY']) {
        $Config['TURBO_REMOTE_CACHE_SIGNATURE_KEY'] = New-TurboRandomSecret -ByteLength 48
        $generated += 'TURBO_REMOTE_CACHE_SIGNATURE_KEY'
    }
    if ($generated.Count -gt 0) {
        Write-Host "Generated local-only secrets: $($generated -join ', ') (not printed)" -ForegroundColor Yellow
    }

    if ($DryRun) {
        Write-Host "[dry-run] Would update next-forge/.env and scripts/turbo-remote-cache/.env; strip TURBO_* from root .env" -ForegroundColor DarkGray
        return $Config
    }

    $forgeKeys = @{
        TURBO_REMOTE_CACHE_ENABLED = $Config['TURBO_REMOTE_CACHE_ENABLED']
        TURBO_API                  = $Config['TURBO_API']
        TURBO_TOKEN                = $Config['TURBO_TOKEN']
        TURBO_TEAM                 = $Config['TURBO_TEAM']
        TURBO_REMOTE_CACHE_SIGNATURE_KEY = $Config['TURBO_REMOTE_CACHE_SIGNATURE_KEY']
    }
    Update-DotEnvKeys -Path $ForgeEnv -Values $forgeKeys

    $serverKeys = @{
        TURBO_TOKEN                        = $Config['TURBO_TOKEN']
        TURBO_REMOTE_CACHE_SIGNATURE_KEY   = $Config['TURBO_REMOTE_CACHE_SIGNATURE_KEY']
        S3_REGION                          = $Config['S3_REGION']
        STORAGE_PATH                       = $Config['STORAGE_PATH']
    }
    if ($Config['STORAGE_PROVIDER']) { $serverKeys['STORAGE_PROVIDER'] = $Config['STORAGE_PROVIDER'] }
    if ($Config['STORAGE_PATH_USE_TMP_FOLDER']) { $serverKeys['STORAGE_PATH_USE_TMP_FOLDER'] = $Config['STORAGE_PATH_USE_TMP_FOLDER'] }
    if ($Config['S3_ACCESS_KEY']) { $serverKeys['S3_ACCESS_KEY'] = $Config['S3_ACCESS_KEY'] }
    if ($Config['S3_SECRET_KEY']) { $serverKeys['S3_SECRET_KEY'] = $Config['S3_SECRET_KEY'] }
    if (-not (Test-Path $ServerEnv)) {
        Copy-Item $EnvExample $ServerEnv
    }
    Update-DotEnvKeys -Path $ServerEnv -Values $serverKeys

    # Turbo 2.8.x on Windows panics if a parent .env is outside the turbo root (next-forge/).
    # Keep TURBO_* only in next-forge/.env — never root .env.
    $turboRootKeys = @(
        'TURBO_REMOTE_CACHE_ENABLED',
        'TURBO_API',
        'TURBO_TOKEN',
        'TURBO_TEAM',
        'TURBO_REMOTE_CACHE_SIGNATURE_KEY'
    )
    Remove-DotEnvKeys -Path $RootEnv -Keys $turboRootKeys

    Write-Host "Local env synced (next-forge/.env, server .env). Root .env TURBO_* stripped (Windows turbo fix)." -ForegroundColor Green
    return $Config
}

function Invoke-ApplyGhTurboConfig {
    param([hashtable]$Config, [switch]$DryRun)

    $repo = $null
    try {
        $repo = gh repo view --json nameWithOwner -q .nameWithOwner 2>$null
    } catch { }
    if (-not $repo) {
        Write-Host "gh repo not resolved; skipping -ApplyGh." -ForegroundColor Yellow
        return
    }
    $repoFlag = @('-R', $repo)

    $api = $Config['TURBO_API']
    $isLocalApi = $api -match 'localhost|127\.0\.0\.1'
    if ($isLocalApi) {
        Write-Host "TURBO_API is local; skipping TURBO_REMOTE_CACHE_ENABLED/TURBO_API gh vars (CI needs a reachable URL)." -ForegroundColor Yellow
    }

    if ($DryRun) {
        Write-Host "[dry-run] Would apply GitHub vars/secrets where values exist." -ForegroundColor DarkGray
        return
    }

    if (-not $isLocalApi -and $api) {
        gh variable set TURBO_API -b $api @repoFlag | Out-Null
        gh variable set TURBO_REMOTE_CACHE_ENABLED -b 'true' @repoFlag | Out-Null
        Write-Host "GitHub variable TURBO_API set." -ForegroundColor Green
        Write-Host "GitHub variable TURBO_REMOTE_CACHE_ENABLED=true set." -ForegroundColor Green
    }

    if ($Config['TURBO_TEAM']) {
        gh variable set TURBO_TEAM -b $Config['TURBO_TEAM'] @repoFlag | Out-Null
        Write-Host "GitHub variable TURBO_TEAM set." -ForegroundColor Green
    }

    if ($Config['TURBO_TOKEN']) {
        $Config['TURBO_TOKEN'] | gh secret set TURBO_TOKEN @repoFlag
        Write-Host "GitHub secret TURBO_TOKEN set." -ForegroundColor Green
    }
    if ($Config['TURBO_REMOTE_CACHE_SIGNATURE_KEY']) {
        $Config['TURBO_REMOTE_CACHE_SIGNATURE_KEY'] | gh secret set TURBO_REMOTE_CACHE_SIGNATURE_KEY @repoFlag
        Write-Host "GitHub secret TURBO_REMOTE_CACHE_SIGNATURE_KEY set." -ForegroundColor Green
    }
}

function Invoke-StartTurboCacheDocker {
    param([switch]$DryRun)

    if ($DryRun) {
        Write-Host "[dry-run] Would run docker compose up -d in scripts/turbo-remote-cache" -ForegroundColor DarkGray
        return
    }
    Push-Location $ComposeDir
    try {
        docker compose up -d
        docker compose ps
    } finally {
        Pop-Location
    }
}

Write-Host "== Turbo remote cache setup ==" -ForegroundColor Cyan
Write-Host "Docs: docs/monorepo-build-ci-setup.md" -ForegroundColor DarkGray
Write-Host "ADR:  next-forge/docs/adr/0011-turbo-self-hosted-remote-cache.md" -ForegroundColor DarkGray
Write-Host ""

$missing = @()
if (-not (Test-Path $ComposeFile)) { $missing += $ComposeFile }
if (-not (Test-Path $EnvExample)) { $missing += $EnvExample }
if ($missing.Count -gt 0) {
    Write-Error "Missing turbo-remote-cache files:`n  $($missing -join "`n  ")"
}
Write-Host "Docker Compose stack: OK ($ComposeDir)" -ForegroundColor Green

if (-not (Test-Path $ServerEnv)) {
    Write-Host "Server .env not found. Create from env.example:" -ForegroundColor Yellow
    Write-Host "  cd scripts/turbo-remote-cache" -ForegroundColor DarkGray
    Write-Host "  Copy-Item env.example .env" -ForegroundColor DarkGray
} else {
    Write-Host "Server .env: present (scripts/turbo-remote-cache/.env)" -ForegroundColor Green
}

$config = Get-MergedTurboConfig

if ($ApplyLocalEnv) {
    Write-Host ""
    Write-Host "== Apply local env (-ApplyLocalEnv) ==" -ForegroundColor Cyan
    $config = Invoke-ApplyLocalTurboEnv -Config $config -DryRun:$DryRun
}

if ($StartDocker) {
    Write-Host ""
    Write-Host "== Docker compose (-StartDocker) ==" -ForegroundColor Cyan
    if ($LocalDev) {
        $config['STORAGE_PROVIDER'] = 'local'
        $config['STORAGE_PATH'] = '/mnt/cache'
        $config['STORAGE_PATH_USE_TMP_FOLDER'] = 'false'
        if (-not $DryRun) {
            Update-DotEnvKeys -Path $ServerEnv -Values @{
                STORAGE_PROVIDER             = 'local'
                STORAGE_PATH                 = '/mnt/cache'
                STORAGE_PATH_USE_TMP_FOLDER  = 'false'
            }
        }
        Write-Host "Local dev mode: STORAGE_PROVIDER=local (no S3 required)." -ForegroundColor Green
    }
    $s3Ready = [bool]$config['S3_ACCESS_KEY'] -and [bool]$config['S3_SECRET_KEY']
    $useLocal = ($config['STORAGE_PROVIDER'] -eq 'local') -or $LocalDev
    if (-not $useLocal -and -not $s3Ready) {
        Write-Host "Blocked: S3_ACCESS_KEY and S3_SECRET_KEY required, or pass -LocalDev." -ForegroundColor Red
    } else {
        try {
            Invoke-StartTurboCacheDocker -DryRun:$DryRun
        } catch {
            Write-Host "Docker failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

if ($ApplyGh) {
    Write-Host ""
    Write-Host "== GitHub Actions (-ApplyGh) ==" -ForegroundColor Cyan
    Invoke-ApplyGhTurboConfig -Config $config -DryRun:$DryRun
}

if ($CheckServer) {
    Write-Host ""
    Write-Host "== Server health check (-CheckServer) ==" -ForegroundColor Cyan
    if (-not (Test-Path $ForgeEnv)) {
        Write-Error "next-forge/.env not found. Run with -ApplyLocalEnv or add TURBO_API and TURBO_TOKEN."
    }

    $api = Get-DotEnvValue -Path $ForgeEnv -Key 'TURBO_API'
    $token = Get-DotEnvValue -Path $ForgeEnv -Key 'TURBO_TOKEN'
    if (-not $api) { Write-Error "TURBO_API missing in next-forge/.env" }
    if (-not $token) { Write-Error "TURBO_TOKEN missing in next-forge/.env" }

    $api = $api.TrimEnd('/')
    $uri = "$api/v8/artifacts/status"
    Write-Host "GET $uri" -ForegroundColor DarkGray

    try {
        $headers = @{ Authorization = "Bearer $token" }
        $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get -TimeoutSec 15
        $status = $response.status
        if ($status) {
            Write-Host "Server status: $status" -ForegroundColor Green
        } else {
            Write-Host "Response received (no status field). Check server logs." -ForegroundColor Yellow
        }
    } catch {
        Write-Error "Health check failed: $($_.Exception.Message)"
    }
}

if (-not ($ApplyLocalEnv -or $ApplyGh -or $CheckServer -or $StartDocker)) {
    Write-Host ""
    Write-Host "== Local dev (next-forge/.env) ==" -ForegroundColor Cyan
    Write-Host @"
CI does NOT read next-forge/.env. GitHub Actions uses repo variables/secrets instead.
Local file (gitignored) — variable names only:

  TURBO_REMOTE_CACHE_ENABLED=true
  TURBO_API=
  TURBO_TOKEN=
  TURBO_TEAM=modme
  TURBO_REMOTE_CACHE_SIGNATURE_KEY=
"@ -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "== GitHub Actions (repository settings) ==" -ForegroundColor Cyan
    Write-Host "Optional automation: -ApplyLocalEnv -ApplyGh -StartDocker -CheckServer" -ForegroundColor DarkGray
    $repo = $null
    try { $repo = gh repo view --json nameWithOwner -q .nameWithOwner 2>$null } catch { }
    $repoFlag = if ($repo) { "-R $repo" } else { "" }
    Write-Host "  gh variable set TURBO_REMOTE_CACHE_ENABLED -b `"true`" $repoFlag" -ForegroundColor DarkGray
    Write-Host "  gh variable set TURBO_API -b `"https://turbo-cache.your-domain.internal`" $repoFlag" -ForegroundColor DarkGray
    Write-Host "  gh variable set TURBO_TEAM -b `"modme`" $repoFlag" -ForegroundColor DarkGray
    Write-Host "  gh secret set TURBO_TOKEN $repoFlag" -ForegroundColor DarkGray
    Write-Host "  gh secret set TURBO_REMOTE_CACHE_SIGNATURE_KEY $repoFlag" -ForegroundColor DarkGray
}

if (-not $DryRun) {
    Write-Host ""
    Write-Host "When vars.TURBO_REMOTE_CACHE_ENABLED is not 'true', CI uses actions/cache on next-forge/.turbo only." -ForegroundColor Cyan
}
