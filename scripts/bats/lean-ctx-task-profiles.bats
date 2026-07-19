#!/usr/bin/env bats

load test_helper

REQUIRED_PROFILES=(
  orchestration
  inbox-intake
  forge-dev
  test-automation
  lean-ctx-docs
  observability-work
)

@test "task profile example file exists" {
  assert_file_exists "$REPO_ROOT/data/lean-ctx-task-profiles.toml.example"
}

@test "required orchestration profiles are declared" {
  local example="$REPO_ROOT/data/lean-ctx-task-profiles.toml.example"
  for profile in "${REQUIRED_PROFILES[@]}"; do
    grep -q "\\[task_profiles.${profile}\\]" "$example" || {
      echo "missing profile: $profile" >&2
      return 1
    }
  done
}

@test "no duplicate task profile sections" {
  local example="$REPO_ROOT/data/lean-ctx-task-profiles.toml.example"
  local dupes
  dupes="$(grep -oE '\\[task_profiles\\.[^]]+\\]' "$example" | sort | uniq -d)"
  [ -z "$dupes" ] || {
    echo "duplicate sections: $dupes" >&2
    return 1
  }
}

@test "each profile declares lean_ctx_profile" {
  local example="$REPO_ROOT/data/lean-ctx-task-profiles.toml.example"
  local count_sections count_profiles
  count_sections="$(grep -cE '^\\[task_profiles\\.' "$example" || true)"
  count_profiles="$(grep -c 'lean_ctx_profile' "$example" || true)"
  [ "$count_sections" -eq "$count_profiles" ]
}
