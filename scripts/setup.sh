#!/bin/bash

set -e

echo "🚀 ModMe GenUI Workspace Setup"
echo "=============================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running in devcontainer
if [ -n "$WORKSPACE_TYPE" ] && [ "$WORKSPACE_TYPE" = "genui-devcontainer" ]; then
    echo "🐳 Running in DevContainer"
fi

# Navigate to repository root
cd "$(dirname "$0")/.."

# Check Node.js version
echo "📦 Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js $NODE_VERSION found"
    
    # Check if version is >= 22.9.0
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1 | sed 's/v//')
    if [ "$MAJOR_VERSION" -lt 22 ]; then
        print_warning "Node.js version should be 22.9.0 or higher"
        print_warning "Current version: $NODE_VERSION"
        print_warning "Consider using nvm to install the correct version:"
        echo "  nvm install 22.9.0"
        echo "  nvm use 22.9.0"
    fi
else
    print_error "Node.js not found!"
    echo "Please install Node.js 22.9.0 or higher"
    echo "Visit: https://nodejs.org/ or use nvm"
    exit 1
fi

# Check Python version
echo ""
echo "🐍 Checking Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    print_success "$PYTHON_VERSION found"
    
    # Check if version is >= 3.12
    PYTHON_MINOR=$(python3 --version | cut -d. -f2)
    if [ "$PYTHON_MINOR" -lt 12 ]; then
        print_warning "Python version should be 3.12 or higher"
        print_warning "Current version: $PYTHON_VERSION"
    fi
else
    print_error "Python 3 not found!"
    echo "Please install Python 3.12 or higher"
    exit 1
fi

# Check for uv
echo ""
echo "📦 Checking Python package manager..."
if command -v uv &> /dev/null; then
    UV_VERSION=$(uv --version)
    print_success "uv $UV_VERSION found"
    USE_UV=true
else
    print_warning "uv not found, will use pip instead"
    print_warning "Consider installing uv for faster Python package management:"
    echo "  curl -LsSf https://astral.sh/uv/install.sh | sh"
    USE_UV=false
fi

# Install Node.js dependencies
echo ""
echo "📦 Installing Node.js dependencies..."
if [ -f "package.json" ]; then
    npm install
    print_success "Node.js dependencies installed"
else
    print_error "package.json not found!"
    exit 1
fi

# Set up Python agent environment
echo ""
echo "🤖 Setting up Python agent environment..."
if [ -f "agent/pyproject.toml" ]; then
    cd agent
    
    if [ "$USE_UV" = true ]; then
        echo "Using uv for Python package management..."
        uv sync
        print_success "Python agent dependencies installed with uv"
    else
        echo "Using pip for Python package management..."
        if [ ! -d ".venv" ]; then
            python3 -m venv .venv
            print_success "Virtual environment created"
        fi
        
        source .venv/bin/activate
        pip install --upgrade pip
        pip install -e .
        print_success "Python agent dependencies installed with pip"
        deactivate
    fi
    
    cd ..
else
    print_error "agent/pyproject.toml not found!"
    exit 1
fi

# Create data directory
echo ""
echo "📁 Setting up data directory..."
mkdir -p data
print_success "Data directory created"

# Set up environment file
echo ""
echo "📝 Setting up environment file..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success ".env file created from .env.example"
        print_warning "Please update .env with your configuration (especially GOOGLE_API_KEY)"
    else
        print_warning ".env.example not found, skipping .env creation"
    fi
else
    print_success ".env file already exists"
fi

# Final instructions
echo ""
echo "=============================="
print_success "Setup complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Update .env with your API keys (especially GOOGLE_API_KEY)"
echo "     Get your Google API key from: https://makersuite.google.com/app/apikey"
echo ""
echo "  2. Start the development servers:"
echo "     npm run dev"
echo ""
echo "  3. Access the application:"
echo "     UI:    http://localhost:3000"
echo "     Agent: http://localhost:8000"
echo ""
echo "Happy coding! 🎉"
