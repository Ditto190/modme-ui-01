$ErrorActionPreference = "Stop"

$Repo = "luoyuctl/agenttrace"
$Version = "v0.5.4"
$BinName = "agenttrace-windows-amd64.exe"
$Url = "https://github.com/$Repo/releases/download/$Version/$BinName"

$ToolsDir = Join-Path $PSScriptRoot "..\.tools"
if (-not (Test-Path $ToolsDir)) {
    New-Item -ItemType Directory -Path $ToolsDir | Out-Null
}

$Dest = Join-Path $ToolsDir "agenttrace.exe"

Write-Host "Downloading agenttrace $Version..."
Invoke-WebRequest -Uri $Url -OutFile $Dest

Write-Host "agenttrace installed to $Dest" -ForegroundColor Green
