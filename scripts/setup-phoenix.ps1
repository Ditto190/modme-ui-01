# Setup Phoenix Observability for ModMe GenUI Workspace
# Usage: .\scripts\setup-phoenix.ps1

Write-Host "🚀 Setting up Phoenix + OpenInference Observability..." -ForegroundColor Cyan
Write-Host ""

# 1. Check if Phoenix dependencies are installed
Write-Host "📦 Installing Python dependencies..." -ForegroundColor Yellow
Push-Location agent
if (Test-Path "requirements-phoenix.txt") {
    pip install -r requirements-phoenix.txt
    Write-Host "✅ Phoenix dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ requirements-phoenix.txt not found" -ForegroundColor Red
    exit 1
}
Pop-Location

# 2. Copy environment file
Write-Host ""
Write-Host "📝 Setting up environment configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Copy-Item .env.phoenix.example .env.local
    Write-Host "✅ Created .env.local from template" -ForegroundColor Green
    Write-Host "⚠️  Please edit .env.local with your configuration" -ForegroundColor Yellow
} else {
    Write-Host "ℹ️  .env.local already exists" -ForegroundColor Cyan
}

# 3. Start Phoenix server
Write-Host ""
Write-Host "🐳 Starting Phoenix server..." -ForegroundColor Yellow
if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    docker-compose -f docker-compose.phoenix.yml up -d
    Write-Host "✅ Phoenix server started" -ForegroundColor Green
    Write-Host "📊 Phoenix UI: http://localhost:6006" -ForegroundColor Cyan
} elseif (Get-Command docker -ErrorAction SilentlyContinue) {
    docker run -d `
        --name phoenix-server `
        -p 6006:6006 `
        -p 4317:4317 `
        -v phoenix-data:/data `
        -e PHOENIX_SQL_DATABASE_URL=sqlite:////data/phoenix.db `
        arizephoenix/phoenix:latest
    Write-Host "✅ Phoenix server started (Docker)" -ForegroundColor Green
    Write-Host "📊 Phoenix UI: http://localhost:6006" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  Docker not found. Phoenix server not started." -ForegroundColor Yellow
    Write-Host "💡 Install Docker or run manually: python -m phoenix.server.main serve" -ForegroundColor Yellow
}

# 4. Wait for Phoenix to be ready
Write-Host ""
Write-Host "⏳ Waiting for Phoenix to be ready..." -ForegroundColor Yellow
$ready = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:6006" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
        Write-Host "✅ Phoenix is ready!" -ForegroundColor Green
        $ready = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}
if (-not $ready) {
    Write-Host "⚠️  Phoenix took too long to start. Check logs: docker logs phoenix-server" -ForegroundColor Yellow
}

# 5. Configure genai-toolbox (if exists)
Write-Host ""
if (Test-Path "agent/genai-toolbox") {
    Write-Host "🔧 Configuring genai-toolbox for Phoenix..." -ForegroundColor Yellow
    Add-Content -Path "agent/genai-toolbox/.env" -Value "TELEMETRY_OTLP_ENDPOINT=http://localhost:6006/v1/traces"
    Add-Content -Path "agent/genai-toolbox/.env" -Value "TELEMETRY_SERVICE_NAME=genai-toolbox"
    Write-Host "✅ Genai-toolbox configured" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Genai-toolbox not found (optional)" -ForegroundColor Cyan
}

# 6. Test setup
Write-Host ""
Write-Host "🧪 Testing Phoenix setup..." -ForegroundColor Yellow
if (Get-Command python -ErrorAction SilentlyContinue) {
    $env:PYTHONPATH = "agent"
    python -c @"
import sys
sys.path.insert(0, 'agent')
try:
    from observability import initialize_phoenix, instrument_all_providers
    print('✅ Phoenix imports successful')
    print('✅ Setup complete!')
except Exception as e:
    print(f'❌ Import failed: {e}')
    sys.exit(1)
"@
} else {
    Write-Host "⚠️  Python not found. Skipping import test." -ForegroundColor Yellow
}

# 7. Print next steps
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Phoenix setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Phoenix UI: http://localhost:6006" -ForegroundColor Cyan
Write-Host "🔌 OTLP Collector: http://localhost:6006/v1/traces" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Edit .env.local with your configuration"
Write-Host "2. Add to your agent code:"
Write-Host "   from observability import initialize_phoenix, instrument_all_providers"
Write-Host "   tracer, config = initialize_phoenix()"
Write-Host "   instrumentors = instrument_all_providers()"
Write-Host "3. Run your agent and view traces at http://localhost:6006"
Write-Host ""
Write-Host "📚 Documentation: docs/PHOENIX_OBSERVABILITY.md" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
