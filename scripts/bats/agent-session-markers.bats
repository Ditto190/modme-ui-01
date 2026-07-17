#!/usr/bin/env bats

load test_helper

@test "session markers path is documented in ensure script" {
  assert_file_exists "$REPO_ROOT/scripts/ensure-lean-ctx-config.ps1"
  grep -q "lean-ctx-session-markers.jsonl" "$REPO_ROOT/scripts/ensure-lean-ctx-config.ps1"
}

@test "hooks state directory can be created" {
  local state_dir="$REPO_ROOT/.cursor/hooks/state"
  mkdir -p "$state_dir"
  assert_dir_exists "$state_dir"
}

@test "empty markers file is valid jsonl" {
  local markers="$REPO_ROOT/.cursor/hooks/state/lean-ctx-session-markers.jsonl"
  mkdir -p "$(dirname "$markers")"
  touch "$markers"
  [ -f "$markers" ]
}
