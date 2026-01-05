#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'
$path = "$env:APPDATA\Code\User\mcp.json"
if (-not (Test-Path $path)) { Write-Error "File not found: $path"; exit 1 }
$j = Get-Content $path -Raw | ConvertFrom-Json
Write-Output "Server keys present:" 
$j.servers.PSObject.Properties.Name | ForEach-Object { Write-Output "- $_" }
