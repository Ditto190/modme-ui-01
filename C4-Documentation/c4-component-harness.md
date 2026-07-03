# C4 Component — ECL Harness

**Location:** `harness/`, `docs/ECL.md`, `scripts/harness-*.mjs`

## Responsibility

Agent reliability infrastructure: change tracking, environment contract, lint gates, STATUS handoff.

## Artifacts

- `harness/changes/{active,parking,archive}/`
- `harness/config/environment.json`
- `scripts/lint-ecl.mjs`, `lint-encoding.mjs`

## Evidence

- `docs/ECL.md`
- `yarn lint:harness`
