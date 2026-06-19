#Requires -Version 5.1
<#
.SYNOPSIS
  Patch PowerShell profile: safe direnv hook, Cursor/VS Code shell integration, oh-my-posh guard.
.DESCRIPTION
  Idempotent markers in $PROFILE (pwsh). Run from repo root after clone or when terminal shows
  profile errors (code not found, Invoke-Expression direnv, shell integration).
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-PwshProfilePath {
  if (Get-Command pwsh -ErrorAction SilentlyContinue) {
    return (pwsh -NoProfile -Command 'Write-Output $PROFILE').Trim()
  }
  return $PROFILE
}

$markerStart = '# >>> Monorepo_ModMe terminal hooks >>>'
$markerEnd = '# <<< Monorepo_ModMe terminal hooks <<<'

$hookBlock = @"
$markerStart
# Managed by scripts/install-pwsh-terminal-hooks.ps1 — safe direnv + editor shell integration

function Import-EditorShellIntegration {
  if (`$env:__EditorShellIntegrationImported) { return }
  # Cursor/VS Code already inject shell integration when VSCODE_INJECTION=1; skip to avoid crash (0xC00000FD).
  if (`$env:VSCODE_INJECTION -eq '1') { return }
  `$env:__EditorShellIntegrationImported = "1"
  if (`$env:TERM_PROGRAM -notin @('vscode', 'cursor')) { return }
  `$editors = @(
    @{ Name = 'cursor'; Path = "`$env:LOCALAPPDATA\Programs\cursor\resources\app\bin\cursor.cmd" },
    @{ Name = 'code';  Path = "`$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\code.cmd" }
  )
  foreach (`$ed in `$editors) {
    `$exe = `$null
    if (Get-Command `$ed.Name -ErrorAction SilentlyContinue) {
      `$exe = (Get-Command `$ed.Name).Source
    }
    elseif (Test-Path -LiteralPath `$ed.Path) { `$exe = `$ed.Path }
    if (-not `$exe) { continue }
    try {
      `$integration = & `$exe --locate-shell-integration-path pwsh 2>`$null
      if (`$integration -and (Test-Path -LiteralPath `$integration)) {
        . `$integration
        return
      }
    }
    catch { }
  }
}
Import-EditorShellIntegration

if (-not `$env:HOME) { `$env:HOME = `$env:USERPROFILE }
`$direnvRoot = Join-Path `$env:USERPROFILE '.direnv'
`$env:DIRENV_CONFIG = Join-Path `$direnvRoot 'config'
`$env:XDG_CACHE_HOME = Join-Path `$direnvRoot 'cache'
`$env:XDG_DATA_HOME = Join-Path `$direnvRoot 'data'
foreach (`$dir in @(`$env:DIRENV_CONFIG, `$env:XDG_CACHE_HOME, `$env:XDG_DATA_HOME)) {
  if (-not (Test-Path `$dir)) { New-Item -ItemType Directory -Force -Path `$dir | Out-Null }
}
`$wingetDirenvDir = Join-Path `$env:LOCALAPPDATA 'Microsoft\WinGet\Packages\direnv.direnv_Microsoft.Winget.Source_8wekyb3d8bbwe'
if (Test-Path `$wingetDirenvDir) {
  `$env:Path = "`$wingetDirenvDir;`$env:Path"
}
if (`$PSVersionTable.PSVersion.Major -ge 7 -and (Get-Command direnv -ErrorAction SilentlyContinue)) {
  try {
    `$direnvHook = (direnv hook pwsh 2>`$null | Out-String).Trim()
    if (`$direnvHook) {
      `$original = 'Invoke-Expression -Command `$export;'
      `$replacement = '`$filteredExport = (`$export -split "``r?``n" | Where-Object { `$_ -notmatch "Remove-Item -LiteralPath ''env:/(SystemRoot|SystemDrive|ComSpec|windir|ProgramFiles|CommonProgramFiles)''" }) -join "``n"; if (`$filteredExport) { Invoke-Expression -Command `$filteredExport }'
      `$direnvHook = `$direnvHook.Replace(`$original, `$replacement)
      Invoke-Expression `$direnvHook
    }
  }
  catch {
    Write-Warning "direnv hook skipped: `$_"
  }
}
$markerEnd
"@

function Set-CondaProfileBlock {
  param([string]$ProfilePath)
  if (-not (Test-Path $ProfilePath)) { return }

  $condaExe = Join-Path $env:USERPROFILE 'miniconda3\Scripts\conda.exe'
  if (-not (Test-Path $condaExe)) {
    $condaExe = Join-Path $env:USERPROFILE 'anaconda3\Scripts\conda.exe'
  }
  if (-not (Test-Path $condaExe)) { return }

  $condaHookScript = Join-Path (Split-Path $condaExe -Parent) '..\shell\condabin\conda-hook.ps1' | Resolve-Path -ErrorAction SilentlyContinue
  if (-not $condaHookScript) {
    $root = Split-Path (Split-Path $condaExe -Parent) -Parent
    $condaHookScript = Join-Path $root 'shell\condabin\conda-hook.ps1'
  }

  $safeCondaBlock = @"

#region conda initialize
# !! Contents within this block are managed by conda / install-pwsh-terminal-hooks.ps1 !!
# Uses conda-hook.ps1 (module only) — avoids broken "conda activate base" on pwsh 7.6 + conda 23.x
If (Test-Path "$condaHookScript") {
    . "$condaHookScript"
}
#endregion

"@

  $content = Get-Content -Path $ProfilePath -Raw -ErrorAction SilentlyContinue
  if ($null -eq $content) { $content = '' }

  if ($content -match '(?s)#region conda initialize.*?#endregion') {
    $content = [regex]::Replace($content, '(?s)#region conda initialize.*?#endregion', $safeCondaBlock.TrimEnd())
    Set-Content -Path $ProfilePath -Value $content -Encoding UTF8
    Write-Host "[ok] patched safe conda hook in $ProfilePath"
  }
}

function Set-ProfileHookBlock {
  param([string]$ProfilePath)
  $dir = Split-Path $ProfilePath -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  if (-not (Test-Path $ProfilePath)) { New-Item -ItemType File -Force -Path $ProfilePath | Out-Null }

  $content = Get-Content -Path $ProfilePath -Raw -ErrorAction SilentlyContinue
  if ($null -eq $content) { $content = '' }

  # Remove legacy broken blocks
  $legacyPatterns = @(
    '(?s)# VS Code shell integration.*?\r?\nif \(\$env:TERM_PROGRAM -eq "vscode"\).*?\r?\n',
    '(?s)# >>> direnv hook >>>.*?# <<< direnv hook <<<\r?\n?'
  )
  foreach ($pat in $legacyPatterns) {
    $content = [regex]::Replace($content, $pat, '')
  }

  if ($content -match [regex]::Escape($markerStart)) {
    $pattern = "(?s)$([regex]::Escape($markerStart)).*?$([regex]::Escape($markerEnd))"
    $safeHookBlock = $hookBlock.Replace('$', '$$')
    $content = [regex]::Replace($content, $pattern, $safeHookBlock.TrimEnd())
    Write-Host "[ok] updated Monorepo_ModMe terminal hooks in $ProfilePath"
  }
  else {
    if ($content.Length -gt 0 -and -not $content.EndsWith("`n")) { $content += "`n" }
    $content += "`n$hookBlock`n"
    Write-Host "[ok] appended Monorepo_ModMe terminal hooks to $ProfilePath"
  }
  Set-Content -Path $ProfilePath -Value $content -Encoding UTF8
}

$pwshProfile = Get-PwshProfilePath
Set-ProfileHookBlock $pwshProfile

# CurrentUserAllHosts — conda init lives here and loads BEFORE Microsoft.PowerShell_profile.ps1
$allHostsProfile = Join-Path (Split-Path $pwshProfile -Parent) 'profile.ps1'
if (Test-Path $allHostsProfile) {
  Set-CondaProfileBlock $allHostsProfile
}

# Also patch Documents profile if different (OneDrive sync path)
$docsProfile = Join-Path $env:USERPROFILE 'Documents\PowerShell\Microsoft.PowerShell_profile.ps1'
if ((Test-Path $docsProfile) -and ($docsProfile -ne $pwshProfile)) {
  Set-ProfileHookBlock $docsProfile
}

$docsAllHosts = Join-Path $env:USERPROFILE 'Documents\PowerShell\profile.ps1'
if ((Test-Path $docsAllHosts) -and ($docsAllHosts -ne $allHostsProfile)) {
  Set-CondaProfileBlock $docsAllHosts
}

Write-Host ''
Write-Host 'Restart pwsh or open a new terminal. Verify with:'
Write-Host '  pwsh -NoLogo -Command "Write-Host ok; `$PSVersionTable.PSVersion"'
