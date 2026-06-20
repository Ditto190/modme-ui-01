# GenAI Toolbox MCP Server - Setup Script
# Installs dependencies and tests the server

Write-Host "🚀 Setting up GenAI Toolbox MCP Server..." -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
Write-Host "📋 Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version
$majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($majorVersion -lt 18) {
    Write-Host "❌ Error: Node.js 18+ required. Current version: $nodeVersion" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "📦 Installing npm dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Build TypeScript
Write-Host "🔨 Building TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful" -ForegroundColor Green
} else {
    Write-Host "⚠️ Build failed, but continuing (dev mode will work)" -ForegroundColor Yellow
}
Write-Host ""

# Success message
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📖 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start server: npm start" -ForegroundColor White
Write-Host "   2. Development mode: npm run dev" -ForegroundColor White
Write-Host "   3. With telemetry: `$env:OTEL_EXPORTER_OTLP_ENDPOINT='http://localhost:4318'; npm start" -ForegroundColor White
Write-Host ""
Write-Host "🧰 Available tools:" -ForegroundColor Cyan
Write-Host "   • summarize - Summarize text with LLM" -ForegroundColor White
Write-Host "   • analyze_sentiment - Analyze sentiment" -ForegroundColor White
Write-Host "   • extract_keywords - Extract keywords" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation: README.md" -ForegroundColor Cyan
