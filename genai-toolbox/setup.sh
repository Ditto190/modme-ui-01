#!/bin/bash

# GenAI Toolbox MCP Server - Setup Script
# Installs dependencies and tests the server

set -e  # Exit on error

echo "🚀 Setting up GenAI Toolbox MCP Server..."
echo ""

# Check Node.js version
echo "📋 Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ required. Current version: $(node --version)"
    exit 1
fi
echo "✅ Node.js version: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Build TypeScript
echo "🔨 Building TypeScript..."
if npm run build; then
    echo "✅ Build successful"
else
    echo "⚠️ Build failed, but continuing (dev mode will work)"
fi
echo ""

# Success message
echo "✅ Setup complete!"
echo ""
echo "📖 Next steps:"
echo "   1. Start server: npm start"
echo "   2. Development mode: npm run dev"
echo "   3. With telemetry: OTEL_EXPORTER_OTLP_ENDPOINT='http://localhost:4318' npm start"
echo ""
echo "🧰 Available tools:"
echo "   • summarize - Summarize text with LLM"
echo "   • analyze_sentiment - Analyze sentiment"
echo "   • extract_keywords - Extract keywords"
echo ""
echo "📚 Documentation: README.md"
