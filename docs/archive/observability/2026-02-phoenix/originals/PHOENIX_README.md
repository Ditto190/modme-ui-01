# Phoenix + OpenInference Observability

**Status**: ✅ Ready for Integration
**Last Updated**: February 8, 2026

## 📖 Overview

Complete implementation of Phoenix (Arize's AI observability platform) with OpenInference semantic conventions for capturing AI agent conversations from multiple providers (Anthropic/Claude, Google/Gemini, GitHub Copilot).

## 🎯 Key Features

- ✅ **Multi-Provider Support**: Anthropic, OpenAI, Google Generative AI
- ✅ **Auto-Instrumentation**: Zero code changes required
- ✅ **Dual Export**: Phoenix + GreptimeDB (optional)
- ✅ **Rich UI**: Traces, token analytics, latency metrics
- ✅ **Local Storage**: SQLite (dev) or PostgreSQL (prod)
- ✅ **Genai-Toolbox Integration**: Database tool tracing

## 🚀 Quick Start

### 1. Setup (Automated)

```bash
# Unix/macOS
./scripts/setup-phoenix.sh

# Windows
.\scripts\setup-phoenix.ps1
```

Or using npm:

```bash
npm run phoenix:setup
```

### 2. Manual Setup

```bash
# Install dependencies
pip install -r agent/requirements-phoenix.txt

# Copy environment file
cp .env.phoenix.example .env.local

# Start Phoenix server
docker-compose -f docker-compose.phoenix.yml up -d
# OR: npm run phoenix:start
```

### 3. Initialize in Your Agent

```python
from observability import initialize_phoenix, instrument_all_providers

# Initialize Phoenix
tracer, config = initialize_phoenix(
    enable_greptime=True,  # Dual export to GreptimeDB
    enable_console=False   # Debug mode
)

# Auto-instrument all providers
instrumentors = instrument_all_providers()

print(f"Phoenix UI: {config.phoenix_endpoint}")
```

### 4. View Traces

Open **<http://localhost:6006>** in your browser.

## 📚 Documentation

| Document                                                                   | Description                         |
| -------------------------------------------------------------------------- | ----------------------------------- |
| [Implementation Summary](PHOENIX_IMPLEMENTATION_SUMMARY.md)                | Complete implementation details     |
| [Full Guide](PHOENIX_OBSERVABILITY.md)                                     | Comprehensive setup and usage guide |
| [Quick Reference](PHOENIX_QUICK_REFERENCE.md)                              | Cheat sheet for developers          |
| [Architecture](PHOENIX_ARCHITECTURE.md)                                    | System architecture and data flow   |
| [Genai-Toolbox Integration](../agent/genai-toolbox/PHOENIX_INTEGRATION.md) | Database tool tracing               |

## 🔧 Configuration

### Environment Variables

```bash
# Phoenix endpoints
PHOENIX_ENDPOINT=http://localhost:6006
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006/v1/traces

# Service configuration
SERVICE_NAME=modme-agent
SERVICE_VERSION=0.1.0
ENVIRONMENT=development

# Feature flags
ENABLE_PHOENIX=true
ENABLE_GREPTIME_EXPORT=true
ENABLE_CONSOLE_EXPORT=false
```

### Python Configuration

```python
from observability.phoenix_config import PhoenixConfig

config = PhoenixConfig(
    phoenix_endpoint="http://localhost:6006",
    enable_console_export=True,  # Debug
    enable_greptime_export=True  # Dual export
)
```

## 🎨 Provider Auto-Instrumentation

### Anthropic (Claude)

```python
from anthropic import Anthropic

client = Anthropic()
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    messages=[{"role": "user", "content": "Hello!"}]
)
# Automatically traced! No code changes needed.
```

### OpenAI (GitHub Copilot)

```python
from openai import OpenAI

client = OpenAI()
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
# Automatically traced!
```

### Google Generative AI

```python
import google.generativeai as genai

genai.configure(api_key="your-key")
model = genai.GenerativeModel('gemini-2.0-flash')
response = model.generate_content("Hello!")
# Automatically traced!
```

## 📊 NPM Scripts

```bash
# Phoenix management
npm run phoenix:setup      # Run setup script
npm run phoenix:start      # Start Phoenix server
npm run phoenix:stop       # Stop Phoenix server
npm run phoenix:restart    # Restart Phoenix server
npm run phoenix:logs       # View Phoenix logs
npm run phoenix:ui         # Open Phoenix UI in browser

# Aliases
npm run observability:start  # Same as phoenix:start
npm run observability:stop   # Same as phoenix:stop
```

## 🐳 Docker Commands

```bash
# Start Phoenix
docker-compose -f docker-compose.phoenix.yml up -d

# Stop Phoenix
docker-compose -f docker-compose.phoenix.yml down

# View logs
docker logs phoenix-server -f

# Interactive shell
docker exec -it phoenix-server /bin/sh
```

## 📈 What Gets Traced

### AI SDK Calls

- Model name and parameters
- Token usage (input/output)
- Latency and response time
- Errors and exceptions
- Message content (optional)

### OpenInference Attributes

- `llm.provider` (e.g., "anthropic")
- `llm.model` (e.g., "claude-3-5-sonnet")
- `llm.token_count.prompt`
- `llm.token_count.completion`
- `llm.latency_ms`
- `llm.temperature`, `llm.max_tokens`

### Database Tools (genai-toolbox)

- SQL query execution
- Connection pooling metrics
- Query latency
- Error rates

## 🗄️ Storage Options

### SQLite (Default - Development)

```yaml
environment:
  - PHOENIX_SQL_DATABASE_URL=sqlite:////data/phoenix.db
```

- Zero configuration
- File-based storage
- Good for development

### PostgreSQL (Production)

```yaml
environment:
  - PHOENIX_SQL_DATABASE_URL=postgresql://user:password@postgres:5432/phoenix
```

- Concurrent access
- Scalable storage
- Production-ready

### Dual Export (Phoenix + GreptimeDB)

Export traces to both backends:

```python
tracer, config = initialize_phoenix(enable_greptime=True)
```

- **Phoenix**: LLM-specific observability
- **GreptimeDB**: Time-series analytics

## 🔍 Troubleshooting

### Phoenix Not Starting

```bash
# Check if Phoenix is running
docker ps | grep phoenix

# Check logs
docker logs phoenix-server

# Restart
npm run phoenix:restart
```

### Traces Not Appearing

1. Verify Phoenix is running: `curl http://localhost:6006`
2. Check instrumentors: `instrument_all_providers()`
3. Enable console debugging: `enable_console=True`

### Dependencies

```bash
# Install/upgrade dependencies
pip install --upgrade pip
pip install -r agent/requirements-phoenix.txt
```

## 📦 Files Created

### Core Implementation

- `agent/observability/phoenix_config.py` - Phoenix configuration
- `agent/observability/phoenix_instrumentors.py` - Provider instrumentations
- `docker-compose.phoenix.yml` - Phoenix server setup
- `.env.phoenix.example` - Environment template
- `agent/requirements-phoenix.txt` - Python dependencies

### Documentation

- `docs/PHOENIX_OBSERVABILITY.md` - Full guide
- `docs/PHOENIX_QUICK_REFERENCE.md` - Quick reference
- `docs/PHOENIX_ARCHITECTURE.md` - Architecture diagram
- `docs/PHOENIX_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `agent/genai-toolbox/PHOENIX_INTEGRATION.md` - Genai-toolbox guide

### Scripts & Examples

- `scripts/setup-phoenix.sh` - Unix setup script
- `scripts/setup-phoenix.ps1` - Windows setup script
- `agent/observability/example_phoenix.py` - Usage examples

## 🔗 Resources

- **Phoenix Docs**: <https://docs.arize.com/phoenix>
- **OpenInference**: <https://github.com/Arize-ai/openinference>
- **Phoenix GitHub**: <https://github.com/Arize-ai/phoenix>
- **Discord**: <https://discord.gg/Dmm69peqjh>

## ✅ Next Steps

1. **Run Setup**: `npm run phoenix:setup` or `./scripts/setup-phoenix.sh`
2. **Start Phoenix**: `npm run phoenix:start`
3. **Initialize Agent**: Add Phoenix to `agent/main.py`
4. **Test**: Run your agent and view traces at <http://localhost:6006>
5. **Configure Storage**: Choose SQLite (dev) or PostgreSQL (prod)
6. **Enable Dual Export**: Export to both Phoenix and GreptimeDB
7. **Instrument genai-toolbox**: Enable database tool tracing

## 🆘 Support

- Check [troubleshooting guide](PHOENIX_OBSERVABILITY.md#troubleshooting)
- View logs: `npm run phoenix:logs`
- Join [Phoenix Discord](https://discord.gg/Dmm69peqjh)
- File issues: [Phoenix GitHub](https://github.com/Arize-ai/phoenix/issues)

---

**Status**: ✅ Implementation Complete
**Ready**: For integration and testing
