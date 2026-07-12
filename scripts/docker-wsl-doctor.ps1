#Requires -Version 5.1
<#
.SYNOPSIS
  Audit WSL2 + Docker Desktop resource and backend configuration.
.DESCRIPTION
  Reports wsl status, distro versions, VHDX sizes, .wslconfig, Docker backend hints,
  mprocs availability, and optional Ubuntu/systemd checks.
.PARAMETER Json
  Emit machine-readable summary.
.PARAMETER CheckUbuntuSystemd
  Verify Ubuntu default distro and systemd in /etc/wsl.conf.
#>
param(
    [switch]$Json,
    [switch]$CheckUbuntuSystemd
)

$ErrorActionPreference = 'Continue'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
. (Join-Path $ScriptDir 'lib\wsl-distros.ps1')
$RepoRoot = Split-Path -Parent $ScriptDir

function Write-Section {
    param([string]$Title)
    if (-not $Json) {
        Write-Host ""
        Write-Host "==> $Title" -ForegroundColor Cyan
    }
}

function Get-VhdxReport {
    $paths = @(
        (Join-Path $env:LOCALAPPDATA 'Docker\wsl'),
        (Join-Path $env:LOCALAPPDATA 'Packages')
    )
    $items = @()
    foreach ($base in $paths) {
        if (-not (Test-Path $base)) { continue }
        Get-ChildItem -Path $base -Recurse -Filter '*.vhdx' -ErrorAction SilentlyContinue | ForEach-Object {
            $items += [pscustomobject]@{
                Path   = $_.FullName
                SizeGB = [math]::Round($_.Length / 1GB, 2)
            }
        }
    }
    return $items
}

function Get-WslConfigPath {
    return Join-Path $env:USERPROFILE '.wslconfig'
}

function Get-DockerSettingsPath {
    $candidates = @(
        (Join-Path $env:APPDATA 'Docker\settings-store.json'),
        (Join-Path $env:APPDATA 'Docker\settings.json')
    )
    foreach ($path in $candidates) {
        if (Test-Path $path) { return $path }
    }
    return $null
}

function Test-WslCommand {
    return [bool](Get-Command wsl -ErrorAction SilentlyContinue)
}

function Get-DockerDiskSizeMiB {
    $settingsPath = Get-DockerSettingsPath
    if (-not $settingsPath) { return $null }
    try {
        $raw = Get-Content $settingsPath -Raw | ConvertFrom-Json
        if ($raw.PSObject.Properties.Name -contains 'diskSizeMiB') {
            return [int]$raw.diskSizeMiB
        }
        if ($raw.PSObject.Properties.Name -contains 'DiskSizeMiB') {
            return [int]$raw.DiskSizeMiB
        }
    }
    catch {
        return $null
    }
    return $null
}

$report = [ordered]@{
    timestamp          = (Get-Date).ToUniversalTime().ToString('o')
    repoRoot           = $RepoRoot
    wslAvailable       = Test-WslCommand
    wslStatus          = $null
    wslDistros         = @()
    wslConfigPath      = Get-WslConfigPath
    wslConfigExists    = $false
    wslConfigContent   = $null
    dockerAvailable    = [bool](Get-Command docker -ErrorAction SilentlyContinue)
    dockerInfoHints    = @()
    dockerSettingsPath = Get-DockerSettingsPath
    dockerDiskSizeMiB  = Get-DockerDiskSizeMiB
    vhdxFiles          = @()
    devboxAvailable    = [bool](Get-Command devbox -ErrorAction SilentlyContinue)
    mprocsAvailable    = [bool](Get-Command mprocs -ErrorAction SilentlyContinue)
    gitBashAvailable   = Test-Path 'C:\Program Files\Git\bin\bash.exe'
    ubuntuBashOk       = $false
    systemdEnabled     = $null
    issues             = @()
    warnings           = @()
}

if ($report.wslAvailable) {
    $report.wslStatus = (wsl --status 2>&1 | Out-String).Trim()
    $distroLines = @(Get-WslDistroNames)
    $report.wslDistros = $distroLines
    $versionLines = @(wsl -l -v 2>&1 | ForEach-Object { ("$_" -replace "`0", '') })
    if ($versionLines -match 'VERSION 1') {
        $report.warnings += 'One or more WSL distros use VERSION 1 - migrate to WSL2.'
    }
    if (-not (Get-WslUbuntuDistro)) {
        $report.warnings += 'Ubuntu distro not listed - install for optional bash/tmux path.'
    }
}
else {
    $report.issues += 'wsl command not found.'
}

$wslConfigPath = $report.wslConfigPath
if (Test-Path $wslConfigPath) {
    $report.wslConfigExists = $true
    $report.wslConfigContent = Get-Content $wslConfigPath -Raw
    if ($report.wslConfigContent -match 'pageReporting\s*=\s*true') {
        # optional on older WSL builds
    }
}
else {
    $report.warnings += '.wslconfig not found - WSL memory is unbounded by default.'
}

$report.vhdxFiles = @(Get-VhdxReport)
$largeVhdx = @($report.vhdxFiles | Where-Object { $_.SizeGB -ge 10 })
if ($largeVhdx.Count -gt 0) {
    $report.warnings += "VHDX >= 10 GB: $($largeVhdx.Count) file(s) - consider factory reset + prune."
}

if ($report.dockerAvailable) {
    $info = docker info 2>&1 | Out-String
    $report.dockerInfoHints = @(
        ($info -split "`n" | Where-Object {
                $_ -match 'Operating System|Server Version|Storage Driver|WSL|Hyper-V|Docker Desktop'
            })
    )
    if ($info -match 'Hyper-V') {
        $report.warnings += 'Docker info mentions Hyper-V - prefer WSL2 based engine in Docker Desktop.'
    }
}
else {
    $report.warnings += 'docker not on PATH (Docker Desktop may be stopped).'
}

if ($report.dockerDiskSizeMiB -and $report.dockerDiskSizeMiB -gt 10240) {
    $report.warnings += "Docker diskSizeMiB=$($report.dockerDiskSizeMiB) exceeds 10 GB budget."
}

if ($CheckUbuntuSystemd -and $report.wslAvailable) {
    $bashCmd = "command -v bash; test -f /etc/wsl.conf; grep -q systemd=true /etc/wsl.conf; echo WSL_CONF_OK"
    $bashCheck = wsl -d Ubuntu -e bash -lc $bashCmd 2>&1
    if (($LASTEXITCODE -eq 0) -and ("$bashCheck" -match 'WSL_CONF_OK')) {
        $report.ubuntuBashOk = $true
        $systemdCmd = 'systemctl is-system-running 2>/dev/null; exit 0'
        $systemdCheck = wsl -d Ubuntu -e bash -lc $systemdCmd 2>&1
        $report.systemdEnabled = ("$systemdCheck").Trim()
    }
    else {
        $report.warnings += 'Ubuntu systemd/bash check failed - run wsl --install -d Ubuntu and enable systemd.'
    }
}

if (-not $report.devboxAvailable) {
    $report.warnings += 'devbox not on PATH - yarn test:shell falls back to Git Bash or WSL.'
}

if (-not $report.mprocsAvailable) {
    $report.warnings += 'mprocs not on PATH - yarn agent:tui uses npx --yes mprocs.'
}

if ($Json) {
    $report | ConvertTo-Json -Depth 6
    if ($report.issues.Count -gt 0) { exit 1 }
    exit 0
}

Write-Host '[docker-wsl-doctor] ModMe WSL2 + Docker audit' -ForegroundColor Green
Write-Section 'WSL status'
if ($report.wslStatus) { Write-Host $report.wslStatus }

Write-Section 'WSL distros'
$report.wslDistros | ForEach-Object { Write-Host $_ }

Write-Section 'WSL config'
Write-Host "Path: $($report.wslConfigPath) exists=$($report.wslConfigExists)"
if ($report.wslConfigExists) {
    Write-Host $report.wslConfigContent
}

Write-Section 'Docker'
Write-Host "docker on PATH: $($report.dockerAvailable)"
Write-Host "settings: $($report.dockerSettingsPath)"
if ($report.dockerDiskSizeMiB) {
    Write-Host "diskSizeMiB: $($report.dockerDiskSizeMiB)"
}
$report.dockerInfoHints | ForEach-Object { Write-Host $_ }

Write-Section 'VHDX files'
if ($report.vhdxFiles.Count -eq 0) {
    Write-Host '[i] No .vhdx files found under Docker wsl path.'
}
else {
    $report.vhdxFiles | ForEach-Object { Write-Host "$($_.SizeGB) GB  $($_.Path)" }
}

Write-Section 'Toolchain'
Write-Host "devbox: $($report.devboxAvailable)  mprocs: $($report.mprocsAvailable)  Git Bash: $($report.gitBashAvailable)"
if ($CheckUbuntuSystemd) {
    Write-Host "Ubuntu bash/systemd: $($report.ubuntuBashOk)  systemd: $($report.systemdEnabled)"
}

if ($report.warnings.Count -gt 0) {
    Write-Section 'Warnings'
    $report.warnings | ForEach-Object { Write-Warning $_ }
}

if ($report.issues.Count -gt 0) {
    Write-Section 'Issues'
    $report.issues | ForEach-Object { Write-Host ('[X] ' + $_) -ForegroundColor Red }
    exit 1
}

Write-Host '[OK] docker-wsl-doctor complete.' -ForegroundColor Green
exit 0
