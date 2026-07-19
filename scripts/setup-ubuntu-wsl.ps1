#Requires -Version 5.1
<#
.SYNOPSIS
  Install Ubuntu WSL2, enable systemd, and set as default dev distro.
.PARAMETER SkipInstall
  Only configure systemd when Ubuntu already exists.
#>
param(
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Continue'

. (Join-Path $PSScriptRoot 'lib\wsl-distros.ps1')

function ConvertTo-WslPath {
    param([Parameter(Mandatory = $true)][string]$WinPath)

    $full = $WinPath
    if (Test-Path -LiteralPath $WinPath) {
        $full = (Resolve-Path -LiteralPath $WinPath).Path
    }

    if ($full -match '^([A-Za-z]):\\(.*)$') {
        $drive = $Matches[1].ToLower()
        $rest = $Matches[2] -replace '\\', '/'
        return "/mnt/$drive/$rest"
    }

    return ($full -replace '\\', '/')
}

function Test-UbuntuDistro {
    return @(Get-WslUbuntuDistro)
}

if (-not $SkipInstall) {
    if (-not (Get-Command wsl -ErrorAction SilentlyContinue)) {
        Write-Error 'wsl not found. Enable WSL via: wsl --install'
        exit 1
    }

    wsl --update
    wsl --set-default-version 2

    $ubuntu = Test-UbuntuDistro
    if ($ubuntu.Count -eq 0) {
        Write-Host '[i] Installing Ubuntu (may require elevation / reboot)...' -ForegroundColor Cyan
        wsl --install -d Ubuntu --no-launch
        if ($LASTEXITCODE -ne 0) {
            Write-Warning 'Ubuntu install did not complete. Run manually: wsl --install -d Ubuntu'
        }
    }
}

$ubuntuList = @(Get-WslUbuntuDistro)
if ($ubuntuList.Count -eq 0) {
    Write-Warning 'Ubuntu not available yet. Complete first-run setup from Start menu, then re-run.'
    exit 1
}

$distroName = $ubuntuList[0]
Write-Host "[i] Configuring systemd for $distroName" -ForegroundColor Cyan

$wslConf = @'
[boot]
systemd=true

[interop]
enabled=true
appendWindowsPath=true
'@

$wslConf | wsl -d $distroName -u root -- bash -lc 'tee /etc/wsl.conf >/dev/null'

wsl --shutdown
Start-Sleep -Seconds 5

wsl --set-default $distroName

$agentSetup = Join-Path $PSScriptRoot 'shell\setup-modme-agent-wsl.sh'
if (Test-Path $agentSetup) {
    Write-Host '[i] Configuring modme-agent WSL profile (passwordless sudo + devbox)...' -ForegroundColor Cyan
    $wslAgentSetup = ConvertTo-WslPath -WinPath $agentSetup
    wsl -d $distroName -u root -- bash -lc "sed -i 's/\r$//' '$wslAgentSetup' && bash '$wslAgentSetup'" 2>&1 | ForEach-Object { Write-Host $_ }
    wsl --shutdown
    Start-Sleep -Seconds 3
    wsl --set-default $distroName
}

$verifyCmd = 'command -v bash; grep -q systemd=true /etc/wsl.conf; echo OK'
$verify = wsl -d $distroName -- bash -lc $verifyCmd 2>&1
if (("$verify" -match 'OK') -and ($LASTEXITCODE -eq 0)) {
    Write-Host '[OK] Ubuntu WSL configured with systemd.' -ForegroundColor Green
    exit 0
}

Write-Warning "Ubuntu verification incomplete: $verify"
exit 1
