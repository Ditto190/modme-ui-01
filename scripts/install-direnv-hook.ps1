#Requires -Version 5.1
<#
.SYNOPSIS
  Permanently hook direnv into PowerShell (requires PowerShell 7.2+ for auto-load).
.DESCRIPTION
  Installs Microsoft.PowerShell (pwsh) via winget if missing, then hooks direnv.
  Windows PowerShell 5.1 is left unchanged (direnv hook is skipped there).
  See https://direnv.net/docs/hook.html
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Install-PowerShell7IfMissing {
    if (Get-Command pwsh -ErrorAction SilentlyContinue) {
        Write-Host "[ok] pwsh already installed: $(pwsh -NoProfile -Command '$PSVersionTable.PSVersion.ToString()')"
        return
    }
    Write-Host '[run] Installing Microsoft.PowerShell 7 via winget...'
    winget install --id Microsoft.PowerShell -e --source winget --accept-package-agreements --accept-source-agreements
    if (-not (Get-Command pwsh -ErrorAction SilentlyContinue)) {
        throw 'pwsh not found after winget install — open a new terminal and re-run this script'
    }
}

function Set-DirenvHookBlock($profilePath) {
    $markerStart = '# >>> direnv hook >>>'
    $markerEnd = '# <<< direnv hook <<<'
    $hookBlock = @"
$markerStart
# direnv — https://direnv.net/docs/hook.html (requires PowerShell 7.2+)
`$wingetDirenvDir = Join-Path `$env:LOCALAPPDATA 'Microsoft\WinGet\Packages\direnv.direnv_Microsoft.Winget.Source_8wekyb3d8bbwe'
if (Test-Path `$wingetDirenvDir) {
    `$env:Path = "`$wingetDirenvDir;`$env:Path"
}
if (`$PSVersionTable.PSVersion.Major -ge 7 -and (Get-Command direnv -ErrorAction SilentlyContinue)) {
    try {
        `$direnvHook = (direnv hook pwsh 2>`$null | Out-String).Trim()
        if (`$direnvHook) { Invoke-Expression `$direnvHook }
    }
    catch {
        Write-Warning "direnv hook skipped: `$_"
    }
}
$markerEnd
"@

    $content = Get-Content -Path $profilePath -Raw -ErrorAction SilentlyContinue
    if ($null -eq $content) { $content = '' }

    if ($content -match [regex]::Escape($markerStart)) {
        $pattern = "(?s)$([regex]::Escape($markerStart)).*?$([regex]::Escape($markerEnd))"
        $content = [regex]::Replace($content, $pattern, $hookBlock.TrimEnd())
        Write-Host '[ok] updated direnv hook block'
    } else {
        if ($content.Length -gt 0 -and -not $content.EndsWith("`n")) { $content += "`n" }
        $content += "`n$hookBlock`n"
        Write-Host '[ok] appended direnv hook block'
    }
    Set-Content -Path $profilePath -Value $content -Encoding UTF8
}

Install-PowerShell7IfMissing

$wingetDirenvDir = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\direnv.direnv_Microsoft.Winget.Source_8wekyb3d8bbwe'
if (-not (Get-Command direnv -ErrorAction SilentlyContinue)) {
    Write-Host '[run] Installing direnv via winget...'
    winget install --id direnv.direnv -e --source winget --accept-package-agreements --accept-source-agreements
}
if (Test-Path $wingetDirenvDir) {
    $env:Path = "$wingetDirenvDir;$env:Path"
}

# Windows PowerShell 5.1 profile (skip hook — direnv requires PS 7.2+)
$ps51Profile = $PROFILE
$ps51Dir = Split-Path $ps51Profile -Parent
if (-not (Test-Path $ps51Dir)) { New-Item -ItemType Directory -Force -Path $ps51Dir | Out-Null }
if (-not (Test-Path $ps51Profile)) { New-Item -ItemType File -Force -Path $ps51Profile | Out-Null }
Set-DirenvHookBlock $ps51Profile

# PowerShell 7 profile (active hook)
$pwshProfile = pwsh -NoProfile -Command 'Write-Output $PROFILE'
$pwshDir = Split-Path $pwshProfile -Parent
if (-not (Test-Path $pwshDir)) { New-Item -ItemType Directory -Force -Path $pwshDir | Out-Null }
if (-not (Test-Path $pwshProfile)) { New-Item -ItemType File -Force -Path $pwshProfile | Out-Null }
Set-DirenvHookBlock $pwshProfile

Write-Host "[ok] direnv: $(direnv version)"
Write-Host "[ok] ps51 profile (hook guarded): $ps51Profile"
Write-Host "[ok] pwsh profile (hook active):  $pwshProfile"
Write-Host ''
Write-Host 'Next steps:'
Write-Host '  1. Open a **PowerShell 7** terminal (pwsh) or restart Cursor default terminal to pwsh'
Write-Host '  2. cd to repo root and run: direnv allow'
Write-Host '  3. cd into Monorepo_ModMe — .env loads automatically from .envrc'
