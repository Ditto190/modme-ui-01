#!/usr/bin/env bash
#
# Start Copilot observability stack (Phoenix + Telemetry Proxy)
#
# Usage:
#   ./start-copilot-observability.sh           # Start both Phoenix and proxy
#   ./start-copilot-observability.sh --skip-phoenix  # Skip Phoenix startup
#   ./start-copilot-observability.sh --proxy-only    # Only start proxy

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Parse arguments
SKIP_PHOENIX=false
PROXY_ONLY=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-phoenix)
      SKIP_PHOENIX=true
      shift
      ;;
    --proxy-only)
      PROXY_ONLY=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${CYAN}=============================================${NC}"
echo -e "${CYAN}Copilot Observability Stack Startup${NC}"
echo -e "${CYAN}=============================================${NC}"
echo ""

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_ROOT"

# Step 1: Start Phoenix (unless skipped)
if [ "$PROXY_ONLY" = false ] && [ "$SKIP_PHOENIX" = false ]; then
  echo -e "${YELLOW}[1/3] Starting Phoenix backend...${NC}"

  # Check if Phoenix is already running
  PHOENIX_RUNNING=$(docker ps --filter "name=phoenix-server" --filter "status=running" -q)

  if [ -n "$PHOENIX_RUNNING" ]; then
    echo -e "${GREEN}  ✓ Phoenix already running (container ID: $PHOENIX_RUNNING)${NC}"
  else
    echo -e "${GRAY}  Starting Phoenix container...${NC}"
    docker-compose -f docker-compose.phoenix.yml up -d

    if [ $? -eq 0 ]; then
      echo -e "${GREEN}  ✓ Phoenix started successfully${NC}"
      echo -e "${GRAY}  Waiting for Phoenix to be ready...${NC}"
      sleep 5
    else
      echo -e "${RED}  ✗ Failed to start Phoenix container${NC}"
      exit 1
    fi
  fi

  echo -e "${CYAN}  Phoenix UI: http://localhost:6006${NC}"
  echo ""
elif [ "$SKIP_PHOENIX" = true ]; then
  echo -e "${GRAY}[1/3] Skipping Phoenix startup (--skip-phoenix flag)${NC}"
  echo ""
fi

# Step 2: Check Python environment
echo -e "${YELLOW}[2/3] Checking Python environment...${NC}"

VENV_PATH="$PROJECT_ROOT/agent/.venv"
if [ "$(uname)" = "Darwin" ] || [ "$(uname)" = "Linux" ]; then
  PYTHON_EXE="$VENV_PATH/bin/python"
else
  PYTHON_EXE="$VENV_PATH/Scripts/python.exe"
fi

if [ ! -f "$PYTHON_EXE" ]; then
  echo -e "${RED}  ✗ Python virtual environment not found${NC}"
  echo -e "${YELLOW}  Please run: cd agent && uv sync${NC}"
  exit 1
fi

echo -e "${GREEN}  ✓ Python environment found: $PYTHON_EXE${NC}"

# Check if required packages are installed
MISSING_PACKAGES=()
REQUIRED_PACKAGES=("fastapi" "uvicorn" "opentelemetry-api" "pydantic")

for pkg in "${REQUIRED_PACKAGES[@]}"; do
  if ! "$PYTHON_EXE" -m pip list --format=freeze | grep -q "^$pkg=="; then
    MISSING_PACKAGES+=("$pkg")
  fi
done

if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
  echo -e "${RED}  ✗ Missing required packages: ${MISSING_PACKAGES[*]}${NC}"
  echo -e "${YELLOW}  Installing missing packages...${NC}"
  "$PYTHON_EXE" -m pip install fastapi uvicorn opentelemetry-api opentelemetry-sdk \
    opentelemetry-exporter-otlp-proto-http pydantic openinference-instrumentation

  if [ $? -ne 0 ]; then
    echo -e "${RED}  ✗ Failed to install required packages${NC}"
    exit 1
  fi
  echo -e "${GREEN}  ✓ Packages installed successfully${NC}"
else
  echo -e "${GREEN}  ✓ All required packages installed${NC}"
fi
echo ""

# Step 3: Start telemetry proxy
echo -e "${YELLOW}[3/3] Starting Copilot telemetry proxy...${NC}"
echo -e "${CYAN}  Proxy endpoint: http://localhost:8080/telemetry${NC}"
echo -e "${CYAN}  Health check: http://localhost:8080/health${NC}"
echo ""
echo -e "${GRAY}  Press Ctrl+C to stop the proxy${NC}"
echo ""

# Set environment variables
export PHOENIX_COLLECTOR_ENDPOINT="http://localhost:6006/v1/traces"
export PHOENIX_PROJECT_NAME="copilot-research"
export PROXY_PORT="8080"
export LOG_LEVEL="INFO"

# Start the proxy
"$PYTHON_EXE" -m agent.observability.copilot_phoenix_proxy
