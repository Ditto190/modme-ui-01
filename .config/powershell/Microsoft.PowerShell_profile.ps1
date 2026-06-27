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
if ($env:TERM_PROGRAM -eq "vscode") {
    try {
        $shellIntegrationPath = code --locate-shell-integration-path pwsh 2>$null
        if ($shellIntegrationPath -and (Test-Path $shellIntegrationPath)) {
            . $shellIntegrationPath
        }
    }
    catch { }
}

# Resolve project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Resolve-Path -Path (Join-Path $scriptDir "..\..") -ErrorAction SilentlyContinue
if ($projectRoot) { $projectRoot = $projectRoot.ProviderPath } else { $projectRoot = Get-Location }

# Unified env bootstrap (skip if modme-terminal already loaded)
if ($env:MODME_ENV_LOADED -ne '1') {
    $bootstrap = Join-Path $projectRoot "scripts\lib\modme-env-bootstrap.ps1"
    if (Test-Path $bootstrap) {
        . $bootstrap
        Import-ModMeEnv -RepoRoot $projectRoot -Quiet | Out-Null
    }
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

function Start-ForgeCore {
    Push-Location $projectRoot
    try { yarn dev:forge:core } finally { Pop-Location }
}

function Start-ForgeWorkshop {
    Push-Location $projectRoot
    try { yarn dev:forge:workshop } finally { Pop-Location }
}

function Invoke-ForgeCheck {
    Push-Location $projectRoot
    try { yarn check:forge } finally { Pop-Location }
}

function Invoke-Preflight {
    param(
        [ValidateSet('fast', 'full', 'forge', 'env', 'ci')]
        [string]$Profile = 'fast'
    )
    Push-Location $projectRoot
    try {
        if ($Profile -eq 'full') {
            yarn preflight
        } else {
            yarn "preflight:$Profile"
        }
    } finally { Pop-Location }
}

function Invoke-PreflightFast {
    Invoke-Preflight -Profile fast
}

function Invoke-PreflightFull {
    Invoke-Preflight -Profile full
}

function Show-ProjectCommands {
    <#
    .SYNOPSIS
        Displays available project commands
    #>
    Write-Host ""
    Write-Host "ModMe commands (dual monorepo):" -ForegroundColor Cyan
    Write-Host "  forge       - yarn dev:forge:core (app 3100 web 3101 api 3102)" -ForegroundColor Yellow
    Write-Host "  workshop    - yarn dev:forge:workshop (docs + storybook)" -ForegroundColor Yellow
    Write-Host "  forge-check - yarn check:forge (ultracite)" -ForegroundColor Yellow
    Write-Host "  preflight   - yarn preflight:fast (lint+test smoke)" -ForegroundColor Yellow
    Write-Host "  preflight-full - yarn preflight (full pre-PR gate)" -ForegroundColor Yellow
    Write-Host "  dev         - Legacy GenUI: npm run dev (ui + agent)" -ForegroundColor Yellow
    Write-Host "  ui / agent  - Legacy GenUI servers only" -ForegroundColor Yellow
    Write-Host "  validate    - Validate toolsets" -ForegroundColor Yellow
    Write-Host "  modme-help  - Show this message" -ForegroundColor Yellow
    Write-Host ""
}

function global:modme-help {
    Show-ProjectCommands
}

# Set up aliases (avoid 'help' - conflicts with Get-Help)
Set-Alias -Name dev -Value Start-Dev -Scope Global -Force
Set-Alias -Name agent -Value Start-Agent -Scope Global -Force
Set-Alias -Name ui -Value Start-UI -Scope Global -Force
Set-Alias -Name mcp -Value Start-MCP -Scope Global -Force
Set-Alias -Name validate -Value Invoke-Validate -Scope Global -Force
Set-Alias -Name docs -Value Start-Docs -Scope Global -Force
Set-Alias -Name venv -Value Enable-Venv -Scope Global -Force
Set-Alias -Name forge -Value Start-ForgeCore -Scope Global -Force
Set-Alias -Name workshop -Value Start-ForgeWorkshop -Scope Global -Force
Set-Alias -Name forge-check -Value Invoke-ForgeCheck -Scope Global -Force
Set-Alias -Name preflight -Value Invoke-PreflightFast -Scope Global -Force
Set-Alias -Name preflight-full -Value Invoke-PreflightFull -Scope Global -Force

# Welcome message (only in VS Code)
if ($env:TERM_PROGRAM -eq "vscode") {
    Write-Host "ModMe workspace (next-forge + GenerativeUI)" -ForegroundColor Magenta
    Write-Host "Type modme-help for commands`n" -ForegroundColor Gray
}
