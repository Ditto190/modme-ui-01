# Configure gh-aw Copilot engine secret from root .env (never prints token values).
# Run from repo root: .\scripts\setup-gh-aw-secrets.ps1

param(
    [switch]$DryRun,
    [switch]$SkipCompile
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib\read-dotenv.ps1")

$Root = Split-Path $PSScriptRoot -Parent
$RootEnv = Join-Path $Root ".env"

Write-Host "== gh-aw Copilot secret setup ==" -ForegroundColor Cyan

if (-not (Test-Path $RootEnv)) {
    Write-Error "Root .env not found. Add COPILOT_GITHUB_TOKEN or GITHUB_PAT first."
}

$token = Get-DotEnvValue -Path $RootEnv -Key 'COPILOT_GITHUB_TOKEN'
if (-not $token) { $token = Get-DotEnvValue -Path $RootEnv -Key 'GITHUB_PAT' }
if (-not $token) { $token = Get-DotEnvValue -Path $RootEnv -Key 'GITHUB_PERSONAL_ACCESS_TOKEN' }
if (-not $token) {
    Write-Error @"
No Copilot token found in .env.
Add one of:
  COPILOT_GITHUB_TOKEN=<fine-grained PAT with Copilot Requests: Read>
  GITHUB_PAT=<same>
See https://github.com/github/gh-aw/blob/main/docs/src/content/docs/setup/quick-start.mdx
"@
}

# Ensure gh-aw extension (avoid 0.68.4–0.71.3 billing bug per upstream)
$ext = gh extension list 2>$null | Select-String 'gh aw'
if (-not $ext) {
    Write-Host "Installing gh-aw extension..."
    if (-not $DryRun) { gh extension install github/gh-aw }
} else {
    Write-Host "gh-aw extension: $($ext.Line.Trim())"
}

if ($DryRun) {
    Write-Host "[dry-run] would set repository secret COPILOT_GITHUB_TOKEN" -ForegroundColor DarkGray
} else {
    Push-Location $Root
    try {
        $repo = gh repo view --json nameWithOwner -q .nameWithOwner 2>$null
        if (-not $repo) { $repo = 'Ditto190/modme-ui-01' }
        $token | gh secret set COPILOT_GITHUB_TOKEN -R $repo
        if ($LASTEXITCODE -ne 0) { throw "gh secret set failed for $repo" }
        Write-Host "Set repository secret COPILOT_GITHUB_TOKEN on $repo" -ForegroundColor Green
    } finally {
        Pop-Location
    }
}

if (-not $SkipCompile -and -not $DryRun) {
    if ($IsWindows -and -not $env:WSL_DISTRO_NAME) {
        Write-Warning "Skipping gh aw compile on native Windows (CLI hangs). Use WSL or rely on GitHub Actions."
        Write-Host "  wsl bash -lc 'cd /mnt/c/Users/dylan/Monorepo_ModMe && gh aw compile --validate'"
    } else {
        Write-Host "Compiling agentic workflows..."
        $env:GH_PAGER = 'cat'
        $env:NO_COLOR = '1'
        gh aw compile --validate
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "gh aw compile --validate failed (exit $LASTEXITCODE). Run manually after fixing workflows."
        } else {
            Write-Host "Workflows validated." -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "Next: gh aw run workflow-health --ref dev" -ForegroundColor Cyan
