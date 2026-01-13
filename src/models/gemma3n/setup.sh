#!/bin/bash

# Gemma3N Model Setup Script
# Installs dependencies and tests the embedding model

set -e  # Exit on error

echo "🚀 Setting up Gemma3N Feature Extraction Model..."
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

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Test the model
echo "🧪 Testing embedding model..."
node test_embeddings.js

# Check if test passed
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Setup complete! Model is ready to use."
    echo ""
    echo "📖 Next steps:"
    echo "   1. Update agent/skills_ref/journal.py to import embeddings_gemma3n"
    echo "   2. Test Python bridge: python agent/skills_ref/embeddings_gemma3n.py"
    echo "   3. Run journal CLI: python agent/skills_ref/journal_cli.py add \"Test entry\""
    echo ""
else
    echo ""
    echo "❌ Tests failed. Check the output above for errors."
    exit 1
fi
