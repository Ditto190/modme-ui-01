#!/usr/bin/env bats
# POSIX smoke for agent-workspace-tmux.sh (status command, no tmux attach)

setup() {
  REPO_ROOT="$(cd "$(dirname "${BATS_TEST_FILENAME}")/../.." && pwd)"
  SCRIPT="${REPO_ROOT}/scripts/agent-workspace-tmux.sh"
}

@test "agent-workspace-tmux.sh --help exits 0" {
  run bash "$SCRIPT" --help
  [ "$status" -eq 0 ]
  [[ "$output" == *"agent-workspace-tmux"* ]]
}

@test "agent-workspace-tmux.sh status lists worktrees" {
  run bash "$SCRIPT" status
  [ "$status" -eq 0 ]
  [[ "$output" == *"git worktree list"* ]]
}
