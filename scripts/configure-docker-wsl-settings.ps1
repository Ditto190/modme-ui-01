#Requires -Version 5.1
<#
.SYNOPSIS
  Apply Docker Desktop disk cap and WSL2 backend hints via settings-store.json.
.PARAMETER DiskSizeMiB
  Maximum Docker disk image size in MiB (default 10240 = 10 GB).
#>
param(
    [int]$DiskSizeMiB = 10240
)

$ErrorActionPreference = 'Stop'

$settingsPath = Join-Path $env:APPDATA 'Docker\settings-store.json'
if (-not (Test-Path $settingsPath)) {
    Write-Warning "Docker settings not found at $settingsPath (start Docker Desktop once)."
    exit 1
}

$raw = Get-Content $settingsPath -Raw
$settings = $raw | ConvertFrom-Json

if ($settings.PSObject.Properties.Name -contains 'diskSizeMiB') {
    $settings.diskSizeMiB = $DiskSizeMiB
}
else {
    $settings | Add-Member -NotePropertyName 'diskSizeMiB' -NotePropertyValue $DiskSizeMiB -Force
}

if ($settings.PSObject.Properties.Name -contains 'useWslEngine') {
    $settings.useWslEngine = $true
}
else {
    $settings | Add-Member -NotePropertyName 'useWslEngine' -NotePropertyValue $true -Force
}

($settings | ConvertTo-Json -Depth 20) | Set-Content -Path $settingsPath -Encoding UTF8

Write-Host "[OK] Docker settings updated: diskSizeMiB=$DiskSizeMiB useWslEngine=true" -ForegroundColor Green
Write-Host '[i] Restart Docker Desktop for changes to apply.' -ForegroundColor Cyan
