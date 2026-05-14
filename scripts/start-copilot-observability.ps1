#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Start Copilot observability stack (Phoenix + Telemetry Proxy)

.DESCRIPTION
    Starts Phoenix backend and Copilot telemetry proxy server for
    collecting GitHub Copilot interactions in VSCode.

.PARAMETER SkipPhoenix
    Skip starting Phoenix container (if already running)

.PARAMETER ProxyOnly
    Only start the telemetry proxy (assumes Phoenix is running)

.EXAMPLE
    .\start-copilot-observability.ps1
    Start both Phoenix and proxy

.EXAMPLE
    .\start-copilot-observability.ps1 -ProxyOnly
    Start only the proxy (Phoenix already running)
#>

param(
    [switch]$SkipPhoenix,
    [switch]$ProxyOnly
)

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Copilot Observability Stack Startup" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to project root
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Push-Location $projectRoot

try {
    # Step 1: Start Phoenix (unless skipped)
    if (-not $ProxyOnly -and -not $SkipPhoenix) {
        Write-Host "[1/3] Starting Phoenix backend..." -ForegroundColor Yellow

        # Check if Phoenix is already running
        $phoenixRunning = docker ps --filter "name=phoenix-server" --filter "status=running" -q

        if ($phoenixRunning) {
            Write-Host "  ✓ Phoenix already running (container ID: $phoenixRunning)" -ForegroundColor Green
        } else {
            Write-Host "  Starting Phoenix container..." -ForegroundColor Gray
            docker-compose -f docker-compose.phoenix.yml up -d

            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Phoenix started successfully" -ForegroundColor Green
                Write-Host "  Waiting for Phoenix to be ready..." -ForegroundColor Gray
                Start-Sleep -Seconds 5
            } else {
                throw "Failed to start Phoenix container"
            }
        }

        Write-Host "  Phoenix UI: http://localhost:6006" -ForegroundColor Cyan
        Write-Host ""
    } elseif ($SkipPhoenix) {
        Write-Host "[1/3] Skipping Phoenix startup (--skip-phoenix flag)" -ForegroundColor Gray
        Write-Host ""
    }

    # Step 2: Check Python environment
    Write-Host "[2/3] Checking Python environment..." -ForegroundColor Yellow

    $venvPath = Join-Path $projectRoot "agent" ".venv"
    $pythonExe = if ($IsWindows -or $env:OS -eq "Windows_NT") {
        Join-Path $venvPath "Scripts" "python.exe"
    } else {
        Join-Path $venvPath "bin" "python"
    }

    if (-not (Test-Path $pythonExe)) {
        Write-Host "  ✗ Python virtual environment not found" -ForegroundColor Red
        Write-Host "  Please run: cd agent && uv sync" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "  ✓ Python environment found: $pythonExe" -ForegroundColor Green

    # Check if required packages are installed
    $pipList = & $pythonExe -m pip list --format=freeze
    $missingPackages = @()

    $requiredPackages = @("fastapi", "uvicorn", "opentelemetry-api", "pydantic")
    foreach ($pkg in $requiredPackages) {
        if (-not ($pipList -match "^$pkg==")) {
            $missingPackages += $pkg
        }
    }

    if ($missingPackages.Count -gt 0) {
        Write-Host "  ✗ Missing required packages: $($missingPackages -join ', ')" -ForegroundColor Red
        Write-Host "  Installing missing packages..." -ForegroundColor Yellow
        & $pythonExe -m pip install fastapi uvicorn opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp-proto-http pydantic openinference-instrumentation

        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install required packages"
        }
        Write-Host "  ✓ Packages installed successfully" -ForegroundColor Green
    } else {
        Write-Host "  ✓ All required packages installed" -ForegroundColor Green
    }
    Write-Host ""

    # Step 3: Start telemetry proxy
    Write-Host "[3/3] Starting Copilot telemetry proxy..." -ForegroundColor Yellow
    Write-Host "  Proxy endpoint: http://localhost:8080/telemetry" -ForegroundColor Cyan
    Write-Host "  Health check: http://localhost:8080/health" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Press Ctrl+C to stop the proxy" -ForegroundColor Gray
    Write-Host ""

    # Set environment variables
    $env:PHOENIX_COLLECTOR_ENDPOINT = "http://localhost:6006/v1/traces"
    $env:PHOENIX_PROJECT_NAME = "copilot-research"
    $env:PROXY_PORT = "8080"
    $env:LOG_LEVEL = "INFO"

    # Start the proxy
    & $pythonExe -m agent.observability.copilot_phoenix_proxy

} catch {
    Write-Host ""
    Write-Host "✗ Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}
