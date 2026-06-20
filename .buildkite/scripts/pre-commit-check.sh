#!/usr/bin/env bash
set -euo pipefail

echo "--- :mag: Pre-commit checks (CI)"
node scripts/pre-commit-checks.mjs --ci
