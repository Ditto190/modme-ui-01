#!/usr/bin/env bash
set -euo pipefail

echo "[dev-init] Installing Node dependencies..."
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "[dev-init] Setting up Agent (uv) and Python venv..."
# Use existing POSIX setup script if present
if [ -f "./scripts/setup-agent.sh" ]; then
  ./scripts/setup-agent.sh
elif [ -f "./scripts/setup.sh" ]; then
  ./scripts/setup.sh
else
  echo "[dev-init] No agent setup script found. Please run scripts/setup-agent.sh or scripts/setup.sh manually." >&2
fi

echo "[dev-init] Dev init complete."
