#!/bin/bash

set -e

echo "🚀 Starting post-create setup for ModMe GenUI Workspace..."

# Ensure we're in the workspace directory
cd "${WORKSPACE_FOLDER:-/workspaces/modme-ui-01}"

# Check Node.js version
echo "📦 Node.js version:"
node --version

# Check Python version
echo "🐍 Python version:"
python3 --version

# Check uv installation
echo "📦 UV package manager:"
uv --version || echo "⚠️  UV not found, will use pip fallback"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
if [ -f "package.json" ]; then
    npm install
else
    echo "⚠️  No package.json found"
fi

# Set up Python agent environment
echo "🐍 Setting up Python agent environment..."
if [ -f "agent/pyproject.toml" ]; then
    cd agent
    
    # Use uv if available, otherwise use pip
    if command -v uv &> /dev/null; then
        echo "Using uv for Python package management..."
        uv sync
    else
        echo "Using pip for Python package management..."
        python3 -m venv .venv
        source .venv/bin/activate
        pip install --upgrade pip
        pip install -e .
    fi
    
    cd ..
else
    echo "⚠️  No agent/pyproject.toml found"
fi

# Create data directory if it doesn't exist (for local client data)
echo "📁 Creating data directory..."
mkdir -p data

# Copy .env.example to .env if .env doesn't exist
if [ -f ".env.example" ] && [ ! -f ".env" ]; then
    echo "📋 Copying .env.example to .env..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration"
fi

# Set up git hooks (if any)
if [ -d ".githooks" ]; then
    echo "🪝 Setting up git hooks..."
    git config core.hooksPath .githooks
fi

echo "✅ Post-create setup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Update .env with your API keys (especially GOOGLE_API_KEY)"
echo "  2. Run 'npm run dev' to start both UI and agent servers"
echo "  3. Access the UI at http://localhost:3000"
echo "  4. Access the agent at http://localhost:8000"
echo ""
echo "Happy coding! 🎉"
