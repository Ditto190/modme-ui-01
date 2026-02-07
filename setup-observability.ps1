<#
.SYNOPSIS
    Setup GreptimeDB observability for agent conversations

.DESCRIPTION
    This script:
    1. Verifies GreptimeDB is running
    2. Creates database tables
    3. Installs Python dependencies
    4. Runs test logging
    5. Provides next steps

.EXAMPLE
    .\setup-observability.ps1
    .\setup-observability.ps1 -SkipDependencies

.NOTES
    Requires: PowerShell 5.1+, GreptimeDB, Python 3.12+
#>

param(
    [switch]$SkipDependencies,
    [switch]$SkipTableCreation,
    [switch]$TestOnly
)

$ErrorActionPreference = "Stop"

function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[✓] $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "[✗] $msg" -ForegroundColor Red }
function Write-Warning { param($msg) Write-Host "[!] $msg" -ForegroundColor Yellow }

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Agent Observability Setup - GreptimeDB Integration" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Configuration
$GREPTIME_HOST = $env:GREPTIME_HOST ?? "localhost:4000"
$GREPTIME_DB = $env:GREPTIME_DB ?? "public"
$SCRIPT_DIR = $PSScriptRoot
$AGENT_DIR = Join-Path $SCRIPT_DIR "agent"
$OBSERVABILITY_DIR = Join-Path $AGENT_DIR "observability"
$EVALUATIONS_DIR = Join-Path $AGENT_DIR "evaluations"

# ============================================================================
# Step 1: Verify GreptimeDB is running
# ============================================================================
Write-Info "Step 1: Checking GreptimeDB connectivity..."

try {
    $response = Invoke-WebRequest -Uri "http://$GREPTIME_HOST/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Success "GreptimeDB is running at $GREPTIME_HOST"
    }
} catch {
    Write-Error "GreptimeDB is not accessible at http://$GREPTIME_HOST"
    Write-Warning "Please start GreptimeDB with:"
    Write-Host "  docker run -d --name greptimedb -p 4000-4004:4000-4004 greptime/greptimedb:latest standalone start" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# Step 2: Create database tables
# ============================================================================
if (-not $SkipTableCreation -and -not $TestOnly) {
    Write-Info "Step 2: Creating database tables..."

    $schemaFile = Join-Path $OBSERVABILITY_DIR "schemas.sql"
    if (-not (Test-Path $schemaFile)) {
        Write-Error "Schema file not found: $schemaFile"
        exit 1
    }

    $sqlContent = Get-Content $schemaFile -Raw

    # Split by semicolons and execute each statement
    $statements = $sqlContent -split ";" | Where-Object { $_.Trim() -ne "" -and -not $_.Trim().StartsWith("--") }

    $successCount = 0
    foreach ($statement in $statements) {
        $cleanStatement = $statement.Trim()
        if ($cleanStatement -eq "" -or $cleanStatement.StartsWith("--")) {
            continue
        }

        try {
            $body = "sql=$([System.Web.HttpUtility]::UrlEncode($cleanStatement))&db=$GREPTIME_DB"
            $response = Invoke-WebRequest `
                -Uri "http://$GREPTIME_HOST/v1/sql" `
                -Method POST `
                -ContentType "application/x-www-form-urlencoded" `
                -Body $body `
                -ErrorAction Stop

            $successCount++
        } catch {
            # Ignore "already exists" errors
            if ($_.Exception.Message -notmatch "already exists") {
                Write-Warning "SQL execution warning: $($_.Exception.Message)"
            }
        }
    }

    Write-Success "Database schema created/verified ($successCount statements executed)"
}

# ============================================================================
# Step 3: Install Python dependencies
# ============================================================================
if (-not $SkipDependencies -and -not $TestOnly) {
    Write-Info "Step 3: Installing Python dependencies..."

    # Check if Python is available
    try {
        $pythonVersion = python --version 2>&1
        Write-Info "Found: $pythonVersion"
    } catch {
        Write-Error "Python not found. Please install Python 3.12+"
        exit 1
    }

    # Install observability dependencies
    Write-Info "Installing httpx and python-dotenv..."
    python -m pip install httpx python-dotenv --quiet

    # Install evaluation dependencies
    $evalRequirements = Join-Path $EVALUATIONS_DIR "requirements.txt"
    if (Test-Path $evalRequirements) {
        Write-Info "Installing evaluation dependencies..."
        python -m pip install -r $evalRequirements --quiet
    }

    Write-Success "Python dependencies installed"
}

# ============================================================================
# Step 4: Verify .env configuration
# ============================================================================
Write-Info "Step 4: Verifying environment configuration..."

$envFile = Join-Path $SCRIPT_DIR ".env"
$requiredVars = @(
    "GREPTIME_HOST",
    "GREPTIME_DB",
    "AGENT_OBSERVABILITY_ENABLED"
)

$missingVars = @()
foreach ($var in $requiredVars) {
    if (-not (Test-Path env:$var)) {
        $missingVars += $var
    }
}

if ($missingVars.Count -gt 0) {
    Write-Warning "Missing environment variables: $($missingVars -join ', ')"
    Write-Info "Add to .env file:"
    Write-Host "  GREPTIME_HOST=localhost:4000" -ForegroundColor Yellow
    Write-Host "  GREPTIME_DB=public" -ForegroundColor Yellow
    Write-Host "  AGENT_OBSERVABILITY_ENABLED=true" -ForegroundColor Yellow
} else {
    Write-Success "Environment configuration verified"
}

# ============================================================================
# Step 5: Run test logging
# ============================================================================
if ($TestOnly -or (-not $SkipTableCreation)) {
    Write-Info "Step 5: Running test logging..."

    $testScript = @"
import sys
sys.path.insert(0, r'$AGENT_DIR')

from observability.greptime_logger import get_logger

logger = get_logger()
result = logger.log_conversation(
    conversation_id='setup-test-001',
    user_query='Test query from setup script',
    agent_response='Test response - observability is working!',
    provider='test-provider',
    model='test-model',
    tokens_input=10,
    tokens_output=15,
    latency_ms=123.45,
)

print(f'Status: {result.get("status")}')
"@

    $tempScript = [System.IO.Path]::GetTempFileName()
    $tempScript = [System.IO.Path]::ChangeExtension($tempScript, ".py")
    $testScript | Out-File -FilePath $tempScript -Encoding UTF8

    try {
        $output = python $tempScript 2>&1
        if ($output -match "Status: success") {
            Write-Success "Test logging successful!"

            # Verify in database
            Write-Info "Verifying in database..."
            $body = "sql=SELECT COUNT(*) as count FROM agent_conversations WHERE conversation_id = 'setup-test-001'&db=$GREPTIME_DB"
            $response = Invoke-WebRequest `
                -Uri "http://$GREPTIME_HOST/v1/sql" `
                -Method POST `
                -ContentType "application/x-www-form-urlencoded" `
                -Body $body

            Write-Success "Database verification passed"
        } else {
            Write-Warning "Test logging returned: $output"
        }
    } catch {
        Write-Error "Test logging failed: $($_.Exception.Message)"
    } finally {
        Remove-Item $tempScript -ErrorAction SilentlyContinue
    }
}

# ============================================================================
# Step 6: Next steps
# ============================================================================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

Write-Info "Next Steps:"
Write-Host "  1. Integrate ADK adapter into agent/main.py (see docs/OBSERVABILITY_SETUP_SUMMARY.md)" -ForegroundColor White
Write-Host "  2. Start your agent and make some test queries" -ForegroundColor White
Write-Host "  3. Run evaluation:" -ForegroundColor White
Write-Host "     cd agent/evaluations" -ForegroundColor Yellow
Write-Host "     python run_evaluation.py --limit 10" -ForegroundColor Yellow
Write-Host "  4. View results:" -ForegroundColor White
Write-Host "     Query GreptimeDB: http://localhost:4000" -ForegroundColor Yellow
Write-Host "     Setup Grafana: docker run -d -p 3001:3000 grafana/grafana" -ForegroundColor Yellow
Write-Host ""

Write-Info "Documentation:"
Write-Host "  - Complete Guide: docs/AGENT_OBSERVABILITY_IMPLEMENTATION.md" -ForegroundColor White
Write-Host "  - Quick Summary: docs/OBSERVABILITY_SETUP_SUMMARY.md" -ForegroundColor White
Write-Host "  - GreptimeDB Quickstart: docs/inbox/GREPTIME_QUICKSTART.md" -ForegroundColor White
Write-Host ""

Write-Success "Agent observability is ready to use! 🚀"
Write-Host ""
