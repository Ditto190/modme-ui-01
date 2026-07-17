#!/usr/bin/env bats

load test_helper

@test "load-lean-ctx-env sets project data directories" {
  local script="$REPO_ROOT/scripts/load-lean-ctx-env.ps1"
  assert_file_exists "$script"

  run run_pwsh -Command "
    . '$script' -RepoRoot '$REPO_ROOT' | Out-Null
    if (-not \$env:LEAN_CTX_DATA_DIR) { exit 1 }
    if (-not \$env:LEAN_CTX_STATE_DIR) { exit 1 }
    if (-not \$env:LEAN_CTX_TRUST_WORKSPACE) { exit 1 }
    Write-Output \$env:LEAN_CTX_DATA_DIR
  "

  [ "$status" -eq 0 ]
  [[ "$output" == *"data/lean-ctx"* ]] || [[ "$output" == *"data\\lean-ctx"* ]]
}

@test "load-lean-ctx-env creates data and state dirs" {
  run run_pwsh -Command "
    . '$REPO_ROOT/scripts/load-lean-ctx-env.ps1' -RepoRoot '$REPO_ROOT' | Out-Null
    \$data = Join-Path '$REPO_ROOT' 'data/lean-ctx'
    \$state = Join-Path '$REPO_ROOT' 'logs/lean-ctx'
    if (-not (Test-Path \$data)) { exit 1 }
    if (-not (Test-Path \$state)) { exit 1 }
    Write-Output ok
  "

  [ "$status" -eq 0 ]
  [[ "$output" == *"ok"* ]]
}
