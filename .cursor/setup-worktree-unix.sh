#!/usr/bin/env bash
# Cursor worktree bootstrap — Unix (WSL / macOS)
# ROOT_WORKTREE_PATH is set by Cursor to the main checkout path.

set -euo pipefail

WORKTREE_ROOT="$(pwd)"
ROOT_WORKTREE="${ROOT_WORKTREE_PATH:-$WORKTREE_ROOT}"

echo "==========================================="
echo "   Monorepo_ModMe worktree setup (Unix)"
echo "==========================================="
echo "   Worktree: $WORKTREE_ROOT"
echo "   Root:     $ROOT_WORKTREE"
echo ""

echo "1/6 Allocating ports..."
pwsh -NoProfile -File "$WORKTREE_ROOT/scripts/worktree-allocate-ports.ps1" -WorktreePath "$WORKTREE_ROOT"

echo "2/6 Enabling corepack..."
corepack enable

echo "3/6 yarn install (GenerativeUI_monorepo)..."
(cd "$WORKTREE_ROOT/GenerativeUI_monorepo" && yarn install)

echo "4/6 Copying .env files from root worktree..."
pwsh -NoProfile -File "$WORKTREE_ROOT/scripts/worktree-copy-env.ps1" \
  -SourceRoot "$ROOT_WORKTREE" \
  -TargetRoot "$WORKTREE_ROOT"

echo "5/6 poetry install (agent-server)..."
(cd "$WORKTREE_ROOT/GenerativeUI_monorepo/apps/agent-server" && poetry install)

echo "6/7 lean-ctx doctor (non-fatal)..."
if command -v lean-ctx >/dev/null 2>&1; then
  lean-ctx doctor || echo "   lean-ctx doctor reported issues (continuing)"
else
  echo "   lean-ctx not on PATH — skipped"
fi

echo "7/7 Installing git pre-commit hook..."
pwsh -NoProfile -File "$WORKTREE_ROOT/scripts/install-git-hooks.ps1"

echo ""
echo "Worktree setup complete."
echo "Source ports before dev: source .worktree-ports.env (or use direnv)"
