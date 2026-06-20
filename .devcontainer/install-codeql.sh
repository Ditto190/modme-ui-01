#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR=/opt/codeql
TMP_DIR=$(mktemp -d)
CODEQL_ZIP_URL="https://github.com/github/codeql-cli-binaries/releases/latest/download/codeql-linux64.zip"

echo "📥 Downloading CodeQL to temporary folder $TMP_DIR"
cd "$TMP_DIR"
curl -sSL -o codeql.zip "$CODEQL_ZIP_URL"

echo "🗜️ Extracting CodeQL"
unzip -q codeql.zip

# move extracted folder to /opt
if [ -d "codeql" ]; then
  sudo mkdir -p "$TARGET_DIR"
  sudo rm -rf "$TARGET_DIR"
  sudo mv codeql "$TARGET_DIR"
  sudo ln -sf "$TARGET_DIR/codeql" /opt/codeql
  sudo ln -sf "$TARGET_DIR/codeql/codeql" /usr/local/bin/codeql
  echo "✅ CodeQL installed to $TARGET_DIR"
else
  echo "❌ Extraction failed: 'codeql' folder not found in $TMP_DIR"
  exit 1
fi

# cleanup
rm -rf "$TMP_DIR"

echo "CodeQL version:"
codeql version || /opt/codeql/codeql/codeql version || true
