# Phoenix Setup - Manual Step-by-Step Guide

Follow these steps to set up Phoenix observability manually.

## Prerequisites Check

Before starting, verify you have:

- [ ] Python 3.8+ installed (`python --version`)
- [ ] pip installed (`pip --version`)
- [ ] Docker installed (`docker --version`)

## Step 1: Install Python Dependencies

Open a terminal in the **modme-ui-01-test-worktree** directory and run:

```powershell
# Navigate to agent directory
cd agent

# Install Phoenix dependencies
pip install arize-phoenix
pip install openinference-instrumentation-anthropic
pip install openinference-instrumentation-openai
pip install openinference-instrumentation-google-generativeai
pip install opentelemetry-api
pip install opentelemetry-sdk
pip install opentelemetry-exporter-otlp-proto-http

# Or install all at once from requirements file
pip install -r requirements-phoenix.txt

# Go back to root
cd ..
```

**Expected Output:**

```
Successfully installed arize-phoenix-4.x.x
Successfully installed openinference-instrumentation-anthropic-0.x.x
...
```

## Step 2: Create Environment File

```powershell
# Copy the example environment file
Copy-Item .env.phoenix.example .env.local

# Or manually create .env.local with this content:
```

Create a file named `.env.local` in the root directory with:

```bash
# Phoenix Server Configuration
PHOENIX_ENDPOINT=http://localhost:6006
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006/v1/traces

# Service Configuration
SERVICE_NAME=modme-agent
SERVICE_VERSION=0.1.0
ENVIRONMENT=development

# Feature Flags
ENABLE_PHOENIX=true
ENABLE_GREPTIME_EXPORT=true
ENABLE_CONSOLE_EXPORT=false
```

## Step 3: Start Phoenix Server (Choose One Option)

### Option A: Using Docker Compose (Recommended)

```powershell
# Start Phoenix server
docker-compose -f docker-compose.phoenix.yml up -d

# Check if it's running
docker ps | Select-String "phoenix"

# View logs
docker logs phoenix-server
```

### Option B: Using Docker Run (Alternative)

```powershell
docker run -d `
  --name phoenix-server `
  -p 6006:6006 `
  -p 4317:4317 `
  -v phoenix-data:/data `
  -e PHOENIX_SQL_DATABASE_URL=sqlite:////data/phoenix.db `
  arizephoenix/phoenix:latest

# Check status
docker ps | Select-String "phoenix"
```

### Option C: Using Python (No Docker)

```powershell
# Install Phoenix
pip install arize-phoenix

# Start Phoenix server
python -m phoenix.server.main serve

# Server will start on http://localhost:6006
```

**Expected Output:**

```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:6006
```

## Step 4: Verify Phoenix is Running

Open your browser and navigate to:
**http://localhost:6006**

You should see the Phoenix UI dashboard.

Or test from terminal:

```powershell
# Test Phoenix endpoint
curl http://localhost:6006

# Or using PowerShell
Invoke-WebRequest -Uri http://localhost:6006 -UseBasicParsing
```

## Step 5: Test the Integration

Create a test file `test_phoenix.py` in the `agent` directory:

```python
# agent/test_phoenix.py
import sys
sys.path.insert(0, '.')

from observability import initialize_phoenix, instrument_all_providers

# Initialize Phoenix
print("Initializing Phoenix...")
tracer, config = initialize_phoenix(
    enable_greptime=False,  # Disable for now
    enable_console=True     # Enable console output to see traces
)

print(f"✅ Phoenix initialized!")
print(f"📊 Phoenix UI: {config.phoenix_endpoint}")

# Auto-instrument providers
print("\nInstrumenting providers...")
instrumentors = instrument_all_providers()
print(f"✅ Instrumented providers: {list(instrumentors.keys())}")

print("\n✅ Setup complete!")
print(f"Open {config.phoenix_endpoint} in your browser to view traces")
```

Run the test:

```powershell
cd agent
python test_phoenix.py
```

**Expected Output:**

```
Initializing Phoenix...
[Phoenix] Tracing initialized
[Phoenix] UI: http://localhost:6006
[Phoenix] Collector: http://localhost:6006/v1/traces
✅ Phoenix initialized!
📊 Phoenix UI: http://localhost:6006

Instrumenting providers...
[Phoenix] Anthropic instrumentation enabled
[Phoenix] OpenAI instrumentation enabled
[Phoenix] Google Generative AI instrumentation enabled
✅ Instrumented providers: ['anthropic', 'openai', 'google']

✅ Setup complete!
Open http://localhost:6006 in your browser to view traces
```

## Step 6: Add to Your Agent

Once verified, add Phoenix to your main agent file:

```python
# agent/main.py (or your entry point)
from observability import initialize_phoenix, instrument_all_providers

# Initialize Phoenix at startup
tracer, config = initialize_phoenix(
    enable_greptime=True,   # Enable dual export if you want
    enable_console=False     # Disable debug console
)

# Auto-instrument all providers
instrumentors = instrument_all_providers()

# Your agent code continues...
```

## Troubleshooting

### Issue: "pip not found"

```powershell
# Check Python installation
python --version

# Install pip
python -m ensurepip --upgrade
```

### Issue: "Docker not found"

Install Docker Desktop:

- Windows: https://docs.docker.com/desktop/install/windows-install/
- Mac: https://docs.docker.com/desktop/install/mac-install/

Or use Option C (Python) instead.

### Issue: "Port 6006 already in use"

```powershell
# Find process using port 6006
netstat -ano | Select-String ":6006"

# Kill the process (replace PID)
Stop-Process -Id <PID> -Force

# Or use a different port
docker run -d -p 6007:6006 --name phoenix-server arizephoenix/phoenix:latest
```

### Issue: "Module not found: observability"

```powershell
# Make sure you're in the agent directory
cd agent

# Verify the observability module exists
ls observability/

# Add to Python path if needed
$env:PYTHONPATH = "."
```

### Issue: Dependencies installation fails

```powershell
# Upgrade pip first
python -m pip install --upgrade pip

# Try installing one by one to identify the problem
pip install arize-phoenix
pip install openinference-instrumentation-anthropic
# etc.
```

## Verification Checklist

Once setup is complete, verify:

- [ ] Python dependencies installed (`pip list | Select-String phoenix`)
- [ ] Phoenix server running (`docker ps` or check http://localhost:6006)
- [ ] Environment file created (`.env.local` exists)
- [ ] Test script runs without errors
- [ ] Phoenix UI accessible in browser
- [ ] No error messages in Phoenix logs

## Quick Commands Reference

```powershell
# Check Phoenix status
docker ps | Select-String phoenix

# View Phoenix logs
docker logs phoenix-server -f

# Stop Phoenix
docker stop phoenix-server

# Start Phoenix
docker start phoenix-server

# Remove Phoenix (to start fresh)
docker rm -f phoenix-server

# Open Phoenix UI
Start-Process "http://localhost:6006"
```

## Next Steps

After successful setup:

1. Run your agent and make some AI API calls
2. Open http://localhost:6006
3. You should see traces appearing in real-time
4. Explore the Phoenix UI features:
   - Trace Explorer
   - Token Analytics
   - Latency Analysis
   - Error Tracking

## Need Help?

- Check full guide: `docs/PHOENIX_OBSERVABILITY.md`
- Quick reference: `docs/PHOENIX_QUICK_REFERENCE.md`
- Architecture: `docs/PHOENIX_ARCHITECTURE.md`
- Discord: https://discord.gg/Dmm69peqjh
