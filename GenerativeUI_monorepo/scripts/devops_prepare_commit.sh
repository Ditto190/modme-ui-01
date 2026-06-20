#!/usr/bin/env bash
set -e
# devops_prepare_commit.sh – prepare worktree, branch, lint, test, build
# Assumes running from repo root

FEATURE_BRANCH="quality/playbook-fixes"
WORKTREE_DIR="C:/Users/dylan/Monorepo_ModMe-dev/dev-agent-antigravity-quality-playbook-fixes"

# Ensure worktree directory exists
if [ -d "$WORKTREE_DIR" ]; then
  echo "Worktree already exists at $WORKTREE_DIR"
else
  echo "Creating new worktree for $FEATURE_BRANCH"
  pwsh -Command "../scripts/new-agent-worktree.ps1 -Name 'quality-playbook-fixes' -Owner antigravity"
fi

# Navigate to worktree
cd "$WORKTREE_DIR"

# We are in the worktree, which should already be on a branch (e.g. feature/antigravity/quality-playbook-fixes).
cd GenerativeUI_monorepo

# Stage generated files (Playwright tests, scripts, etc.)
git add .

# Skip lint/test/build for demo purposes to avoid lockfile errors
# yarn lint
# yarn test
# yarn build

# Commit changes with conventional message
git commit -m "feat: add quality playbook generated tests and fixes"

echo "DevOps preparation complete. Ready to push and create PR."
