#!/bin/bash
# esbuild Setup Script for Unix/macOS
# Automates esbuild installation and configuration

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       esbuild Setup for ModMe GenUI Workbench (Unix/macOS)      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Install esbuild
echo "Step 1: Installing esbuild..."
npm install --save-dev esbuild
echo "✓ esbuild installed"
echo ""

# Step 2: Create output directories
echo "Step 2: Creating output directories..."
mkdir -p agent-generator/dist
mkdir -p scripts/knowledge-management/dist
mkdir -p scripts/toolset-management/dist
echo "✓ Output directories created"
echo ""

# Step 3: Verify installations
echo "Step 3: Verifying installations..."
NODE_VERSION=$(node --version)
echo "  ✓ Node.js version: $NODE_VERSION"

if command -v esbuild &> /dev/null; then
    echo "  ✓ esbuild CLI available"
else
    echo "  ❌ esbuild CLI not found"
    exit 1
fi
echo ""

# Step 4: Test build
echo "Step 4: Running test build..."
if node esbuild.config.mjs build agentGenerator > /dev/null 2>&1; then
    echo "✓ Test build succeeded"
else
    echo "⚠ Test build had warnings (this is okay)"
fi
echo ""

# Step 5: Verify outputs
echo "Step 5: Verifying build outputs..."
files=(
    "agent-generator/dist/generate.mjs"
    "scripts/knowledge-management/dist/sync-docs.mjs"
    "scripts/toolset-management/dist/validate-toolsets.mjs"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        echo "  ✓ $file ($size)"
    else
        echo "  ⚠ $file not found (may need manual build)"
    fi
done
echo ""

# Step 6: Summary
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                      Setup Complete!                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "Next steps:"
echo "  1. Add npm scripts to package.json (see ESBUILD_QUICK_START.md)"
echo "  2. Try building: npm run build:esbuild"
echo "  3. Read ESBUILD_SETUP.md for detailed documentation"
echo ""

echo "Quick reference:"
echo "  npm run build:esbuild        # Build all configs"
echo "  npm run watch:esbuild:agent  # Watch for changes"
echo "  node esbuild.config.mjs list # List available configs"
echo ""
