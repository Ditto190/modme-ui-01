#!/usr/bin/env bash
# Cursor worktree bootstrap — Unix (shared-deps via PowerShell bootstrap module)
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

export ROOT_WORKTREE_PATH="$ROOT_WORKTREE"
pwsh -NoProfile -File "$WORKTREE_ROOT/scripts/setup-workspace-windows.ps1" -SharedDeps -SkipSession

echo ""
echo "Worktree setup complete (shared-deps)."
echo "Source ports before dev: source .worktree-ports.env (or use direnv)"
