#Requires -Version 5.1
<#
.SYNOPSIS
  Run sanjeed5/awesome-cursor-rules-mdc generator to create new MDC rule files.

  Prerequisites: uv, EXA_API_KEY, GEMINI_API_KEY (see .vendor/.../.env.example)
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$GeneratorRoot = Join-Path $RepoRoot '.vendor\awesome-cursor-rules-mdc-main'

if (-not (Test-Path $GeneratorRoot)) {
    throw "Vendor not found. Run scripts/cursor-ai/setup.ps1 first."
}

Push-Location $GeneratorRoot
try {
    if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
        throw 'uv is required. Install: https://github.com/astral-sh/uv'
    }
    if (-not (Test-Path '.env')) {
        Write-Warning 'Copy .env.example to .env and set EXA_API_KEY + GEMINI_API_KEY before generating.'
    }
    uv sync
    $args = @('run', 'src/generate_mdc_files.py') + $args
    & uv @args
    Write-Host ''
    Write-Host 'Generated rules are in .vendor/awesome-cursor-rules-mdc-main/rules-mdc/'
    Write-Host 'Re-run setup.ps1 to copy new rules into .cursor/rules/'
} finally {
    Pop-Location
}
