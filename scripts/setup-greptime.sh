#!/bin/bash
# GreptimeDB Setup and Initialization Script
# 
# This script installs GreptimeDB locally and configures the environment.

set -e  # Exit on error

echo "🚀 GreptimeDB Setup for ModMe GenUI Workbench"
echo "=============================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on macOS or Linux
OS="$(uname -s)"
case "${OS}" in
    Linux*)     MACHINE=Linux;;
    Darwin*)    MACHINE=Mac;;
    *)          MACHINE="UNKNOWN:${OS}"
esac

echo -e "${GREEN}Detected OS: ${MACHINE}${NC}\n"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Docker
if command_exists docker; then
    echo -e "${GREEN}✓ Docker found${NC}"
    USE_DOCKER=true
else
    echo -e "${YELLOW}⚠ Docker not found, will use binary installation${NC}"
    USE_DOCKER=false
fi

# Install GreptimeDB
echo -e "\n📦 Installing GreptimeDB..."

if [ "$USE_DOCKER" = true ]; then
    echo "Using Docker..."
    
    # Pull image
    docker pull greptime/greptimedb:latest
    
    # Stop existing container if running
    docker stop greptimedb 2>/dev/null || true
    docker rm greptimedb 2>/dev/null || true
    
    # Start GreptimeDB
    echo "Starting GreptimeDB container..."
    docker run -d --name greptimedb \
        -p 4000-4004:4000-4004 \
        -v greptimedb_data:/tmp/greptimedb \
        greptime/greptimedb:latest standalone start
    
    echo -e "${GREEN}✓ GreptimeDB container started${NC}"
    
else
    echo "Installing binary..."
    
    # Download based on OS
    if [ "$MACHINE" = "Mac" ]; then
        DOWNLOAD_URL="https://github.com/GreptimeTeam/greptimedb/releases/download/v0.6.1/greptime-darwin-arm64-v0.6.1.tar.gz"
    elif [ "$MACHINE" = "Linux" ]; then
        DOWNLOAD_URL="https://github.com/GreptimeTeam/greptimedb/releases/download/v0.6.1/greptime-linux-amd64-v0.6.1.tar.gz"
    else
        echo -e "${RED}✗ Unsupported OS${NC}"
        exit 1
    fi
    
    # Create directory
    mkdir -p ~/.greptimedb
    cd ~/.greptimedb
    
    # Download and extract
    curl -L -o greptime.tar.gz "$DOWNLOAD_URL"
    tar -xzf greptime.tar.gz
    rm greptime.tar.gz
    
    # Make executable
    chmod +x greptime-*/greptime
    
    # Add to PATH
    echo "export PATH=\"\$HOME/.greptimedb/greptime-*:\$PATH\"" >> ~/.bashrc
    echo "export PATH=\"\$HOME/.greptimedb/greptime-*:\$PATH\"" >> ~/.zshrc
    
    echo -e "${GREEN}✓ GreptimeDB binary installed${NC}"
    echo -e "${YELLOW}⚠ Restart your terminal or run: source ~/.bashrc${NC}"
fi

# Configure environment
echo -e "\n⚙️  Configuring environment..."

cd "$(git rev-parse --show-toplevel)" 2>/dev/null || cd "$(pwd)"

if [ ! -f .env ]; then
    if [ -f .env.greptime.example ]; then
        cp .env.greptime.example .env
        echo -e "${GREEN}✓ Created .env from .env.greptime.example${NC}"
    else
        cat > .env << EOF
GREPTIME_HOST=localhost:4000
GREPTIME_DB=public
GREPTIME_USERNAME=
GREPTIME_PASSWORD=
SERVICE_NAME=modme-genui-agent
SERVICE_VERSION=0.1.0
ENVIRONMENT=development
EOF
        echo -e "${GREEN}✓ Created .env with default settings${NC}"
    fi
else
    echo -e "${YELLOW}⚠ .env already exists, skipping${NC}"
fi

# Verify connection
echo -e "\n🔍 Verifying GreptimeDB connection..."

sleep 3  # Wait for startup

if curl -s http://localhost:4000/health > /dev/null; then
    echo -e "${GREEN}✓ GreptimeDB is running and accessible${NC}"
    
    # Show version
    VERSION=$(curl -s http://localhost:4000/health | grep -o '"version":"[^"]*' | cut -d'"' -f4)
    echo -e "${GREEN}  Version: ${VERSION}${NC}"
else
    echo -e "${RED}✗ Could not connect to GreptimeDB${NC}"
    echo -e "${YELLOW}  Try manually starting it:${NC}"
    if [ "$USE_DOCKER" = true ]; then
        echo "    docker start greptimedb"
    else
        echo "    greptime standalone start"
    fi
    exit 1
fi

# Install Node.js dependencies for observability
echo -e "\n📦 Installing Node.js observability dependencies..."

cd src/lib/observability
if [ -f package.json ]; then
    npm install
    echo -e "${GREEN}✓ Node.js dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ No package.json found in src/lib/observability${NC}"
fi

cd ../../..

# Summary
echo -e "\n✅ Setup complete!"
echo -e "\nNext steps:"
echo -e "  1. Start your application: ${GREEN}npm run dev${NC}"
echo -e "  2. View metrics at: ${GREEN}http://localhost:4000${NC}"
echo -e "  3. Read docs: ${GREEN}docs/GREPTIME_OBSERVABILITY.md${NC}"
echo -e "\nQuick test:"
echo -e "  ${GREEN}curl http://localhost:4000/v1/sql -X POST \\
    -H 'Content-Type: application/x-www-form-urlencoded' \\
    -d 'sql=SHOW TABLES'${NC}"

echo -e "\n🎉 Happy monitoring!"
