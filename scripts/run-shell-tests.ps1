#Requires -Version 5.1
<#
.SYNOPSIS
  Run ModMe bats shell tests without requiring bare /bin/bash on Windows PATH.
.DESCRIPTION
  Priority: devbox -> Git Bash -> WSL Ubuntu -> advisory skip.
.PARAMETER Advisory
  Exit 0 with warning when no runner is available (launch:health).
.PARAMETER Strict
  Exit 1 when tests fail or no runner is available.
#>
param(
    [switch]$Advisory,
    [switch]$Strict
)

$ErrorActionPreference = 'Continue'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
. (Join-Path $ScriptDir 'lib\wsl-distros.ps1')
$RepoRoot = Split-Path -Parent $ScriptDir
$BatsDir = Join-Path $RepoRoot 'scripts\bats'

function Write-RunnerLog {
    param([string]$Message)
    Write-Host "[run-shell-tests] $Message" -ForegroundColor Cyan
}

function Invoke-DevboxBats {
    $devbox = Get-Command devbox -ErrorAction SilentlyContinue
    if (-not $devbox) { return $false }

    Write-RunnerLog 'using devbox'
    Push-Location $RepoRoot
    try {
        & devbox run -- bats $BatsDir
        return ($LASTEXITCODE -eq 0)
    }
    finally {
        Pop-Location
    }
}

function Invoke-GitBashBats {
    $gitBash = 'C:\Program Files\Git\bin\bash.exe'
    if (-not (Test-Path $gitBash)) { return $false }

    $posixRoot = ($RepoRoot -replace '\\', '/')
    if ($posixRoot -match '^([A-Za-z]):(.*)$') {
        $drive = $Matches[1].ToLower()
        $posixRoot = "/$drive$($Matches[2])"
    }
    $cmd = "cd '$posixRoot' && bats scripts/bats/"

    Write-RunnerLog 'using Git Bash'
    & $gitBash -lc $cmd
    return ($LASTEXITCODE -eq 0)
}

function Invoke-WslUbuntuBats {
    if (-not (Get-Command wsl -ErrorAction SilentlyContinue)) { return $false }

    $ubuntuList = @(Get-WslUbuntuDistro)
    if ($ubuntuList.Count -eq 0) { return $false }
    $ubuntu = $ubuntuList[0]

    $winPath = $RepoRoot
    $wslPath = $winPath
    if ($winPath -match '^([A-Za-z]):\\(.*)$') {
        $wslPath = "/mnt/$($Matches[1].ToLower())/$($Matches[2] -replace '\\', '/')"
    }
    $cmd = "cd '$wslPath' && bats scripts/bats/"

    Write-RunnerLog "using WSL distro $ubuntu"
    & wsl -d $ubuntu -- bash -lc $cmd
    return ($LASTEXITCODE -eq 0)
}

Set-Location $RepoRoot

$runners = @(
    { Invoke-DevboxBats },
    { Invoke-GitBashBats },
    { Invoke-WslUbuntuBats }
)

foreach ($runner in $runners) {
    $ok = & $runner
    if ($ok) {
        Write-Host '[OK] shell tests passed.' -ForegroundColor Green
        exit 0
    }
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        Write-Warning 'shell tests failed.'
        if ($Strict) { exit 1 }
        exit 1
    }
}

$message = 'No shell test runner available (install devbox, Git Bash, or Ubuntu WSL).'
if ($Advisory) {
    Write-Warning $message
    exit 0
}

Write-Warning $message
if ($Strict) { exit 1 }
exit 1
