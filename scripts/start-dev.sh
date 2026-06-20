#!/bin/bash

set -e

echo "🚀 Starting ModMe GenUI Development Servers"
echo "==========================================="
echo ""

# Navigate to repository root
cd "$(dirname "$0")/.."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ .env created. Please update it with your configuration."
        echo "Press Enter to continue after updating .env, or Ctrl+C to exit..."
        read
    else
        echo "❌ .env.example not found. Cannot continue."
        exit 1
    fi
fi

# Check for GOOGLE_API_KEY
if ! grep -q "GOOGLE_API_KEY=.*[a-zA-Z0-9]" .env; then
    echo "⚠️  GOOGLE_API_KEY not set in .env"
    echo "The agent will not work without a valid API key."
    echo "Get your API key from: https://makersuite.google.com/app/apikey"
    echo ""
    echo "Do you want to continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        exit 0
    fi
fi

# Load environment variables
set -a
source .env
set +a

echo "✅ Environment loaded"
echo ""
echo "Starting servers..."
echo "  📱 UI:    http://localhost:${PORT:-3000}"
echo "  🤖 Agent: http://localhost:${AGENT_PORT:-8000}"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Start both servers using npm script
npm run dev
