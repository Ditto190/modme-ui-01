# C4 Component — CI Path Filter

**Location:** `scripts/lib/stack-paths.json`, `path-filter.mjs`

## Responsibility

Single manifest for CI dorny/paths-filter globs, pre-push verify routing, and agent stack classification.

## Filters

forge, generative, rootLegacy, orchestration, harness, e2e

## Evidence

- `scripts/lib/validate-stack-paths-ci-sync.mjs`
- `.github/workflows/ci.yml` `changes` job
