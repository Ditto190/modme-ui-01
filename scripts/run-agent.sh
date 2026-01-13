#!/bin/bash

# Navigate to the agent directory
cd "$(dirname "$0")/../agent" || exit 1

# Check if virtual environment exists, create if it doesn't
if [ ! -d ".venv" ]; then
    echo "Virtual environment not found. Creating..."
    uv sync
fi

# Activate the virtual environment
source .venv/bin/activate

# Run the agent with uvicorn directly (respects PORT env var)
export PORT="${AGENT_PORT:-8000}"
uvicorn main:app --host 0.0.0.0 --port "${PORT}" --reload
