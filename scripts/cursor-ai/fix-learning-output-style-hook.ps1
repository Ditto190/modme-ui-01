#Requires -Version 5.1
<#
.SYNOPSIS
  Patch learning-output-style plugin hooks to stop Windows console/tab popups.

.DESCRIPTION
  Routes SessionStart through run-hook.cmd (superpowers pattern) instead of
  invoking session-start.sh directly. Re-apply after plugin cache refresh.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$TemplateDir = Join-Path $PSScriptRoot 'learning-output-style-hook-fix'

function Get-LearningOutputStylePluginRoots {
    $roots = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $searchRoots = @(
        (Join-Path $env:USERPROFILE '.cursor\plugins\cache'),
        (Join-Path $env:USERPROFILE '.claude\plugins\cache')
    )

    foreach ($base in $searchRoots) {
        if (-not (Test-Path $base)) { continue }
        Get-ChildItem -Path $base -Recurse -Directory -Filter 'learning-output-style' -ErrorAction SilentlyContinue |
            ForEach-Object {
                $null = $roots.Add($_.FullName)
                Get-ChildItem -Path $_.FullName -Directory -ErrorAction SilentlyContinue |
                    ForEach-Object { $null = $roots.Add($_.FullName) }
            }
    }

    return @($roots)
}

function Install-HookFix {
    param([string]$PluginRoot)

    $hooksDir = Join-Path $PluginRoot 'hooks'
    if (-not (Test-Path $hooksDir)) {
        Write-Warning "Skip (no hooks dir): $PluginRoot"
        return $false
    }

    New-Item -ItemType Directory -Force -Path $hooksDir | Out-Null

    Copy-Item -Path (Join-Path $TemplateDir 'run-hook.cmd') -Destination (Join-Path $hooksDir 'run-hook.cmd') -Force
    Copy-Item -Path (Join-Path $TemplateDir 'session-start') -Destination (Join-Path $hooksDir 'session-start') -Force
    Copy-Item -Path (Join-Path $TemplateDir 'hooks.json') -Destination (Join-Path $hooksDir 'hooks.json') -Force
    Copy-Item -Path (Join-Path $TemplateDir 'hooks-cursor.json') -Destination (Join-Path $hooksDir 'hooks-cursor.json') -Force

    # Normalize LF for bash scripts (avoids ShellCheck CRLF noise if file is opened)
    foreach ($name in @('run-hook.cmd', 'session-start')) {
        $path = Join-Path $hooksDir $name
        $text = [IO.File]::ReadAllText($path) -replace "`r`n", "`n"
        [IO.File]::WriteAllText($path, $text)
    }

    Write-Host "[patched] $PluginRoot"
    return $true
}

function Test-HookFix {
    param([string]$PluginRoot)

    $hooksDir = Join-Path $PluginRoot 'hooks'
    $cmd = Join-Path $hooksDir 'run-hook.cmd'
    if (-not (Test-Path $cmd)) { return $false }

    $bash = 'C:\Program Files\Git\bin\bash.exe'
    if (-not (Test-Path $bash)) { return $true }

    $env:CURSOR_PLUGIN_ROOT = $PluginRoot
    $output = & cmd /c "`"$cmd`" session-start" 2>&1
    if ($LASTEXITCODE -ne 0) { return $false }
    return ($output -match 'additional_context|additionalContext')
}

$patched = 0
$validated = 0
foreach ($root in Get-LearningOutputStylePluginRoots) {
    if (Install-HookFix -PluginRoot $root) {
        $patched++
        if (Test-HookFix -PluginRoot $root) { $validated++ }
    }
}

if ($patched -eq 0) {
    Write-Warning 'No learning-output-style plugin caches found to patch.'
    exit 1
}

Write-Host "Patched $patched install(s); validated $validated hook output(s)."
Write-Host 'Reload Cursor (Developer: Reload Window) to pick up hook changes.'
