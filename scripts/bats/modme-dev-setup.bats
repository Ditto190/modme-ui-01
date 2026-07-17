#!/usr/bin/env bats

load test_helper

@test "setup-workspace-windows.ps1 exists" {
  assert_file_exists "$REPO_ROOT/scripts/setup-workspace-windows.ps1"
}

@test "modme session manifest exists" {
  assert_file_exists "$REPO_ROOT/scripts/modme-session.manifest.json"
}

@test "session manifest lists orchestration verify commands" {
  grep -q "test:orchestration" "$REPO_ROOT/scripts/modme-session.manifest.json"
  grep -q "worktree:doctor" "$REPO_ROOT/scripts/modme-session.manifest.json"
}

@test "yarn workspace bootstrap script accepts -Lite" {
  grep -q "\-Lite" "$REPO_ROOT/scripts/setup-workspace-windows.ps1"
}
