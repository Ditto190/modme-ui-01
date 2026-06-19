#Requires -Version 5.1
<#
.SYNOPSIS
  Report contextarch-generated AI context files for configured targets.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$TargetsPath = Join-Path $RepoRoot 'scripts\contextarch-targets.json'
$Targets = Get-Content $TargetsPath -Raw | ConvertFrom-Json

$ExpectedFiles = @(
    '.cursorrules',
    'AGENTS.md',
    'CLAUDE.md',
    '.github\copilot-instructions.md'
)

Write-Host '=== contextarch verify ===' -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot"
Write-Host ''

$cliBuilt = Test-Path (Join-Path $RepoRoot '.vendor\contextarch-cli-main\dist\write-target.js')
if ($cliBuilt) {
    Write-Host '[ok] vendored CLI built' -ForegroundColor Green
} else {
    Write-Host '[missing] run: yarn contextarch:install' -ForegroundColor Yellow
}

foreach ($name in $Targets.PSObject.Properties.Name) {
    $target = $Targets.$name
    $targetRoot = Join-Path $RepoRoot $target.cwd
    Write-Host "Target: $name ($($target.cwd))" -ForegroundColor Cyan

    if (-not (Test-Path $targetRoot)) {
        Write-Host '  [error] target directory missing' -ForegroundColor Red
        continue
    }

    $present = 0
    foreach ($rel in $ExpectedFiles) {
        $abs = Join-Path $targetRoot $rel
        if (Test-Path $abs) {
            $item = Get-Item $abs
            Write-Host ("  [ok] {0} ({1} bytes, {2})" -f $rel, $item.Length, $item.LastWriteTime.ToString('yyyy-MM-dd HH:mm')) -ForegroundColor Green
            $present++
        } else {
            Write-Host "  [missing] $rel" -ForegroundColor Yellow
        }
    }

    if ($present -eq $ExpectedFiles.Count) {
        Write-Host '  => all 4 context files present on disk' -ForegroundColor Green
    } else {
        Write-Host ("  => {0}/{1} files present - run: yarn contextarch:bootstrap {2}" -f $present, $ExpectedFiles.Count, $name) -ForegroundColor Yellow
    }
    Write-Host ''
}

Write-Host 'Tip: pass --overwrite to bootstrap or init to replace existing files.' -ForegroundColor DarkGray
