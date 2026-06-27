#Requires -Version 5.1
<#
.SYNOPSIS
  Generate Bugbot MDC rules from .cursor/bugbot/mdc-manifest.json via awesome-cursor-rules-mdc.

  Prerequisites: uv, EXA_API_KEY, GEMINI_API_KEY (see .vendor/.../.env.example)
  After generation: re-run scripts/cursor-ai/setup.ps1 to copy rules into .cursor/rules/
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ManifestPath = Join-Path $RepoRoot '.cursor\bugbot\mdc-manifest.json'
$GeneratorScript = Join-Path $PSScriptRoot 'generate-mdc-rules.ps1'

if (-not (Test-Path $ManifestPath)) {
    throw "Manifest not found: $ManifestPath"
}

$entries = Get-Content $ManifestPath -Raw | ConvertFrom-Json

Write-Host "[bugbot-mdc] $($entries.Count) manifest entries" -ForegroundColor Cyan

foreach ($entry in $entries) {
    $name = $entry.name
    $desc = $entry.description
    $libs = ($entry.libraries -join ', ')
    Write-Host "  -> $name ($libs)" -ForegroundColor DarkGray

    # awesome-cursor-rules-mdc CLI: pass library names as positional args
    $genArgs = @()
    if ($entry.libraries) {
        $genArgs += @($entry.libraries)
    }
    if ($genArgs.Count -gt 0) {
        & $GeneratorScript @genArgs
    } else {
        Write-Warning "Skipping $name — no libraries; add hand-written .cursor/rules/${name}.mdc from REVIEW-RUBRIC.md"
    }
}

Write-Host ''
Write-Host 'Manual rules: copy sections from .cursor/bugbot/REVIEW-RUBRIC.md for entries without libraries.' -ForegroundColor Yellow
Write-Host 'Install: .\scripts\cursor-ai\setup.ps1' -ForegroundColor Green
