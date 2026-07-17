#!/bin/bash
# ModMe devcontainer post-create — Yarn 3 + Bun + lean-ctx parity (2026)

set -euo pipefail

echo "🚀 Starting post-create setup for ModMe workspace"
echo ""

cd "${WORKSPACE_FOLDER:-.}"

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
WORKSPACE_NAME=$(basename "$(pwd)")

echo "🔍 Git context"
echo "   Workspace: $WORKSPACE_NAME"
echo "   Branch:    $CURRENT_BRANCH"
echo "   Commit:    $COMMIT_HASH"
echo ""

echo "📋 Toolchain"
echo "   Node.js: $(node --version)"
echo "   Python:  $(python3 --version 2>/dev/null || echo 'not found')"
echo "   Git:     $(git --version)"
if command -v pwsh >/dev/null 2>&1; then
  echo "   pwsh:    $(pwsh --version 2>/dev/null | head -n1)"
else
  echo "   pwsh:    not found (some yarn scripts need it)"
fi
if command -v bun >/dev/null 2>&1; then
  echo "   bun:     $(bun --version)"
else
  echo "   bun:     not found (next-forge uses npx bun as fallback)"
fi
echo ""

# Ensure user-local bin is on PATH for lean-ctx, bun, and similar tools
export PATH="${HOME}/.local/bin:${HOME}/.bun/bin:${PATH}"

# pwsh scripts expect Windows env vars on Linux
export USERPROFILE="${HOME}"
export APPDATA="${HOME}/.config"

# yarn scripts invoke `powershell`; on Linux only `pwsh` is installed
if command -v pwsh >/dev/null 2>&1 && ! command -v powershell >/dev/null 2>&1; then
  if sudo ln -sf "$(command -v pwsh)" /usr/local/bin/powershell 2>/dev/null; then
    echo "   ✓ powershell → pwsh symlink"
  else
    ln -sf "$(command -v pwsh)" "${HOME}/.local/bin/powershell" 2>/dev/null || true
  fi
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "📦 Installing bun (next-forge package manager)..."
  curl -fsSL https://bun.sh/install | bash || echo "   ⚠️  bun install failed (use npx bun as fallback)"
  export PATH="${HOME}/.bun/bin:${PATH}"
fi

install_lean_ctx() {
  if command -v lean-ctx >/dev/null 2>&1; then
    echo "   ✓ lean-ctx already on PATH"
    return 0
  fi

  echo "📦 Installing lean-ctx to ~/.local/bin (non-fatal)..."
  mkdir -p "${HOME}/.local/bin"

  if curl -fsSL "https://leanctx.com/install.sh" -o /tmp/lean-ctx-install.sh 2>/dev/null; then
    bash /tmp/lean-ctx-install.sh 2>/dev/null || echo "   ⚠️  lean-ctx install script failed (continuing)"
  elif command -v npm >/dev/null 2>&1; then
    npm install -g @leanctx/cli 2>/dev/null || echo "   ⚠️  lean-ctx npm install failed (continuing)"
  else
    echo "   ⚠️  lean-ctx install skipped (no curl/npm)"
  fi

  export PATH="${HOME}/.local/bin:${PATH}"
}

run_non_fatal() {
  local label="$1"
  shift
  echo "$label"
  if "$@"; then
    echo "   ✓ done"
  else
    echo "   ⚠️  skipped or failed (non-fatal)"
  fi
}

echo "📁 Creating data directory..."
mkdir -p data

echo "⚙️  Configuring environment..."
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp .env.example .env
  echo "   ✓ .env created from .env.example"
elif [ -f ".env" ]; then
  echo "   ✓ .env already exists"
else
  echo "   ⚠️  No .env — copy from desktop checkout or Supabase dashboard"
fi

if [ -f ".devcontainer/load-codespaces-secrets.sh" ]; then
  bash .devcontainer/load-codespaces-secrets.sh || true
fi
echo ""

echo "📦 Enabling corepack + root yarn install..."
corepack enable
corepack prepare yarn@3.3.0 --activate
yarn install
echo "   ✓ Root yarn dependencies installed"
echo ""

if [ -f ".cursor/setup-worktree-unix.sh" ] && command -v pwsh >/dev/null 2>&1; then
  IS_MAIN_CHECKOUT=$(pwsh -NoProfile -Command "
    . '$(pwd)/scripts/lib/worktree-context.ps1'
    (Get-WorktreeContext -RepoRoot '$(pwd)').IsMainCheckout
  " 2>/dev/null || echo "True")
  if [ "$IS_MAIN_CHECKOUT" = "True" ]; then
    echo "ℹ️  Main checkout — skipping worktree port/bootstrap (use .worktrees/dev for agent work)"
    echo "📦 Installing sub-monorepo dependencies (no port allocation)..."
    (cd GenerativeUI_monorepo && yarn install) || echo "   ⚠️  GenerativeUI yarn install failed (continuing)"
    (cd next-forge && npx bun install) || echo "   ⚠️  next-forge bun install failed (continuing)"
    echo ""
  else
    echo "🌿 Running worktree bootstrap (.cursor/setup-worktree-unix.sh)..."
    export ROOT_WORKTREE_PATH="${ROOT_WORKTREE_PATH:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
    bash .cursor/setup-worktree-unix.sh || echo "   ⚠️  worktree bootstrap reported issues (continuing)"
    echo ""
  fi
elif [ -f ".cursor/setup-worktree-unix.sh" ]; then
  echo "⚠️  pwsh not found — skipping setup-worktree-unix.sh (install PowerShell feature and re-run)"
  echo ""
else
  echo "⚠️  .cursor/setup-worktree-unix.sh not found — skipping monorepo bootstrap"
  echo ""
fi

install_lean_ctx
echo ""

if command -v lean-ctx >/dev/null 2>&1; then
  run_non_fatal "🔍 lean-ctx doctor (non-fatal)..." lean-ctx doctor
else
  echo "⚠️  lean-ctx not on PATH after install attempt"
fi

if command -v pwsh >/dev/null 2>&1; then
  run_non_fatal "⚙️  yarn lean-ctx:ensure (non-fatal)..." \
    pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/ensure-lean-ctx-config.ps1
fi
echo ""

if [ -f "agent/pyproject.toml" ]; then
  echo "🐍 Setting up Python agent environment..."
  (
    cd agent
    if [ ! -d ".venv" ]; then
      python3 -m venv .venv
    fi
    # shellcheck disable=SC1091
    source .venv/bin/activate
    if command -v uv >/dev/null 2>&1; then
      uv sync
    else
      pip install --upgrade pip
      pip install -e .
    fi
  ) || echo "   ⚠️  Python agent setup failed (continuing)"
  echo ""
fi

if command -v codeql >/dev/null 2>&1; then
  echo "✅ CodeQL already available"
elif [ -f ".devcontainer/install-codeql.sh" ]; then
  echo "📥 Installing CodeQL..."
  bash .devcontainer/install-codeql.sh || echo "   ⚠️  CodeQL install failed (continuing)"
fi
echo ""

echo "🌿 Configuring git hooks..."
if [ -d ".githooks" ]; then
  git config core.hooksPath .githooks
  echo "   ✓ Git hooks path set to .githooks"
fi
if [ -f "scripts/install-git-hooks.ps1" ] && command -v pwsh >/dev/null 2>&1; then
  pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/install-git-hooks.ps1 || true
fi
echo ""

if [ "${INSTALL_SMART_CODING_MCP:-0}" = "1" ]; then
  echo "📦 Installing Smart Coding MCP (optional)..."
  npm install -g smart-coding-mcp 2>/dev/null || echo "   ⚠️  smart-coding-mcp install failed (continuing)"
else
  echo "ℹ️  Skipping smart-coding-mcp (set INSTALL_SMART_CODING_MCP=1 to enable)"
fi
echo ""

echo "════════════════════════════════════════════════════════"
echo "✨ DevContainer setup complete!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📊 Environment"
echo "   Branch:    $CURRENT_BRANCH"
echo "   Yarn:      $(yarn -v 2>/dev/null || echo 'unknown')"
echo "   lean-ctx:  $(command -v lean-ctx >/dev/null 2>&1 && lean-ctx --version 2>/dev/null | head -n1 || echo 'not installed')"
echo ""
echo "🚀 Quick start"
echo "   yarn dev:forge:core   → next-forge app/web/api (3100–3102)"
echo "   yarn dev:generative   → GenerativeUI stack (3000, 8000)"
echo "   yarn worktree:doctor  → alignment check"
echo "   (worktree only) yarn agent:session:start → agent session envelope"
echo ""
echo "📖 See AGENTS.md and .devcontainer/README.md"
echo ""
