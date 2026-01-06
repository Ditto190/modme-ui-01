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
echo "   npm: $(npm --version)"
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
echo "📦 Installing Node.js dependencies..."
if [ -f "package.json" ]; then
    npm install
    echo "   ✓ Dependencies installed"
else
    echo "   ⚠️  No package.json found - skipping npm install"
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

    echo "   ✓ Python agent configured"
    cd ..
else
    echo "   ⚠️  No agent/pyproject.toml found - skipping Python setup"
fi
echo ""

# ============================================================
# Section 5: Create Data Directories
# ============================================================
echo "📁 Setting up data directories..."
mkdir -p data/raw data/processed data/reports
echo "   ✓ Data structure created"
echo ""

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
echo "   npm run dev       → Start UI + Agent"
echo "   npm run dev:ui    → Start Next.js only"
echo "   npm run dev:agent → Start Python ADK only"
echo ""
echo "📖 Documentation:"
echo "   .devcontainer/README.md → Multi-worktree workflow"
echo "   DEVCONTAINER_WORKTREE_STRATEGY.md → Full setup guide"
echo "   MIGRATION_IMPLEMENTATION_PLAN.md → Turborepo roadmap"
echo ""
echo "🌿 Git Worktree Commands:"
echo "   git worktree list                          → Show all worktrees"
echo "   git worktree add ../feature-x -b feature/x → Create new worktree"
echo "   git worktree remove ../feature-x           → Remove worktree"
echo ""
echo "Happy coding! 🎉"
