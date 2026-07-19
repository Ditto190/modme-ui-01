#!/usr/bin/env bats

load test_helper

@test "worktree-doctor -Json returns checks array" {
  local script="$REPO_ROOT/scripts/worktree-doctor.ps1"
  assert_file_exists "$script"

  run run_pwsh_file "$script" -Json -RepoRoot "$REPO_ROOT"

  [ "$status" -eq 0 ] || [ "$status" -eq 1 ]
  [[ "$output" == *"checks"* ]]
  [[ "$output" == *"checkout"* ]]
}

@test "worktree-doctor -Help exits 0" {
  run run_pwsh_file "$REPO_ROOT/scripts/worktree-doctor.ps1" -Help

  [ "$status" -eq 0 ]
  [[ "$output" == *"worktree-doctor"* ]]
}
