#!/usr/bin/env bash
set -euo pipefail

cd "${MONOREPO_DIR:?}"
yarn build
echo "--- :white_check_mark: Build passed"
