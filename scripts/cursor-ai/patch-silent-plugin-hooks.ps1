#Requires -Version 5.1
<#
.SYNOPSIS
  Reapply Windows-safe silent SessionStart hooks for Cursor plugins.

.DESCRIPTION
  Plugin cache updates can restore broken hook commands that open .sh files in
  the Windows "Pick an app" dialog instead of executing them. This script patches
  superpowers and learning-output-style to route through run-hook.cmd.

  Run after plugin updates or when SessionStart hooks flash dialogs again:
    .\scripts\cursor-ai\patch-silent-plugin-hooks.ps1
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Find-PluginCacheRoot {
    param(
        [Parameter(Mandatory)]
        [string[]] $RelativeParts
    )

    $cursorRoot = Join-Path $env:USERPROFILE '.cursor'
    $base = Join-Path $cursorRoot 'plugins\cache'
    $path = $base
    foreach ($part in $RelativeParts) {
        $path = Join-Path $path $part
    }

    if (-not (Test-Path $path)) {
        throw "Plugin cache not found: $path"
    }

    $matches = Get-ChildItem -Path $path -Directory -ErrorAction SilentlyContinue
    if ($matches.Count -eq 0) {
        throw "No version directory under: $path"
    }

    return ($matches | Sort-Object Name -Descending | Select-Object -First 1).FullName
}

function Set-JsonFile {
    param(
        [Parameter(Mandatory)]
        [string] $Path,
        [Parameter(Mandatory)]
        [hashtable] $Content
    )

    $json = $Content | ConvertTo-Json -Depth 10
    Set-Content -Path $Path -Value $json -Encoding utf8NoBOM
    Write-Host "[ok] $Path"
}

$runHookCmd = @'
: << 'CMDBLOCK'
@echo off
REM Cross-platform polyglot wrapper for hook scripts (Windows-safe, no .sh picker).
REM Usage: run-hook.cmd <script-name> [args...]

if "%~1"=="" (
    echo run-hook.cmd: missing script name >&2
    exit /b 1
)

set "HOOK_DIR=%~dp0"

if exist "C:\Program Files\Git\bin\bash.exe" (
    "C:\Program Files\Git\bin\bash.exe" "%HOOK_DIR%%~1" %2 %3 %4 %5 %6 %7 %8 %9
    exit /b %ERRORLEVEL%
)
if exist "C:\Program Files (x86)\Git\bin\bash.exe" (
    "C:\Program Files (x86)\Git\bin\bash.exe" "%HOOK_DIR%%~1" %2 %3 %4 %5 %6 %7 %8 %9
    exit /b %ERRORLEVEL%
)

where bash >nul 2>nul
if %ERRORLEVEL% equ 0 (
    bash "%HOOK_DIR%%~1" %2 %3 %4 %5 %6 %7 %8 %9
    exit /b %ERRORLEVEL%
)

exit /b 0
CMDBLOCK

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_NAME="$1"
shift
exec bash "${SCRIPT_DIR}/${SCRIPT_NAME}" "$@"
'@

Write-Host 'Patching superpowers SessionStart hook...' -ForegroundColor Cyan
$superpowersRoot = Find-PluginCacheRoot @('cursor-public', 'superpowers')
$superpowersHooksCursor = Join-Path $superpowersRoot 'hooks\hooks-cursor.json'
if (-not (Test-Path $superpowersHooksCursor)) {
    throw "Missing superpowers hooks-cursor.json: $superpowersHooksCursor"
}

Set-JsonFile -Path $superpowersHooksCursor -Content @{
    version = 1
    hooks   = @{
        sessionStart = @(
            @{
                command = './hooks/run-hook.cmd session-start'
            }
        )
    }
}

Write-Host 'Patching learning-output-style SessionStart hook...' -ForegroundColor Cyan
$learningRoot = Find-PluginCacheRoot @('claude-code-plugins', 'learning-output-style')
$handlersDir = Join-Path $learningRoot 'hooks-handlers'
$runHookPath = Join-Path $handlersDir 'run-hook.cmd'
Set-Content -Path $runHookPath -Value $runHookCmd -Encoding ascii
Write-Host "[ok] $runHookPath"

$learningHooks = Join-Path $learningRoot 'hooks\hooks.json'
Set-JsonFile -Path $learningHooks -Content @{
    description = 'Learning mode hook that adds interactive learning instructions'
    hooks       = @{
        SessionStart = @(
            @{
                hooks = @(
                    @{
                        type    = 'command'
                        command = '"${CLAUDE_PLUGIN_ROOT}/hooks-handlers/run-hook.cmd" session-start.sh'
                    }
                )
            }
        )
    }
}

$learningHooksCursor = Join-Path $learningRoot 'hooks\hooks-cursor.json'
Set-JsonFile -Path $learningHooksCursor -Content @{
    version = 1
    hooks   = @{
        sessionStart = @(
            @{
                command = './hooks-handlers/run-hook.cmd session-start.sh'
            }
        )
    }
}

Write-Host ''
Write-Host 'Done. Restart Cursor (or start a new agent session) for hooks to reload.' -ForegroundColor Green
