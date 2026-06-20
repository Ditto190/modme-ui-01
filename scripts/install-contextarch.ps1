#Requires -Version 5.1
<#
.SYNOPSIS
  Install and verify contextarch CLI for Monorepo_ModMe.

.DESCRIPTION
  Vendors https://github.com/ksoventures/contextarch-cli and pins the npm
  package used by `yarn contextarch`. Does not overwrite existing AGENTS.md,
  .cursorrules, or copilot-instructions — run `yarn contextarch init` manually
  when bootstrapping a new package or sub-project.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$VendorRoot = Join-Path $RepoRoot '.vendor'
$VendorFolder = 'contextarch-cli-main'
$VendorPath = Join-Path $VendorRoot $VendorFolder
$Version = '0.1.0'
$ZipUrl = 'https://github.com/ksoventures/contextarch-cli/archive/refs/heads/main.zip'

function Ensure-VendorSource {
    if (Test-Path $VendorPath) {
        Write-Host "[skip] vendor exists: $VendorFolder"
        return
    }

    New-Item -ItemType Directory -Force -Path $VendorRoot | Out-Null
    $zipPath = Join-Path $VendorRoot 'contextarch-cli.zip'

    Write-Host "[download] $ZipUrl"
    Invoke-WebRequest -Uri $ZipUrl -OutFile $zipPath -UseBasicParsing
    Expand-Archive -Path $zipPath -DestinationPath $VendorRoot -Force
    Remove-Item $zipPath -Force
    Write-Host "[ok] extracted $VendorFolder"
}

function Build-VendorCli {
    $dist = Join-Path $VendorPath 'dist\index.js'
    if (Test-Path $dist) {
        Write-Host "[skip] vendor build exists"
        return
    }

    Write-Host '[build] contextarch-cli from vendor source...'
    Push-Location $VendorPath
    try {
        & npm ci
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
        & npm run build
        if ($LASTEXITCODE -ne 0) { throw 'npm run build failed' }
        if (-not (Test-Path $dist)) { throw "missing build output: $dist" }
        Write-Host '[ok] built contextarch-cli'
    }
    finally {
        Pop-Location
    }
}

function Test-ContextArchCli {
    Write-Host "[check] contextarch@$Version ..."
    Push-Location $RepoRoot
    try {
        $out = node ./scripts/run-contextarch.mjs --version 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "contextarch failed: $out"
        }
        Write-Host "[ok] contextarch $out"
    }
    finally {
        Pop-Location
    }
}

Write-Host '=== contextarch setup ===' -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot"

Ensure-VendorSource
Build-VendorCli
Test-ContextArchCli

Write-Host ''
Write-Host 'contextarch is ready.' -ForegroundColor Green
Write-Host '  yarn contextarch --help'
Write-Host '  yarn contextarch init              # interactive wizard (backs up on overwrite)'
Write-Host '  yarn contextarch init -C next-forge  # interactive wizard for a sub-project'
Write-Host '  yarn contextarch:bootstrap next-forge # non-interactive target from scripts/contextarch-targets.json'
Write-Host ''
Write-Host 'Root AGENTS.md and .cursor/rules are custom — do not run init --overwrite at repo root without review.'
