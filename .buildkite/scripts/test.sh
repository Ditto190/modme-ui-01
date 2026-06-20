#!/usr/bin/env bash
set -euo pipefail

cd "${MONOREPO_DIR:?}"
yarn test
echo "--- :white_check_mark: Tests passed"
