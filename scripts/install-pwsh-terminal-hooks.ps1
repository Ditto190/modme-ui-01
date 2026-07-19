#Requires -Version 5.1
<#
.SYNOPSIS
  Patch PowerShell profiles: safe direnv hook, Cursor/VS Code shell integration, Devbox guard.
.DESCRIPTION
  Idempotent markers in CurrentUser profiles for both Windows PowerShell 5.1 and pwsh 7+.
  Covers OneDrive-redirected Documents paths. Run from repo root after clone or when
  `devbox` / direnv / shell-integration errors appear in the integrated terminal.

  Jetify Devbox is optional and WSL-only on this machine. The profile guard prevents
  CommandNotFoundException when agents or humans type `devbox shell` in Windows PowerShell.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-HostProfilePath {
  param(
    [ValidateSet('pwsh', 'powershell')]
    [string]$HostName
  )
  if ($HostName -eq 'pwsh') {
    if (-not (Get-Command pwsh -ErrorAction SilentlyContinue)) { return $null }
    return (pwsh -NoProfile -Command 'Write-Output $PROFILE.CurrentUserCurrentHost').Trim()
  }
  if (-not (Get-Command powershell.exe -ErrorAction SilentlyContinue)) { return $null }
  return (powershell.exe -NoProfile -Command 'Write-Output $PROFILE.CurrentUserCurrentHost').Trim()
}

function Get-ModMeProfilePaths {
  $paths = New-Object System.Collections.Generic.List[string]
  foreach ($hostName in @('pwsh', 'powershell')) {
    $resolved = Get-HostProfilePath -HostName $hostName
    if ($resolved) { [void]$paths.Add($resolved) }
  }
  $relatives = @(
    'Documents\PowerShell\Microsoft.PowerShell_profile.ps1',
    'Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1',
    'OneDrive\Documents\PowerShell\Microsoft.PowerShell_profile.ps1',
    'OneDrive\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1'
  )
  foreach ($rel in $relatives) {
    [void]$paths.Add((Join-Path $env:USERPROFILE $rel))
  }
  return @($paths | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)
}

function Backup-ModMeProfile {
  param([string]$ProfilePath)
  if (-not (Test-Path -LiteralPath $ProfilePath)) { return }
  $bak = "$ProfilePath.modme.bak"
  Copy-Item -LiteralPath $ProfilePath -Destination $bak -Force
  Write-Host "[ok] backup -> $bak"
}

$markerStart = '# >>> Monorepo_ModMe terminal hooks >>>'
$markerEnd = '# <<< Monorepo_ModMe terminal hooks <<<'

$hookBlock = @"
$markerStart
# Managed by scripts/install-pwsh-terminal-hooks.ps1 - safe direnv + editor shell integration + Devbox guard

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
# direnv/.envrc is for WSL/Git Bash/devcontainer - not native Windows (use yarn session:start).
`$enableDirenv = (`$env:MODME_ENABLE_DIRENV -eq '1') -or (`$env:WSL_DISTRO_NAME) -or (`$IsLinux -eq `$true)
if (`$enableDirenv -and `$PSVersionTable.PSVersion.Major -ge 7 -and (Get-Command direnv -ErrorAction SilentlyContinue)) {
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

# ModMe soft-attach: KM / agent plane health (fail-open; never creates beads/mprocs)
function Invoke-ModMeTerminalAttach {
  if (`$env:MODME_TERMINAL_ATTACHED -eq '1') { return }
  if (`$env:MODME_SKIP_TERMINAL_ATTACH -eq '1') { return }
  `$candidates = @()
  if (`$env:MODME_REPO_ROOT) { `$candidates += `$env:MODME_REPO_ROOT }
  `$cwd = (Get-Location).Path
  `$dir = `$cwd
  if (-not [string]::IsNullOrWhiteSpace(`$dir)) {
    for (`$i = 0; `$i -lt 24; `$i++) {
      if ([string]::IsNullOrWhiteSpace(`$dir)) { break }
      if ((Test-Path (Join-Path `$dir 'scripts\modme-terminal-attach.ps1'))) {
        `$candidates += `$dir
        break
      }
      `$parent = Split-Path -Parent `$dir
      if ([string]::IsNullOrWhiteSpace(`$parent) -or `$parent -eq `$dir) { break }
      `$dir = `$parent
    }
  }
  `$candidates += 'D:\Github_Projects\Monorepo_ModMe'
  foreach (`$root in `$candidates) {
    if ([string]::IsNullOrWhiteSpace(`$root)) { continue }
    `$attach = Join-Path `$root 'scripts\modme-terminal-attach.ps1'
    if (Test-Path -LiteralPath `$attach) {
      try {
        & `$attach
        `$env:MODME_TERMINAL_ATTACHED = '1'
      }
      catch { }
      return
    }
  }
}
Invoke-ModMeTerminalAttach

# Jetify Devbox is WSL-only for ModMe. Guard prevents CommandNotFoundException on Windows.
function global:Invoke-ModMeDevboxGuard {
  [CmdletBinding()]
  param(
    [Parameter(ValueFromRemainingArguments = `$true)]
    [object[]]`$DevboxArgs
  )

  `$native = Get-Command -Name devbox -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if (`$native) {
    if (`$null -eq `$DevboxArgs -or `$DevboxArgs.Count -eq 0) {
      & `$native.Source
    }
    else {
      & `$native.Source @DevboxArgs
    }
    return
  }

  Write-Host '[!] Jetify Devbox is not on Windows PATH (expected for ModMe).' -ForegroundColor Yellow
  Write-Host '[i] Prefer Windows yarn/agent tooling:' -ForegroundColor Cyan
  Write-Host '    yarn session:start' -ForegroundColor Gray
  Write-Host '    yarn agent:status' -ForegroundColor Gray
  Write-Host '    yarn test:shell' -ForegroundColor Gray
  Write-Host '[i] For a real Devbox shell, use WSL modme-agent:' -ForegroundColor Cyan
  Write-Host '    wsl -d Ubuntu -u modme-agent' -ForegroundColor Gray
  Write-Host '    cd /mnt/d/Github_Projects/Monorepo_ModMe' -ForegroundColor Gray
  Write-Host '    devbox shell' -ForegroundColor Gray
  Write-Host '[i] Optional WSL proxy: `$env:MODME_DEVBOX_WSL_PROXY = ''1''' -ForegroundColor DarkGray

  if (`$env:MODME_DEVBOX_WSL_PROXY -ne '1') { return }

  `$repo = if (`$env:MODME_REPO_ROOT) { `$env:MODME_REPO_ROOT } else { 'D:\Github_Projects\Monorepo_ModMe' }
  if (`$repo -match '^[A-Za-z]:') {
    `$drive = `$repo.Substring(0, 1).ToLowerInvariant()
    `$unix = '/mnt/' + `$drive + (`$repo.Substring(2) -replace '\\', '/')
  }
  else {
    `$unix = `$repo -replace '\\', '/'
  }
  `$argText = if (`$null -eq `$DevboxArgs -or `$DevboxArgs.Count -eq 0) { 'shell' } else { (`$DevboxArgs | ForEach-Object { `$_.ToString() }) -join ' ' }
  `$bash = "cd '`$unix' && /home/modme-agent/.local/bin/devbox `$argText"
  & wsl.exe -d Ubuntu -u modme-agent -- bash -lc `$bash
}

if (-not (Get-Command -Name devbox -CommandType Application -ErrorAction SilentlyContinue)) {
  Set-Item -Path 'Function:global:devbox' -Value `${function:Invoke-ModMeDevboxGuard}
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
# Uses conda-hook.ps1 (module only) - avoids broken "conda activate base" on pwsh 7.6 + conda 23.x
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

  Backup-ModMeProfile -ProfilePath $ProfilePath

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

$profilePaths = Get-ModMeProfilePaths
Write-Host '[i] Patching PowerShell profiles:' -ForegroundColor Cyan
foreach ($profilePath in $profilePaths) {
  Write-Host "    $profilePath"
  Set-ProfileHookBlock $profilePath

  $allHostsProfile = Join-Path (Split-Path $profilePath -Parent) 'profile.ps1'
  if (Test-Path $allHostsProfile) {
    Set-CondaProfileBlock $allHostsProfile
  }
}

Write-Host ''
Write-Host 'Restart the integrated terminal (or open a new one). Verify with:'
Write-Host '  powershell -NoLogo -Command "devbox shell"'
Write-Host '  pwsh -NoLogo -Command "devbox shell"'
Write-Host 'Expect a ModMe guard message (not CommandNotFoundException).'
Write-Host 'Native Windows PATH still has no Jetify Devbox; use yarn:* or WSL modme-agent.'
