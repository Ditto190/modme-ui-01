# Git Pre-Commit Hook Installer
# Automatically process docs/inbox before committing

$hookPath = ".git\hooks\pre-commit"
$scriptPath = "scripts\git-hooks\pre-commit.js"

Write-Host "📦 Installing pre-commit hook..." -ForegroundColor Cyan

if (-not (Test-Path ".git")) {
    Write-Host "❌ Not a git repository" -ForegroundColor Red
    exit 1
}

# Create hooks directory if needed
$hooksDir = ".git\hooks"
if (-not (Test-Path $hooksDir)) {
    New-Item -ItemType Directory -Path $hooksDir | Out-Null
}

# Copy hook script
Copy-Item $scriptPath $hookPath -Force

Write-Host "✓ Installed pre-commit hook" -ForegroundColor Green
Write-Host ""
Write-Host "🤖 Hook will automatically:" -ForegroundColor Yellow  
Write-Host "  1. Check docs/inbox/ for new documents"
Write-Host "  2. Run categorization + compression pipeline"
Write-Host "  3. Stage changes for commit"
Write-Host ""
Write-Host "To bypass: git commit --no-verify" -ForegroundColor Gray
Write-Host "To remove: del .git\hooks\pre-commit" -ForegroundColor Gray