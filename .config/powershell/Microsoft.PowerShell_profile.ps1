<#
ModMe GenUI Workbench - Project PowerShell profile

Location: .config/powershell/Microsoft.PowerShell_profile.ps1

This file is intended to be sourced by the user's PowerShell profile
via the repository setup script (`scripts/setup-shell-integration.ps1`).

#>

# Resolve project root (two levels up from this file)
try {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
    $projectRoot = Resolve-Path -Path (Join-Path $scriptDir "..\..") -ErrorAction Stop
    $projectRoot = $projectRoot.ProviderPath
}
catch {
    $projectRoot = Get-Location
}

function Get-ProjectRoot {
    return $projectRoot
}

function Show-ProjectCommands {
    Write-Host "ModMe GenUI Workbench - Project Commands" -ForegroundColor Cyan
    Write-Host "  dev       - Start both frontend and agent servers"
    Write-Host "  ui        - Start Next.js frontend only"
    Write-Host "  agent     - Start Python agent only"
    Write-Host "  mcp       - Start MCP servers"
    Write-Host "  validate  - Validate toolsets configuration"
    Write-Host "  docs      - Generate all documentation"
    Write-Host "  venv      - Activate Python virtual environment"
    Write-Host "  help      - Show this message"
}

function dev {
    Push-Location $projectRoot
    npm run dev
    Pop-Location
}

function ui {
    Push-Location $projectRoot
    npm run dev:ui
    Pop-Location
}

function agent {
    Push-Location $projectRoot
    npm run dev:agent
    Pop-Location
}

function mcp {
    Push-Location $projectRoot
    & "$projectRoot\scripts\start-mcp-servers.ps1"
    Pop-Location
}

function validate {
    Push-Location $projectRoot
    npm run validate:toolsets 2>$null || node "$projectRoot/scripts/toolset-management/validate-toolsets.js" || Write-Host "Validation script not found"
    Pop-Location
}

function docs {
    Push-Location $projectRoot
    npm run docs:all
    Pop-Location
}

function venv {
    $venv = Join-Path $projectRoot "agent\.venv\Scripts\Activate.ps1"
    if (Test-Path $venv) { . $venv }
    else { Write-Host "Virtual environment not found at $venv" -ForegroundColor Yellow }
}

Set-Alias help Show-ProjectCommands

# Display a short welcome only when running inside VS Code terminal
if ($env:TERM_PROGRAM -eq "vscode") {
    Write-Host "✓ VS Code shell integration enabled for ModMe GenUI Workbench" -ForegroundColor Green
}
# VS Code Shell Integration for PowerShell
# This profile is automatically loaded when PowerShell starts in VS Code
# Documentation: https://code.visualstudio.com/docs/terminal/shell-integration

# Enable shell integration if running in VS Code
if ($env:TERM_PROGRAM -eq "vscode") {
    $shellIntegrationPath = code --locate-shell-integration-path pwsh
    if (Test-Path $shellIntegrationPath) {
        . $shellIntegrationPath
        Write-Host "✓ VS Code shell integration enabled" -ForegroundColor Green
    }
}

# Project-specific aliases and functions
Set-Location $PSScriptRoot\..\..\

# Convenient aliases for the project
function Start-Dev {
    npm run dev
}
Set-Alias dev Start-Dev

function Start-Agent {
    npm run dev:agent
}
Set-Alias agent Start-Agent

function Start-UI {
    npm run dev:ui
}
Set-Alias ui Start-UI

function Start-MCP {
    & "$PSScriptRoot\..\..\scripts\start-mcp-servers.ps1"
}
Set-Alias mcp Start-MCP

function Validate-Toolsets {
    node "$PSScriptRoot\..\..\scripts\toolset-management\validate-toolsets.js"
}
Set-Alias validate Validate-Toolsets

function Generate-Docs {
    npm run docs:all
}
Set-Alias docs Generate-Docs

# Python virtual environment activation
function Activate-PythonEnv {
    & "$PSScriptRoot\..\..\agent\.venv\Scripts\Activate.ps1"
}
Set-Alias venv Activate-PythonEnv

# Show available project commands
function Show-ProjectCommands {
    Write-Host "`n📋 ModMe GenUI Workbench - Available Commands:" -ForegroundColor Cyan
    Write-Host "  dev       - Start both frontend and agent servers" -ForegroundColor Yellow
    Write-Host "  ui        - Start Next.js frontend only" -ForegroundColor Yellow
    Write-Host "  agent     - Start Python agent only" -ForegroundColor Yellow
    Write-Host "  mcp       - Start MCP servers" -ForegroundColor Yellow
    Write-Host "  validate  - Validate toolsets configuration" -ForegroundColor Yellow
    Write-Host "  docs      - Generate all documentation" -ForegroundColor Yellow
    Write-Host "  venv      - Activate Python virtual environment" -ForegroundColor Yellow
    Write-Host "  help      - Show this message`n" -ForegroundColor Yellow
}
Set-Alias help Show-ProjectCommands

# Welcome message
Write-Host "🎨 ModMe GenUI Workbench" -ForegroundColor Magenta
Write-Host "Type 'help' for available commands`n" -ForegroundColor Gray
