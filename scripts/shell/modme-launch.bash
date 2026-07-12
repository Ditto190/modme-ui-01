#!/usr/bin/env bash
# ModMe launch orchestrator — bash/zsh entry (delegates to PowerShell on Windows via modme-launch.mjs).
set -euo pipefail

MODE="${1:-health}"
shift || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PS_SCRIPT="$REPO_ROOT/scripts/modme-launch.ps1"

run_pwsh() {
  if command -v pwsh >/dev/null 2>&1; then
    pwsh -NoProfile -ExecutionPolicy Bypass "$@"
  else
    powershell -NoProfile -ExecutionPolicy Bypass "$@"
  fi
}

if [[ -f "$PS_SCRIPT" ]] && { command -v pwsh >/dev/null 2>&1 || command -v powershell >/dev/null 2>&1; }; then
  run_pwsh -File "$PS_SCRIPT" -Mode "$MODE" "$@"
  exit $?
fi

cd "$REPO_ROOT"

case "$MODE" in
  verify)
    if [[ -f "$REPO_ROOT/scripts/modme-session.ps1" ]]; then
      run_pwsh -File "$REPO_ROOT/scripts/modme-session.ps1" -Phase verify -RepoRoot "$REPO_ROOT" || true
    fi
    ;;
  km-verify)
    export BEADS_DISABLED=1
    yarn vitest run --config vitest.config.mjs \
      scripts/__tests__/beads-hooks.test.mjs \
      scripts/__tests__/km-pipeline.e2e.test.mjs \
      scripts/__tests__/issue-autotag.test.mjs \
      scripts/__tests__/inbox-contract.test.mjs
    yarn journal:inbox:dry-run
    yarn intake:dry-run
    ;;
  session-start)
    if [[ -f "$REPO_ROOT/scripts/modme-session.ps1" ]]; then
      run_pwsh -File "$REPO_ROOT/scripts/modme-session.ps1" -Phase session-start -RepoRoot "$REPO_ROOT" || true
    fi
    ;;
  full)
    bash "$SCRIPT_DIR/modme-launch.bash" health "$@" || true
    bash "$SCRIPT_DIR/modme-launch.bash" km-verify "$@" || true
    bash "$SCRIPT_DIR/modme-launch.bash" session-start "$@" || true
    ;;
  auto|health)
    yarn lean-ctx:ensure:check || true
    yarn worktree:doctor || true
    if command -v bats >/dev/null 2>&1; then
      yarn test:shell || true
    fi
    bash "$SCRIPT_DIR/modme-launch.bash" verify "$@" || true
    ;;
  *)
    echo "modme-launch: unknown mode $MODE" >&2
    exit 1
    ;;
esac

exit 0
