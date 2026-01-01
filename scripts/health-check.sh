#!/bin/bash

set -e

echo "🏥 ModMe GenUI Workspace Health Check"
echo "====================================="
echo ""

# Navigate to repository root
cd "$(dirname "$0")/.."

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ISSUES=0

# Function to check and report
check_item() {
    local name=$1
    local command=$2
    local required=${3:-true}
    
    if eval "$command" &> /dev/null; then
        echo -e "${GREEN}✅${NC} $name"
        return 0
    else
        if [ "$required" = true ]; then
            echo -e "${RED}❌${NC} $name (REQUIRED)"
            ((ISSUES++))
        else
            echo -e "${YELLOW}⚠️${NC}  $name (OPTIONAL)"
        fi
        return 1
    fi
}

# Check Node.js
echo "📦 Node.js Environment"
check_item "Node.js installed" "command -v node"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "   Version: $NODE_VERSION"
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1 | sed 's/v//')
    if [ "$MAJOR_VERSION" -ge 22 ]; then
        echo -e "   ${GREEN}✅${NC} Version is compatible (>= 22.9.0)"
    else
        echo -e "   ${YELLOW}⚠️${NC}  Version should be >= 22.9.0"
        ((ISSUES++))
    fi
fi

check_item "npm installed" "command -v npm"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "   Version: $NPM_VERSION"
fi

echo ""

# Check Python
echo "🐍 Python Environment"
check_item "Python 3 installed" "command -v python3"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo "   Version: $PYTHON_VERSION"
    PYTHON_MAJOR=$(python3 --version | awk '{print $2}' | cut -d. -f1)
    PYTHON_MINOR=$(python3 --version | awk '{print $2}' | cut -d. -f2)
    if [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -ge 12 ]; then
        echo -e "   ${GREEN}✅${NC} Version is compatible (>= 3.12)"
    else
        echo -e "   ${YELLOW}⚠️${NC}  Version should be >= 3.12"
        ((ISSUES++))
    fi
fi

check_item "uv package manager" "command -v uv" false
if command -v uv &> /dev/null; then
    UV_VERSION=$(uv --version)
    echo "   Version: $UV_VERSION"
fi

echo ""

# Check project structure
echo "📁 Project Structure"
check_item "package.json exists" "test -f package.json"
check_item "node_modules installed" "test -d node_modules"
check_item "agent/pyproject.toml exists" "test -f agent/pyproject.toml"
check_item "agent/.venv exists" "test -d agent/.venv"
check_item ".env exists" "test -f .env"

echo ""

# Check configuration
echo "⚙️  Configuration"
if [ -f ".env" ]; then
    if grep -q "GOOGLE_API_KEY=.*[a-zA-Z0-9]" .env; then
        echo -e "${GREEN}✅${NC} GOOGLE_API_KEY is set"
    else
        echo -e "${YELLOW}⚠️${NC}  GOOGLE_API_KEY is not set"
        echo "   Get your API key from: https://makersuite.google.com/app/apikey"
        ((ISSUES++))
    fi
else
    echo -e "${RED}❌${NC} .env file not found"
    ((ISSUES++))
fi

echo ""

# Check Git
echo "🔧 Development Tools"
check_item "Git installed" "command -v git"
check_item "GitHub CLI (gh)" "command -v gh" false
check_item "Docker" "command -v docker" false

echo ""

# Port availability check
echo "🔌 Port Availability"
check_item "Port 3000 available" "! lsof -i:3000 > /dev/null 2>&1" false
check_item "Port 8000 available" "! lsof -i:8000 > /dev/null 2>&1" false

echo ""

# Summary
echo "====================================="
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ All critical checks passed!${NC}"
    echo ""
    echo "Your workspace is ready. Start development with:"
    echo "  npm run dev"
    exit 0
else
    echo -e "${RED}❌ Found $ISSUES issue(s)${NC}"
    echo ""
    echo "Please resolve the issues above before starting development."
    echo "Run './scripts/setup.sh' to set up the workspace."
    exit 1
fi
