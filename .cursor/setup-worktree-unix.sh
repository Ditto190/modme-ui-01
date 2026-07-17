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

<<<<<<< HEAD
export ROOT_WORKTREE_PATH="$ROOT_WORKTREE"
pwsh -NoProfile -File "$WORKTREE_ROOT/scripts/setup-workspace-windows.ps1" -SharedDeps -SkipSession
=======
echo "1/9 Allocating ports..."
pwsh -NoProfile -File "$WORKTREE_ROOT/scripts/worktree-allocate-ports.ps1" -WorktreePath "$WORKTREE_ROOT"

echo "2/9 Enabling corepack..."
corepack enable

echo "3/9 yarn install (GenerativeUI_monorepo)..."
(cd "$WORKTREE_ROOT/GenerativeUI_monorepo" && yarn install)

echo "4/9 bun install (next-forge)..."
(cd "$WORKTREE_ROOT/next-forge" && npx bun install)

echo "5/9 Copying .env files from root worktree..."
pwsh -NoProfile -File "$WORKTREE_ROOT/scripts/worktree-copy-env.ps1" \
  -SourceRoot "$ROOT_WORKTREE" \
  -TargetRoot "$WORKTREE_ROOT"

echo "6/9 poetry install (agent-server)..."
(cd "$WORKTREE_ROOT/GenerativeUI_monorepo/apps/agent-server" && poetry install)

echo "7/9 lean-ctx doctor (non-fatal)..."
if command -v lean-ctx >/dev/null 2>&1; then
  lean-ctx doctor || echo "   lean-ctx doctor reported issues (continuing)"
else
  echo "   lean-ctx not on PATH — skipped"
fi

echo "8/9 Installing git pre-commit hook..."
pwsh -NoProfile -File "$WORKTREE_ROOT/scripts/install-git-hooks.ps1"
>>>>>>> origin/dev

echo "9/9 KM data plane + agent session envelope..."
pwsh -NoProfile -File "$WORKTREE_ROOT/scripts/km-session-bootstrap.ps1" || true
BRANCH="$(git -C "$WORKTREE_ROOT" branch --show-current 2>/dev/null || true)"
TASK_TITLE="worktree: ${BRANCH}"
if [[ "$BRANCH" =~ feature/[^/]+/(.+) ]]; then
  TASK_TITLE="${BASH_REMATCH[1]//-/ }"
fi
# -SkipBeads: beads DB often shared from main; bootstrap still ran bd ready
pwsh -NoProfile -File "$WORKTREE_ROOT/scripts/agent-session-start.ps1" \
  -TaskTitle "$TASK_TITLE" -SkipBeads || true

echo ""
echo "Worktree setup complete (shared-deps)."
echo "Source ports before dev: source .worktree-ports.env (or use direnv)"
echo "Dev TUI: yarn agent:tui"
echo "Status:  yarn agent:status / yarn km:status"
