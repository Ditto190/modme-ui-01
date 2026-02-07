#!/bin/bash
# Setup Phoenix Observability for ModMe GenUI Workspace
# Usage: ./scripts/setup-phoenix.sh

set -e

echo "🚀 Setting up Phoenix + OpenInference Observability..."
echo ""

# 1. Check if Phoenix dependencies are installed
echo "📦 Installing Python dependencies..."
cd agent
if [ -f "requirements-phoenix.txt" ]; then
    pip install -r requirements-phoenix.txt
    echo "✅ Phoenix dependencies installed"
else
    echo "❌ requirements-phoenix.txt not found"
    exit 1
fi
cd ..

# 2. Copy environment file
echo ""
echo "📝 Setting up environment configuration..."
if [ ! -f ".env.local" ]; then
    cp .env.phoenix.example .env.local
    echo "✅ Created .env.local from template"
    echo "⚠️  Please edit .env.local with your configuration"
else
    echo "ℹ️  .env.local already exists"
fi

# 3. Start Phoenix server
echo ""
echo "🐳 Starting Phoenix server..."
if command -v docker-compose &> /dev/null; then
    docker-compose -f docker-compose.phoenix.yml up -d
    echo "✅ Phoenix server started"
    echo "📊 Phoenix UI: http://localhost:6006"
elif command -v docker &> /dev/null; then
    docker run -d \
        --name phoenix-server \
        -p 6006:6006 \
        -p 4317:4317 \
        -v phoenix-data:/data \
        -e PHOENIX_SQL_DATABASE_URL=sqlite:////data/phoenix.db \
        arizephoenix/phoenix:latest
    echo "✅ Phoenix server started (Docker)"
    echo "📊 Phoenix UI: http://localhost:6006"
else
    echo "⚠️  Docker not found. Phoenix server not started."
    echo "💡 Install Docker or run manually: python -m phoenix.server.main serve"
fi

# 4. Wait for Phoenix to be ready
echo ""
echo "⏳ Waiting for Phoenix to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:6006 > /dev/null 2>&1; then
        echo "✅ Phoenix is ready!"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo "⚠️  Phoenix took too long to start. Check logs: docker logs phoenix-server"
    fi
done

# 5. Configure genai-toolbox (if exists)
echo ""
if [ -d "agent/genai-toolbox" ]; then
    echo "🔧 Configuring genai-toolbox for Phoenix..."
    echo "export TELEMETRY_OTLP_ENDPOINT=http://localhost:6006/v1/traces" >> agent/genai-toolbox/.env
    echo "export TELEMETRY_SERVICE_NAME=genai-toolbox" >> agent/genai-toolbox/.env
    echo "✅ Genai-toolbox configured"
else
    echo "ℹ️  Genai-toolbox not found (optional)"
fi

# 6. Test setup
echo ""
echo "🧪 Testing Phoenix setup..."
if command -v python3 &> /dev/null; then
    python3 -c "
import sys
sys.path.insert(0, 'agent')
try:
    from observability import initialize_phoenix, instrument_all_providers
    print('✅ Phoenix imports successful')
    print('✅ Setup complete!')
except Exception as e:
    print(f'❌ Import failed: {e}')
    sys.exit(1)
"
else
    echo "⚠️  Python3 not found. Skipping import test."
fi

# 7. Print next steps
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Phoenix setup complete!"
echo ""
echo "📊 Phoenix UI: http://localhost:6006"
echo "🔌 OTLP Collector: http://localhost:6006/v1/traces"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your configuration"
echo "2. Add to your agent code:"
echo "   from observability import initialize_phoenix, instrument_all_providers"
echo "   tracer, config = initialize_phoenix()"
echo "   instrumentors = instrument_all_providers()"
echo "3. Run your agent and view traces at http://localhost:6006"
echo ""
echo "📚 Documentation: docs/PHOENIX_OBSERVABILITY.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
