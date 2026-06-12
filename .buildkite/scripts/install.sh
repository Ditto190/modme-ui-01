#!/usr/bin/env bash
set -euo pipefail

cd "${MONOREPO_DIR:?}"
corepack enable
yarn install --immutable 2>/dev/null || yarn install
echo "--- :white_check_mark: Dependencies installed"
