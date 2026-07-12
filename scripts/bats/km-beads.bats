#!/usr/bin/env bats

load test_helper

@test "km:verify yarn script exists" {
  grep -q '"km:verify"' "$REPO_ROOT/package.json"
}

@test "km vitest gate files exist" {
  for f in \
    scripts/__tests__/beads-hooks.test.mjs \
    scripts/__tests__/km-pipeline.e2e.test.mjs \
    scripts/__tests__/issue-autotag.test.mjs \
    scripts/__tests__/inbox-contract.test.mjs
  do
    assert_file_exists "$REPO_ROOT/$f"
  done
}

@test "modme-launch dispatcher exists" {
  assert_file_exists "$REPO_ROOT/scripts/modme-launch.ps1"
  assert_file_exists "$REPO_ROOT/scripts/modme-launch.mjs"
}

@test "launch state path declared in manifest" {
  grep -q 'modme-launch.json' "$REPO_ROOT/scripts/modme-session.manifest.json"
}
