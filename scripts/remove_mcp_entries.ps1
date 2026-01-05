#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

$path = "$env:APPDATA\Code\User\mcp.json"
if (-not (Test-Path $path)) {
    Write-Error "File not found: $path"
    exit 1
}

$j = Get-Content $path -Raw | ConvertFrom-Json
$removed = @()

if ($j.servers -and ($j.servers.PSObject.Properties.Name -contains 'github')) {
    $j.servers.PSObject.Properties.Remove('github')
    $removed += 'github'
}

if ($j.servers -and ($j.servers.PSObject.Properties.Name -contains 'io.github.github/github-mcp-server')) {
    $j.servers.PSObject.Properties.Remove('io.github.github/github-mcp-server')
    $removed += 'io.github.github/github-mcp-server'
}

if ($j.servers -and ($j.servers.PSObject.Properties.Name -contains 'excel-mcp')) {
    $j.servers.PSObject.Properties.Remove('excel-mcp')
    $removed += 'excel-mcp'
}

$j | ConvertTo-Json -Depth 20 | Set-Content $path -Force
Write-Output "Removed entries: $($removed -join ', ')"
Write-Output "Wrote: $path"
