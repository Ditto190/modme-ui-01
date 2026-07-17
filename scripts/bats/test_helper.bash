#!/usr/bin/env bash
# Shared helpers for ModMe orchestration bats tests.

setup() {
  export BATS_TEST_DIRNAME
  BATS_TEST_DIRNAME="$(cd "$(dirname "$BATS_TEST_FILENAME")" && pwd)"
  export REPO_ROOT
  REPO_ROOT="$(cd "$BATS_TEST_DIRNAME/../.." && pwd)"
}

run_pwsh() {
  if command -v pwsh >/dev/null 2>&1; then
    pwsh -NoProfile -ExecutionPolicy Bypass "$@"
  else
    powershell -NoProfile -ExecutionPolicy Bypass "$@"
  fi
}

run_pwsh_file() {
  run_pwsh -File "$@"
}

assert_file_exists() {
  local path="$1"
  [ -f "$path" ] || {
    echo "expected file: $path" >&2
    return 1
  }
}

assert_dir_exists() {
  local path="$1"
  [ -d "$path" ] || {
    echo "expected directory: $path" >&2
    return 1
  }
}
