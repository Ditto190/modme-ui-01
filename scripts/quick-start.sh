#!/bin/bash

# ============================================================
# Quick Start Script - Get up and running in seconds
# ============================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${CYAN}🚀 ModMe GenUI Workbench - Quick Start${NC}"
echo ""

# Navigate to repo root
cd "$(dirname "$0")/.."

# Step 1: Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Dependencies not installed. Running full installation...${NC}"
    ./scripts/install-all.sh
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi

# Step 2: Check .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env not found. Creating from template...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env and add your GOOGLE_API_KEY before starting${NC}"
    exit 1
fi

# Step 3: Verify API key
if grep -q "REPLACE_ME_GOOGLE_API_KEY" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  GOOGLE_API_KEY not configured in .env${NC}"
    echo "   Get it from: https://aistudio.google.com/app/apikey"
    exit 1
fi

# Step 4: Start services
echo ""
echo -e "${GREEN}✅ Starting development servers...${NC}"
echo ""
echo "   UI:    http://localhost:3000"
echo "   Agent: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

npm run dev
