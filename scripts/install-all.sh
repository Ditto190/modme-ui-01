#!/bin/bash

# ============================================================
# ModMe GenUI Workbench - Complete Installation Script
# ============================================================
# This script handles all installation steps:
# 1. Prerequisites check
# 2. Node.js dependencies installation
# 3. Python agent setup
# 4. Environment configuration
# 5. Validation
# ============================================================

set -e

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${CYAN}▶ $1${NC}"
}

# Navigate to repository root
cd "$(dirname "$0")/.."
REPO_ROOT=$(pwd)

# Parse arguments
CHECK_ONLY=false
SKIP_VALIDATION=false
FORCE_REINSTALL=false

for arg in "$@"; do
    case $arg in
        --check-only)
            CHECK_ONLY=true
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
            ;;
        --force)
            FORCE_REINSTALL=true
            ;;
        --help)
            echo "Usage: ./scripts/install-all.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --check-only       Only check prerequisites, don't install"
            echo "  --skip-validation  Skip validation steps"
            echo "  --force            Force reinstall even if already installed"
            echo "  --help             Show this help message"
            exit 0
            ;;
    esac
done

# ============================================================
# STEP 1: Prerequisites Check
# ============================================================

print_header "Step 1: Prerequisites Check"

# Check Node.js
print_step "Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    MAJOR=$(echo $NODE_VERSION | cut -d. -f1 | sed 's/v//')
    MINOR=$(echo $NODE_VERSION | cut -d. -f2)
    
    if [ "$MAJOR" -ge 22 ] && [ "$MINOR" -ge 9 ]; then
        print_success "Node.js $NODE_VERSION (✓ >= 22.9.0)"
    else
        print_error "Node.js $NODE_VERSION is too old (need >= 22.9.0)"
        echo "  Install via nvm:"
        echo "    nvm install 22.9.0"
        echo "    nvm use 22.9.0"
        exit 1
    fi
else
    print_error "Node.js not found!"
    echo "  Visit: https://nodejs.org/"
    echo "  Or use nvm: https://github.com/nvm-sh/nvm"
    exit 1
fi

# Check npm
print_step "Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm $NPM_VERSION"
else
    print_error "npm not found (should come with Node.js)"
    exit 1
fi

# Check Python
print_step "Checking Python..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
    MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
    
    if [ "$MAJOR" -ge 3 ] && [ "$MINOR" -ge 12 ]; then
        print_success "Python $PYTHON_VERSION (✓ >= 3.12)"
    else
        print_warning "Python $PYTHON_VERSION (recommended: >= 3.12)"
    fi
else
    print_error "Python not found!"
    echo "  Visit: https://www.python.org/downloads/"
    exit 1
fi

# Check uv
print_step "Checking uv..."
if command -v uv &> /dev/null; then
    UV_VERSION=$(uv --version 2>&1 | grep -oP '\d+\.\d+\.\d+' | head -1)
    print_success "uv $UV_VERSION"
else
    print_warning "uv not found (Python package manager)"
    print_info "Installing uv..."
    pip install uv || {
        print_error "Failed to install uv. Install manually:"
        echo "  pip install uv"
        echo "  OR: curl -LsSf https://astral.sh/uv/install.sh | sh"
        exit 1
    }
    print_success "uv installed"
fi

# Check git
print_step "Checking git..."
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    print_success "git $GIT_VERSION"
else
    print_error "git not found!"
    exit 1
fi

if [ "$CHECK_ONLY" = true ]; then
    echo ""
    print_success "All prerequisites satisfied!"
    exit 0
fi

# ============================================================
# STEP 2: Environment Configuration
# ============================================================

print_header "Step 2: Environment Configuration"

if [ ! -f .env ]; then
    print_step "Creating .env from template..."
    if [ -f .env.example ]; then
        cp .env.example .env
        print_success ".env created"
        print_warning "Please edit .env and add your GOOGLE_API_KEY"
        echo "  Get key from: https://aistudio.google.com/app/apikey"
    else
        print_error ".env.example not found!"
    fi
else
    print_info ".env already exists (keeping existing)"
fi

# Check if GOOGLE_API_KEY is set
if grep -q "REPLACE_ME_GOOGLE_API_KEY" .env 2>/dev/null || ! grep -q "GOOGLE_API_KEY=" .env 2>/dev/null; then
    print_warning "GOOGLE_API_KEY not configured in .env"
    echo "  The agent will not work without this key"
    echo "  Get it from: https://aistudio.google.com/app/apikey"
fi

# ============================================================
# STEP 3: Node.js Dependencies
# ============================================================

print_header "Step 3: Node.js Dependencies"

if [ "$FORCE_REINSTALL" = true ] || [ ! -d "node_modules" ]; then
    if [ "$FORCE_REINSTALL" = true ] && [ -d "node_modules" ]; then
        print_step "Removing existing node_modules..."
        rm -rf node_modules
    fi
    
    print_step "Installing Node.js dependencies..."
    npm install
    print_success "Node.js dependencies installed"
else
    print_info "node_modules exists (use --force to reinstall)"
fi

# ============================================================
# STEP 4: Python Agent Setup
# ============================================================

print_header "Step 4: Python Agent Setup"

cd "$REPO_ROOT/agent"

if [ "$FORCE_REINSTALL" = true ] || [ ! -d ".venv" ]; then
    if [ "$FORCE_REINSTALL" = true ] && [ -d ".venv" ]; then
        print_step "Removing existing .venv..."
        rm -rf .venv
    fi
    
    print_step "Installing Python dependencies with uv..."
    uv sync
    print_success "Python dependencies installed"
else
    print_info ".venv exists (use --force to reinstall)"
fi

cd "$REPO_ROOT"

# ============================================================
# STEP 5: Validation (optional)
# ============================================================

if [ "$SKIP_VALIDATION" = false ]; then
    print_header "Step 5: Validation"
    
    print_step "Validating toolsets..."
    npm run validate:toolsets || print_warning "Toolset validation failed (non-critical)"
    
    print_step "Running linter..."
    npm run lint || print_warning "Linting errors found (fix with: npm run lint:fix)"
    
    print_success "Validation complete"
fi

# ============================================================
# SUMMARY
# ============================================================

print_header "Installation Complete! 🎉"

echo ""
echo "Next steps:"
echo ""
echo "1. Configure API key (if not done):"
echo "   ${CYAN}nano .env${NC}  # Add GOOGLE_API_KEY"
echo ""
echo "2. Start development servers:"
echo "   ${CYAN}npm run dev${NC}"
echo ""
echo "3. Open browser:"
echo "   ${CYAN}http://localhost:3000${NC} (Next.js UI)"
echo "   ${CYAN}http://localhost:8000/health${NC} (Agent health)"
echo ""
echo "4. Read documentation:"
echo "   ${CYAN}.github/copilot-instructions.md${NC} (Architecture)"
echo "   ${CYAN}INSTALLATION_GUIDE.md${NC} (Full guide)"
echo ""
print_success "Ready to build! 🚀"
echo ""
