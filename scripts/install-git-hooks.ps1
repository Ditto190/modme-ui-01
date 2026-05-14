# Git Pre-Commit Hook Installer
# Automatically process docs/inbox before committing

Write-Host "📦 Installing pre-commit hook..." -ForegroundColor Cyan

if (-not (Test-Path ".git")) {
    Write-Host "❌ Not a git repository" -ForegroundColor Red
    exit 1
}

# Check if this is a worktree
$gitDir = ".git"
if (Test-Path ".git" -PathType Leaf) {
    $gitDirContent = Get-Content ".git" -Raw
    if ($gitDirContent -match "gitdir:\s*(.+)") {
        $gitDir = $matches[1].Trim()
        Write-Host "Detected worktree: $gitDir" -ForegroundColor Gray
    }
}

# Create hooks directory
$hooksDir = Join-Path $gitDir "hooks"
if (-not (Test-Path $hooksDir)) {
    New-Item -ItemType Directory -Path $hooksDir -Force | Out-Null
}

# Copy hook script
$scriptPath = "scripts\git-hooks\pre-commit.js"
$hookPath = Join-Path $hooksDir "pre-commit"
Copy-Item $scriptPath $hookPath -Force

Write-Host "✓ Installed pre-commit hook" -ForegroundColor Green
Write-Host ""
Write-Host "🤖 Hook will automatically:" -ForegroundColor Yellow
Write-Host "  1. Check docs/inbox/ for new documents"
Write-Host "  2. Run categorization + compression pipeline"
Write-Host "  3. Stage changes for commit"
Write-Host ""
Write-Host "To bypass: git commit --no-verify" -ForegroundColor Gray
Write-Host "To remove: Remove-Item '$hookPath'" -ForegroundColor Gray
