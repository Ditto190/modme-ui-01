#!/bin/bash

set -e

echo "🚀 Starting post-create setup for ModMe GenUI Workspace (Multi-Worktree Mode)"
echo ""

# Ensure we're in the workspace directory
cd "${WORKSPACE_FOLDER:-.}"

# ============================================================
# Section 1: Detect Worktree Context
# ============================================================
echo "🔍 Detecting git context..."

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
WORKSPACE_NAME=$(basename "$(pwd)")

echo "   ✓ Workspace: $WORKSPACE_NAME"
echo "   ✓ Branch: $CURRENT_BRANCH"
echo "   ✓ Commit: $COMMIT_HASH"
echo ""

# ============================================================
# Section 2: Verify Prerequisites
# ============================================================
echo "📋 Verifying prerequisites..."

echo "   Node.js: $(node --version)"
echo "   Yarn: $(yarn --version 2>/dev/null || echo 'not installed')"
echo "   Python: $(python3 --version)"
echo "   Git: $(git --version)"
echo ""

# Check uv installation
echo "📦 Checking UV package manager..."
if uv --version >/dev/null 2>&1; then
    echo "   ✓ UV found: $(uv --version)"
else
    echo "   ℹ️  UV not found, will use pip fallback"
fi
echo ""

# ============================================================
# Section 3: Install Node Dependencies
# ============================================================
echo "📦 Installing root Yarn dependencies..."
if [ -f "package.json" ]; then
    if command -v corepack >/dev/null 2>&1; then
        corepack enable >/dev/null 2>&1 || true
        corepack prepare yarn@3.3.0 --activate >/dev/null 2>&1 || true
    fi
    yarn install
    echo "   ✓ Yarn dependencies installed"
else
    echo "   ⚠️  No package.json found - skipping yarn install"
fi
echo ""

# ============================================================
# Section 4: Setup Python Agent
# ============================================================
echo "🐍 Setting up Python agent environment..."
if [ -f "agent/pyproject.toml" ]; then
    cd agent

    # Create virtual environment if needed
    if [ ! -d ".venv" ]; then
        echo "   Creating virtual environment..."
        python3 -m venv .venv
    fi

    # Activate and install
    source .venv/bin/activate
    pip install --upgrade pip

    # Use uv if available, otherwise use pip
    if command -v uv &> /dev/null; then
        echo "   Using uv for Python dependencies..."
        uv sync
    else
        echo "   Using pip for Python dependencies..."
        pip install -e .
    fi

    cd ..
else
    echo "   ⚠️  No agent/pyproject.toml found - skipping Python setup"
fi
echo ""

# Install CodeQL CLI inside the container (if not present)
if command -v codeql &> /dev/null; then
    echo "✅ CodeQL already available in container"
else
    if [ -f ".devcontainer/install-codeql.sh" ]; then
        echo "📥 Installing CodeQL via .devcontainer/install-codeql.sh"
        bash .devcontainer/install-codeql.sh
    else
        echo "⚠️  No .devcontainer/install-codeql.sh found — skipping CodeQL install"
    fi
fi

# Create data directory if it doesn't exist (for local client data)
echo "📁 Creating data directory..."
mkdir -p data

# ============================================================
# Section 6: Environment Configuration
# ============================================================
echo "⚙️  Configuring environment..."
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    echo "   ✓ .env created from .env.example"
elif [ -f ".env" ]; then
    echo "   ✓ .env already exists"
fi

# Load Codespaces secrets if available
if [ -f ".devcontainer/load-codespaces-secrets.sh" ]; then
    bash .devcontainer/load-codespaces-secrets.sh
else
    echo "   ⚠️  Remember to update .env with your API keys!"
fi
echo ""

# ============================================================
# Section 7: Git Configuration
# ============================================================
echo "🌿 Configuring git..."

# Set up git hooks if directory exists
if [ -d ".githooks" ]; then
    echo "   Setting up git hooks..."
    git config core.hooksPath .githooks
    echo "   ✓ Git hooks configured"
fi

echo "   ✓ Git context ready for worktree development"
echo ""

# ============================================================
# Summary & Next Steps
# ============================================================
echo "════════════════════════════════════════════════════════"
echo "✨ DevContainer setup complete!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📊 Environment Summary:"
echo "   Branch: $CURRENT_BRANCH"
echo "   Workspace: $WORKSPACE_NAME"
echo "   Node: $(node --version)"
echo "   Python: $(python3 --version)"
echo ""
echo "🚀 Quick Start:"
echo "   yarn dev:forge:core  → next-forge app + web + api (3100–3102)"
echo "   yarn dev:forge:docs  → Mintlify docs (3104)"
echo "   yarn launch:health   → advisory env health check"
echo ""
echo "📖 Documentation:"
echo "   .cursor/commands/devcontainer-setup.md"
echo "   docs/debug-launch-guide.md"
echo "   AGENTS.md"
echo ""
echo "🌿 Git Worktree Commands:"
echo "   git worktree list                          → Show all worktrees"
echo "   git worktree add ../feature-x -b feature/x → Create new worktree"
echo "   git worktree remove ../feature-x           → Remove worktree"
echo ""
echo "Happy coding! 🎉"

# ModMe workspace bootstrap + launch (advisory)
if command -v yarn >/dev/null 2>&1; then
    echo ""
    echo "📦 ModMe workspace bootstrap..."
    if [ -f "scripts/setup-workspace-windows.ps1" ] && command -v pwsh >/dev/null 2>&1; then
        pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/setup-workspace-windows.ps1 -Lite || \
        yarn workspace:bootstrap:lite || true
    else
        yarn workspace:bootstrap:lite || yarn workspace:bootstrap:shared || true
    fi
    echo "🚀 ModMe launch (advisory)..."
    yarn launch:full || true
fi
