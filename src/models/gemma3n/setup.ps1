# Gemma3N Model Setup Script
# Installs dependencies and tests the embedding model

Write-Host "🚀 Setting up Gemma3N Feature Extraction Model..." -ForegroundColor Cyan
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

# Install npm dependencies
Write-Host "📦 Installing npm dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Test the model
Write-Host "🧪 Testing embedding model..." -ForegroundColor Yellow
node test_embeddings.js

# Check if test passed
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Setup complete! Model is ready to use." -ForegroundColor Green
    Write-Host ""
    Write-Host "📖 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Update agent/skills_ref/journal.py to import embeddings_gemma3n"
    Write-Host "   2. Test Python bridge: python agent/skills_ref/embeddings_gemma3n.py"
    Write-Host "   3. Run journal CLI: python agent/skills_ref/journal_cli.py add `"Test entry`""
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Tests failed. Check the output above for errors." -ForegroundColor Red
    exit 1
}
