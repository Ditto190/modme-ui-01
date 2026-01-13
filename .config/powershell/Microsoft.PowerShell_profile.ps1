<#
.SYNOPSIS
    ModMe GenUI Workbench - Project PowerShell Profile

.DESCRIPTION
    This file provides VS Code shell integration and project-specific commands
    for the ModMe GenUI Workbench. It is designed to be sourced by the user's
    PowerShell profile via the setup script (scripts/setup-shell-integration.ps1).

.NOTES
    Location: .config/powershell/Microsoft.PowerShell_profile.ps1
    Documentation: https://code.visualstudio.com/docs/terminal/shell-integration
#>

# VS Code Shell Integration
# Enable shell integration if running in VS Code
if ($env:TERM_PROGRAM -eq "vscode") {
    try {
        $shellIntegrationPath = code --locate-shell-integration-path pwsh 2>$null
        if ($shellIntegrationPath -and (Test-Path $shellIntegrationPath)) {
            . $shellIntegrationPath
        }
    }
    catch {
        # Silently continue if shell integration is not available
    }
}

# Resolve project root (two levels up from this file)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Resolve-Path -Path (Join-Path $scriptDir "..\..") -ErrorAction SilentlyContinue
if ($projectRoot) {
    $projectRoot = $projectRoot.ProviderPath
}
else {
    $projectRoot = Get-Location
}

# Project-specific command functions
function Start-Dev {
    <#
    .SYNOPSIS
        Starts both the frontend and agent servers
    #>
    Push-Location $projectRoot
    try { npm run dev } finally { Pop-Location }
}

function Start-Agent {
    <#
    .SYNOPSIS
        Starts the Python agent server only
    #>
    Push-Location $projectRoot
    try { npm run dev:agent } finally { Pop-Location }
}

function Start-UI {
    <#
    .SYNOPSIS
        Starts the Next.js frontend server only
    #>
    Push-Location $projectRoot
    try { npm run dev:ui } finally { Pop-Location }
}

function Start-MCP {
    <#
    .SYNOPSIS
        Starts MCP servers
    #>
    Push-Location $projectRoot
    try {
        $mcpScript = Join-Path $projectRoot "scripts\start-mcp-servers.ps1"
        if (Test-Path $mcpScript) {
            & $mcpScript
        }
        else {
            Write-Host "MCP start script not found at: $mcpScript" -ForegroundColor Yellow
        }
    }
    finally {
        Pop-Location
    }
}

function Invoke-Validate {
    <#
    .SYNOPSIS
        Validates toolsets configuration
    #>
    Push-Location $projectRoot
    try {
        # Try npm script first, fallback to direct node invocation
        $npmResult = npm run validate:toolsets 2>$null
        if ($LASTEXITCODE -ne 0) {
            $validateScript = Join-Path $projectRoot "scripts\toolset-management\validate-toolsets.js"
            if (Test-Path $validateScript) {
                node $validateScript
            }
            else {
                Write-Host "Validation script not found" -ForegroundColor Yellow
            }
        }
    }
    finally {
        Pop-Location
    }
}

function Start-Docs {
    <#
    .SYNOPSIS
        Generates all documentation
    #>
    Push-Location $projectRoot
    try { npm run docs:all } finally { Pop-Location }
}

function Enable-Venv {
    <#
    .SYNOPSIS
        Activates the Python virtual environment
    #>
    $venvScript = Join-Path $projectRoot "agent\.venv\Scripts\Activate.ps1"
    if (Test-Path $venvScript) {
        . $venvScript
    }
    else {
        Write-Host "Virtual environment not found at: $venvScript" -ForegroundColor Yellow
        Write-Host "Run 'python -m venv agent\.venv' to create it" -ForegroundColor Gray
    }
}

function Show-ProjectCommands {
    <#
    .SYNOPSIS
        Displays available project commands
    #>
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

# Set up aliases
Set-Alias -Name dev -Value Start-Dev -Scope Global
Set-Alias -Name agent -Value Start-Agent -Scope Global
Set-Alias -Name ui -Value Start-UI -Scope Global
Set-Alias -Name mcp -Value Start-MCP -Scope Global
Set-Alias -Name validate -Value Invoke-Validate -Scope Global
Set-Alias -Name docs -Value Start-Docs -Scope Global
Set-Alias -Name venv -Value Enable-Venv -Scope Global
Set-Alias -Name help -Value Show-ProjectCommands -Scope Global

# Welcome message (only in VS Code)
if ($env:TERM_PROGRAM -eq "vscode") {
    Write-Host "🎨 ModMe GenUI Workbench" -ForegroundColor Magenta
    Write-Host "Type 'help' for available commands`n" -ForegroundColor Gray
}
