#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Setup script for GenAI Toolbox with GreptimeDB integration

.DESCRIPTION
    This script sets up the official Google GenAI Toolbox with GreptimeDB observability:
    1. Verifies Go installation
    2. Creates .env file from template
    3. Installs Go dependencies
    4. Verifies GreptimeDB connectivity
    5. Runs health checks
    6. Starts the GenAI Toolbox server

.PARAMETER SkipDeps
    Skip Go dependency installation

.PARAMETER SkipGreptimeCheck
    Skip GreptimeDB connectivity check

.EXAMPLE
    .\setup-genai-toolbox.ps1
    .\setup-genai-toolbox.ps1 -SkipDeps
#>

param(
    [switch]$SkipDeps,
    [switch]$SkipGreptimeCheck
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success { Write-ColorOutput Green @args }
function Write-Info { Write-ColorOutput Cyan @args }
function Write-Warning { Write-ColorOutput Yellow @args }
function Write-Error { Write-ColorOutput Red @args }

Write-Info "========================================="
Write-Info "GenAI Toolbox + GreptimeDB Setup"
Write-Info "========================================="
Write-Output ""

# Check if we're in the right directory
if (-not (Test-Path "main.go")) {
    Write-Error "❌ Error: main.go not found. Please run this script from agent/genai-toolbox directory"
    exit 1
}

# Step 1: Check Go installation
Write-Info "Step 1: Checking Go installation..."
try {
    $goVersion = go version
    Write-Success "✓ Go is installed: $goVersion"
} catch {
    Write-Error "❌ Go is not installed or not in PATH"
    Write-Info "Download Go from: https://go.dev/dl/"
    exit 1
}
Write-Output ""

# Step 2: Create .env file
Write-Info "Step 2: Setting up environment configuration..."
if (Test-Path ".env") {
    Write-Warning "⚠ .env file already exists, skipping creation"
    Write-Info "To recreate, delete .env and run this script again"
} else {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Success "✓ Created .env from .env.example"
        Write-Warning "⚠ IMPORTANT: Edit .env and configure your database credentials!"
    } else {
        Write-Error "❌ .env.example not found"
        exit 1
    }
}
Write-Output ""

# Step 3: Install Go dependencies
if (-not $SkipDeps) {
    Write-Info "Step 3: Installing Go dependencies..."
    try {
        go mod download
        Write-Success "✓ Go dependencies installed"
    } catch {
        Write-Error "❌ Failed to install Go dependencies"
        Write-Info "Try running: go mod tidy"
        exit 1
    }
} else {
    Write-Info "Step 3: Skipping dependency installation (--SkipDeps flag)"
}
Write-Output ""

# Step 4: Verify GreptimeDB connectivity
if (-not $SkipGreptimeCheck) {
    Write-Info "Step 4: Checking GreptimeDB connectivity..."
    
    # Load .env to get GREPTIME_HOST
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }
    
    $greptimeHost = $env:GREPTIME_HOST
    if (-not $greptimeHost) {
        $greptimeHost = "localhost:4000"
    }
    
    try {
        $response = Invoke-WebRequest -Uri "http://$greptimeHost/health" -Method Get -TimeoutSec 5 -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Success "✓ GreptimeDB is accessible at $greptimeHost"
        }
    } catch {
        Write-Warning "⚠ GreptimeDB not accessible at $greptimeHost"
        Write-Info "Start GreptimeDB with:"
        Write-Info "  docker run -d -p 4000-4004:4000-4004 greptime/greptimedb:latest standalone start"
        Write-Info "Or continue without observability (it will gracefully degrade)"
    }
} else {
    Write-Info "Step 4: Skipping GreptimeDB connectivity check (--SkipGreptimeCheck flag)"
}
Write-Output ""

# Step 5: Build the server (optional)
Write-Info "Step 5: Building GenAI Toolbox server..."
try {
    go build -o genai-toolbox.exe .
    Write-Success "✓ Server built successfully: genai-toolbox.exe"
} catch {
    Write-Error "❌ Build failed"
    Write-Info "Check for compilation errors above"
    exit 1
}
Write-Output ""

# Step 6: Verify tools.yaml
Write-Info "Step 6: Verifying tools.yaml configuration..."
if (Test-Path "tools.yaml") {
    Write-Success "✓ tools.yaml found"
    
    # Check if observability is configured
    $toolsContent = Get-Content "tools.yaml" -Raw
    if ($toolsContent -match "observability:") {
        Write-Success "✓ GreptimeDB observability configured in tools.yaml"
    } else {
        Write-Warning "⚠ Observability not configured in tools.yaml"
        Write-Info "Example configuration available in GENAI_TOOLBOX_INTEGRATION_PLAN.md"
    }
} else {
    Write-Error "❌ tools.yaml not found"
    Write-Info "Create tools.yaml from the example in GENAI_TOOLBOX_INTEGRATION_PLAN.md"
    exit 1
}
Write-Output ""

# Success summary
Write-Success "========================================="
Write-Success "✅ Setup Complete!"
Write-Success "========================================="
Write-Output ""

Write-Info "Next steps:"
Write-Info "1. Edit .env and configure your database credentials"
Write-Info "2. Edit tools.yaml to configure your database sources"
Write-Info "3. Start GreptimeDB (if not running):"
Write-Info "   docker run -d -p 4000-4004:4000-4004 greptime/greptimedb:latest standalone start"
Write-Info ""
Write-Info "4. Run GenAI Toolbox:"
Write-Info "   .\genai-toolbox.exe --tools-file tools.yaml --address 127.0.0.1 --port 8080"
Write-Info "   OR"
Write-Info "   go run main.go --tools-file tools.yaml --address 127.0.0.1 --port 8080"
Write-Info ""
Write-Info "5. Verify observability:"
Write-Info "   curl http://localhost:4000/health  # GreptimeDB"
Write-Info "   curl http://localhost:8080/health  # GenAI Toolbox"
Write-Info ""
Write-Info "6. Configure MCP client (Claude Desktop, VS Code, etc.):"
Write-Info "   See GENAI_TOOLBOX_INTEGRATION_PLAN.md for MCP configuration"
Write-Output ""

# Optional: Ask if user wants to start the server now
Write-Info "Would you like to start the GenAI Toolbox server now? (Y/N)"
$response = Read-Host
if ($response -eq 'Y' -or $response -eq 'y') {
    Write-Info "Starting GenAI Toolbox server..."
    Write-Info "Press Ctrl+C to stop the server"
    Write-Output ""
    
    # Load .env variables
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }
    
    # Start server
    go run main.go --tools-file tools.yaml --address 127.0.0.1 --port 8080
} else {
    Write-Info "Server not started. Run manually when ready."
}
