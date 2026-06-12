#!/usr/bin/env bash
set -euo pipefail

if git ls-files | grep -E '(^|/)\.env$|\.env\.local$|\.env\.production$'; then
  echo "--- :no_entry: Tracked env files detected — remove from git and add to .gitignore"
  exit 1
fi

echo "--- :white_check_mark: No secret env files tracked"
