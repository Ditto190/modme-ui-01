#!/usr/bin/env bats

load test_helper

@test "ensure-lean-ctx-config -CheckOnly exits 0 or 1 with message" {
  local script="$REPO_ROOT/scripts/ensure-lean-ctx-config.ps1"
  assert_file_exists "$script"

  run run_pwsh_file "$script" -CheckOnly -ProjectOnly

  # 0 = ok/advisory; 1 = lean-ctx binary missing (acceptable in CI without lean-ctx)
  [ "$status" -eq 0 ] || [ "$status" -eq 1 ]
  [[ "$output" == *"lean-ctx"* ]] || [[ "$output" == *"CheckOnly"* ]]
}

@test "project .lean-ctx.toml exists" {
  assert_file_exists "$REPO_ROOT/.lean-ctx.toml"
}

@test "config schema snapshot exists or example documents sync command" {
  if [ -f "$REPO_ROOT/docs/lean-ctx/config-schema.json" ]; then
    [ -s "$REPO_ROOT/docs/lean-ctx/config-schema.json" ]
  else
    assert_file_exists "$REPO_ROOT/.lean-ctx.toml.example"
  fi
}
