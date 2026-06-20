#!/usr/bin/env bash
# ModMe multi-agent tmux workspace — list worktrees, doctor, ports, optional attach.
# Agent-safe: non-interactive flags first; idempotent session create.
#
# Usage:
#   ./scripts/agent-workspace-tmux.sh --help
#   ./scripts/agent-workspace-tmux.sh status
#   ./scripts/agent-workspace-tmux.sh attach
#   ./scripts/agent-workspace-tmux.sh layout --session modme-agents

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION="${MODME_TMUX_SESSION:-modme-agents}"

usage() {
  cat <<'EOF'
agent-workspace-tmux — tmux dashboard for ModMe parallel agents

Commands:
  status    List git worktrees + run worktree-doctor (JSON if -Json passed through)
  attach    Create or attach tmux session with worktree overview panes
  layout    Create detached layout only (no attach)

Options:
  --session NAME   tmux session name (default: modme-agents)
  --help           Show this help

Examples:
  ./scripts/agent-workspace-tmux.sh status
  ./scripts/agent-workspace-tmux.sh attach
  MODME_TMUX_SESSION=cursor-stack ./scripts/agent-workspace-tmux.sh layout

Requires: tmux, pwsh (for worktree-doctor on Windows/WSL paths)
EOF
}

cmd_status() {
  echo "=== git worktree list ==="
  git -C "$REPO_ROOT" worktree list
  echo ""
  if command -v pwsh >/dev/null 2>&1; then
    pwsh -NoProfile -File "$REPO_ROOT/scripts/worktree-doctor.ps1" -Quiet || true
  else
    echo "worktree-doctor: skipped (pwsh not found)"
  fi
}

cmd_layout() {
  local session="$1"
  if tmux has-session -t "$session" 2>/dev/null; then
    echo "tmux session '$session' already exists"
    return 0
  fi

  tmux new-session -d -s "$session" -n "worktrees" -x 220 -y 50
  tmux send-keys -t "$session:worktrees" "cd \"$REPO_ROOT\" && git worktree list" Enter
  tmux split-window -h -t "$session:worktrees"
  tmux send-keys -t "$session:worktrees.1" "cd \"$REPO_ROOT\" && pwsh -NoProfile -File ./scripts/list-worktrees.ps1" Enter

  tmux new-window -t "$session" -n "doctor"
  tmux send-keys -t "$session:doctor" "cd \"$REPO_ROOT\" && pwsh -NoProfile -File ./scripts/worktree-doctor.ps1" Enter

  tmux new-window -t "$session" -n "shell"
  tmux send-keys -t "$session:shell" "cd \"$REPO_ROOT\"" Enter

  tmux select-window -t "$session:worktrees"
  echo "tmux session '$session' created (detached)"
  echo "attach: tmux attach -t $session"
}

cmd_attach() {
  local session="$1"
  if ! tmux has-session -t "$session" 2>/dev/null; then
    cmd_layout "$session"
  fi
  tmux attach -t "$session"
}

main() {
  local command="${1:-status}"
  shift || true

  case "$command" in
    --help|-h|help)
      usage
      ;;
    status)
      cmd_status
      ;;
    layout)
      cmd_layout "$SESSION"
      ;;
    attach)
      cmd_attach "$SESSION"
      ;;
    *)
      echo "Error: unknown command '$command'" >&2
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"
