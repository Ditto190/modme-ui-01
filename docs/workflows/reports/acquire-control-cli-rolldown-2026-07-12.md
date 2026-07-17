# Wave-1 acquire notes — control-cli-rolldown-orchestration

**Date:** 2026-07-12  
**Branch:** `feature/cursor/control-cli-orchestration`  
**Change:** `harness/changes/active/control-cli-rolldown-orchestration/`

## Evidence (root orchestration only)

| Path | Status |
|------|--------|
| `scripts/control-cli-harness.mjs` | Present — JSON probes |
| `scripts/agent-status.mjs` | JSON default |
| `scripts/builders.manifest.json` | swc / vite / dolt — no rolldown yet |
| `flake.nix` | Present from prior control-cli work |
| `.worktreeexclude` | Present |
| `scripts/lib/stack-paths.json` | orchestration filter includes scripts/, harness/, docs/ |

## Drift check

- No full `docs/codebase/*` refresh required for this scoped change
- No cross-lockfile workspace deps introduced

## Next

Phase B — register Rolldown builder + Vitest analyse assertions.
