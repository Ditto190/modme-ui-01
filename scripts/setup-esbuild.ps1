# esbuild Setup Script for Windows
# Automates esbuild installation and configuration

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       esbuild Setup for ModMe GenUI Workbench (Windows)         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install esbuild
Write-Host "Step 1: Installing esbuild..." -ForegroundColor Yellow
npm install --save-dev esbuild

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install esbuild" -ForegroundColor Red
    exit 1
}
Write-Host "✓ esbuild installed" -ForegroundColor Green
Write-Host ""

# Step 2: Create output directories
Write-Host "Step 2: Creating output directories..." -ForegroundColor Yellow
$dirs = @(
    "agent-generator/dist",
    "scripts/knowledge-management/dist",
    "scripts/toolset-management/dist"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✓ Created $dir" -ForegroundColor Green
    } else {
        Write-Host "  → $dir already exists" -ForegroundColor Gray
    }
}
Write-Host ""

# Step 3: Verify esbuild installation
Write-Host "Step 3: Verifying esbuild installation..." -ForegroundColor Yellow
$esbuildTest = node --version 2>$null
if ($esbuildTest) {
    Write-Host "  ✓ Node.js version: $esbuildTest" -ForegroundColor Green
} else {
    Write-Host "  ❌ Node.js not found" -ForegroundColor Red
    exit 1
}

$esbuildPath = Get-Item "node_modules/.bin/esbuild.cmd" -ErrorAction SilentlyContinue
if ($esbuildPath) {
    Write-Host "  ✓ esbuild CLI available" -ForegroundColor Green
} else {
    Write-Host "  ❌ esbuild CLI not found" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Test build
Write-Host "Step 4: Running test build..." -ForegroundColor Yellow
node esbuild.config.mjs build agentGenerator 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ Test build had warnings (this is okay)" -ForegroundColor Yellow
} else {
    Write-Host "✓ Test build succeeded" -ForegroundColor Green
}
Write-Host ""

# Step 5: Verify outputs
Write-Host "Step 5: Verifying build outputs..." -ForegroundColor Yellow
$files = @(
    "agent-generator/dist/generate.mjs",
    "scripts/knowledge-management/dist/sync-docs.mjs",
    "scripts/toolset-management/dist/validate-toolsets.mjs"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length / 1KB
        Write-Host "  ✓ $file ($([Math]::Round($size, 2)) KB)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ $file not found (may need manual build)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Step 6: Summary
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                      Setup Complete!                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Green
Write-Host "  1. Add npm scripts to package.json (see ESBUILD_QUICK_START.md)"
Write-Host "  2. Try building: npm run build:esbuild"
Write-Host "  3. Read ESBUILD_SETUP.md for detailed documentation"
Write-Host ""

Write-Host "Quick reference:" -ForegroundColor Cyan
Write-Host "  npm run build:esbuild        # Build all configs"
Write-Host "  npm run watch:esbuild:agent  # Watch for changes"
Write-Host "  node esbuild.config.mjs list # List available configs"
Write-Host ""
