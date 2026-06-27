# ModMe developer setup — env sync, gh-aw secrets, next-forge verify.
# Run from repo root: .\scripts\setup-modme-dev.ps1

param(
    [switch]$DryRun,
    [switch]$SkipSecrets,
    [switch]$SkipForgeVerify
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent

Write-Host "== ModMe dev setup (DX + next-forge) ==" -ForegroundColor Cyan
Write-Host ""

# Prerequisites
foreach ($cmd in @('node', 'gh', 'git')) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Error "Missing prerequisite: $cmd"
    }
}

$nodeMajor = [int]((node --version) -replace 'v', '' -split '\.')[0]
if ($nodeMajor -lt 22) {
    Write-Warning "Node.js 22+ recommended (current: $(node --version))"
}

gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "gh not authenticated. Run: gh auth login --scopes repo,workflow"
}

# 1. Env templates
$envExample = Join-Path $Root ".env.example"
if (-not (Test-Path $envExample)) {
    & (Join-Path $PSScriptRoot "write-env-example.ps1")
}
if (-not (Test-Path (Join-Path $Root ".env")) -and (Test-Path $envExample)) {
    Copy-Item (Join-Path $Root ".env.example") (Join-Path $Root ".env")
    Write-Host "Created .env from .env.example — fill values then re-run" -ForegroundColor Yellow
}

# 2. Sync dotenv into next-forge
& (Join-Path $PSScriptRoot "sync-env-from-root.ps1") @PSBoundParameters

# 3. gh-aw Copilot secret
if (-not $SkipSecrets) {
    & (Join-Path $PSScriptRoot "setup-gh-aw-secrets.ps1") @PSBoundParameters
}

# 4. next-forge quick verify
if (-not $SkipForgeVerify -and -not $DryRun) {
    $Forge = Join-Path $Root "next-forge"
    if (Test-Path $Forge) {
        Write-Host ""
        Write-Host "== next-forge verify ==" -ForegroundColor Cyan
        Push-Location $Forge
        try {
            & (Join-Path $Root "scripts\run-forge-bun.ps1") install
            & (Join-Path $Root "scripts\run-forge-bun.ps1") run check
        } finally {
            Pop-Location
        }
    }
}

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host "  yarn dev:forge:core     # app 3100 web 3101 api 3102"
Write-Host "  gh aw status            # agentic workflow health"
Write-Host "  yarn worktree:doctor    # worktree pre-flight"
