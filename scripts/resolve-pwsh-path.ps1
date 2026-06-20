#Requires -Version 5.1
<#
.SYNOPSIS
  Resolve the real pwsh.exe path (not the 0-byte WindowsApps alias stub).
.EXAMPLE
  .\scripts\resolve-pwsh-path.ps1
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$candidates = @(
  'C:\Program Files\PowerShell\7\pwsh.exe'
)

$storeRoot = 'C:\Program Files\WindowsApps'
if (Test-Path $storeRoot) {
  $storePwsh = Get-ChildItem -Path $storeRoot -Filter 'pwsh.exe' -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match 'Microsoft\.PowerShell_' -and $_.Length -gt 0 } |
    Sort-Object FullName -Descending |
    Select-Object -First 1
  if ($storePwsh) {
    $candidates = @($storePwsh.FullName) + $candidates
  }
}

foreach ($path in $candidates) {
  if ((Test-Path -LiteralPath $path) -and ((Get-Item -LiteralPath $path).Length -gt 0)) {
    Write-Output $path
    exit 0
  }
}

# Last resort: launch via alias and read the running binary path
if (Get-Command pwsh -ErrorAction SilentlyContinue) {
  $resolved = pwsh -NoProfile -Command '[System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName'
  if ($resolved -and (Test-Path -LiteralPath $resolved)) {
    Write-Output $resolved.Trim()
    exit 0
  }
}

Write-Error 'Could not resolve pwsh.exe. Install PowerShell 7: winget install Microsoft.PowerShell'
exit 1
