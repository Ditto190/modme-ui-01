#!/usr/bin/env bash
set -euo pipefail

cd "${MONOREPO_DIR:?}"
yarn lint
echo "--- :white_check_mark: Lint passed"
