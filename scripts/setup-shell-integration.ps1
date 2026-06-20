# VS Code Shell Integration Setup Script
# This script helps configure shell integration for PowerShell
# Run as Administrator if creating symbolic links

param(
    [switch]$Force,
    [switch]$SkipProfileLink
)

$ErrorActionPreference = "Stop"

Write-Host "`n🔧 VS Code Shell Integration Setup" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if running in VS Code
if ($env:TERM_PROGRAM -ne "vscode") {
    Write-Warning "Not running in VS Code terminal. Shell integration works best when configured from VS Code."
    $continue = Read-Host "Continue anyway? (Y/N)"
    if ($continue -ne "Y" -and $continue -ne "y") {
        exit 0
    }
}

# Get paths
$projectRoot = Split-Path -Parent $PSScriptRoot
$projectProfile = Join-Path $projectRoot ".config\powershell\Microsoft.PowerShell_profile.ps1"
$userProfile = $PROFILE.CurrentUserAllHosts

Write-Host "📁 Paths:" -ForegroundColor Yellow
Write-Host "   Project Root: $projectRoot"
Write-Host "   Project Profile: $projectProfile"
Write-Host "   Your PowerShell Profile: $userProfile`n"

# Check if project profile exists
if (-not (Test-Path $projectProfile)) {
    Write-Error "Project profile not found at: $projectProfile"
    exit 1
}

# Option 1: Create symbolic link (requires admin)
if (-not $SkipProfileLink) {
    Write-Host "🔗 Option 1: Create Symbolic Link (Recommended)" -ForegroundColor Green
    Write-Host "   This creates a link from your PowerShell profile to the project profile."
    Write-Host "   Requires: Administrator privileges`n"

    $createLink = Read-Host "Create symbolic link? (Y/N)"
    if ($createLink -eq "Y" -or $createLink -eq "y") {
        try {
            # Backup existing profile
            if (Test-Path $userProfile) {
                $backupPath = "$userProfile.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
                Write-Host "   ✓ Backing up existing profile to: $backupPath" -ForegroundColor Gray
                Copy-Item $userProfile $backupPath
            }

            # Create directory if it doesn't exist
            $profileDir = Split-Path -Parent $userProfile
            if (-not (Test-Path $profileDir)) {
                New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
            }

            # Create symbolic link
            if (Test-Path $userProfile) {
                Remove-Item $userProfile -Force
            }
            New-Item -ItemType SymbolicLink -Path $userProfile -Target $projectProfile -Force | Out-Null
            Write-Host "   ✓ Symbolic link created successfully!`n" -ForegroundColor Green
        }
        catch {
            Write-Warning "Failed to create symbolic link. You may need to run this script as Administrator."
            Write-Host "   Error: $_`n" -ForegroundColor Red
            $SkipProfileLink = $true
        }
    }
    else {
        $SkipProfileLink = $true
    }
}

# Option 2: Source project profile from user profile
if ($SkipProfileLink) {
    Write-Host "📝 Option 2: Source Project Profile" -ForegroundColor Green
    Write-Host "   This adds a line to your PowerShell profile to source the project profile.`n"

    $sourceCommand = @"

# ModMe GenUI Workbench - VS Code Shell Integration
if (Test-Path "$projectProfile") {
    . "$projectProfile"
}
"@

    # Check if already sourced
    if (Test-Path $userProfile) {
        $content = Get-Content $userProfile -Raw
        if ($content -match [regex]::Escape($projectProfile)) {
            Write-Host "   ✓ Project profile is already sourced in your PowerShell profile.`n" -ForegroundColor Gray
        }
        else {
            Add-Content -Path $userProfile -Value $sourceCommand
            Write-Host "   ✓ Added source command to your PowerShell profile.`n" -ForegroundColor Green
        }
    }
    else {
        # Create new profile
        $profileDir = Split-Path -Parent $userProfile
        if (-not (Test-Path $profileDir)) {
            New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
        }
        Set-Content -Path $userProfile -Value $sourceCommand
        Write-Host "   ✓ Created new PowerShell profile with source command.`n" -ForegroundColor Green
    }
}

# Verify VS Code settings
Write-Host "⚙️  Checking VS Code Settings..." -ForegroundColor Yellow

$workspaceSettings = Join-Path $projectRoot "workspace.code-workspace"
if (Test-Path $workspaceSettings) {
    $settings = Get-Content $workspaceSettings -Raw | ConvertFrom-Json
    $shellIntegrationEnabled = $settings.settings.'terminal.integrated.shellIntegration.enabled'

    if ($shellIntegrationEnabled) {
        Write-Host "   ✓ Shell integration is enabled in workspace settings`n" -ForegroundColor Green
    }
    else {
        Write-Warning "Shell integration is not enabled in workspace settings."
        Write-Host "   Please check workspace.code-workspace`n"
    }
}

# Summary
Write-Host "✨ Setup Complete!" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Reload VS Code window: Ctrl+Shift+P → 'Developer: Reload Window'"
Write-Host "2. Open a new PowerShell terminal"
Write-Host "3. You should see: '✓ VS Code shell integration enabled'"
Write-Host "4. Type 'help' to see available project commands`n"

Write-Host "Available Commands:" -ForegroundColor Yellow
Write-Host "  dev       - Start both frontend and agent servers"
Write-Host "  ui        - Start Next.js frontend only"
Write-Host "  agent     - Start Python agent only"
Write-Host "  mcp       - Start MCP servers"
Write-Host "  validate  - Validate toolsets configuration"
Write-Host "  docs      - Generate all documentation"
Write-Host "  venv      - Activate Python virtual environment"
Write-Host "  help      - Show available commands`n"

Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "   - VS Code Shell Integration: https://code.visualstudio.com/docs/terminal/shell-integration"
Write-Host "   - Project Configuration: .config/README.md`n"

# Test shell integration
Write-Host "🧪 Testing Shell Integration..." -ForegroundColor Yellow
$shellIntegrationPath = code --locate-shell-integration-path pwsh 2>&1
if ($LASTEXITCODE -eq 0 -and $shellIntegrationPath -and (Test-Path $shellIntegrationPath)) {
    Write-Host "   ✓ Shell integration script found: $shellIntegrationPath" -ForegroundColor Green
}
else {
    Write-Warning "Could not locate shell integration script. Make sure VS Code is installed and in PATH."
}

Write-Host "`n✅ Shell integration setup complete!`n" -ForegroundColor Green
