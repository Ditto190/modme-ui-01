# Copilot Workspace + Builder Orchestration — Parallel Code Review

**Date:** 2026-07-05  
**Scope:** `.github/github-app.yml`, `.github/hooks/hooks.json`, `.worktreeinclude`, `scripts/copilot-workspace/**`, `scripts/builders-orchestrator.mjs`, `scripts/builders.manifest.json`, `scripts/preflight.mjs`, `scripts/resolve-lean-ctx-hook.mjs`, related tests and docs.

## Summary

| Dimension | Rating | P0 | P1 | P2 |
|-----------|--------|----|----|-----|
| Security | Pass | 0 | 0 | 1 |
| Performance | Pass | 0 | 0 | 1 |
| Correctness | Pass (after fixes) | 0 | 2 fixed | 2 |
| Readability | Pass | 0 | 0 | 2 |

---

## Security

| Finding | Severity | Status |
|---------|----------|--------|
| `spawnSync` with `shell: true` + `args` in orchestrator/preflight/hooks — Node deprecation and injection surface if env-controlled cmd leaks | P1 | **Fixed** — `resolveExecutable()` + `shell: false` |
| `.worktreeinclude` copies `.env` by name into worktrees — intentional; secrets never committed | Info | Accepted |
| Copilot hooks run `pwsh -ExecutionPolicy Bypass` — required by Copilot App trust model | Info | Accepted |
| `LEAN_CTX_BIN` env can point to arbitrary binary — same trust boundary as PATH | P2 | Documented; hook exits 0 when absent |

---

## Performance

| Finding | Severity | Status |
|---------|----------|--------|
| `ensureRootDeps` runs blocking `yarn install` on first SWC ensure | P2 | Accepted — one-time bootstrap |
| Pipeline runs verify/build sequentially | P2 | Accepted — preflight smoke, not hot path |

---

## Correctness

| Finding | Severity | Status |
|---------|----------|--------|
| Node `shell: true` + args deprecation warning on Windows | P1 | **Fixed** |
| `resolve-lean-ctx-hook.mjs` accepted non-working path binaries (`probe.status !== 0 && c !== "lean-ctx"`) | P1 | **Fixed** — require `probe.status === 0` |
| `session-archive.ps1` ignored `yarn preflight:fast` exit code | P1 | **Fixed** — check `$LASTEXITCODE` |
| `bootstrap.ps1` warns on builder pipeline failure but does not fail session | P2 | **Intentional** — Dolt optional; SWC/Vite failures logged |
| `run-builders.ps1` relies on `$LASTEXITCODE` after `node` | P2 | OK on PowerShell 5.1+ |

---

## Readability / Maintainability

| Finding | Severity | Status |
|---------|----------|--------|
| Duplicate `resolveExecutable` in three `.mjs` files | P2 | Deferred — extract to `scripts/lib/spawn-utils.mjs` later |
| Manifest-driven builders clear; tests cover contracts | — | Good |

---

## Verification Run

```powershell
npx vitest run --config vitest.config.mjs --project orchestration scripts/__tests__/builders-orchestrator.test.mjs scripts/__tests__/copilot-workspace-config.test.mjs
node scripts/builders-orchestrator.mjs pipeline preflight-builders
node scripts/preflight.mjs --profile copilot-workspace
```

---

## Fixes Applied This Review

1. `scripts/builders-orchestrator.mjs` — shell-safe spawn
2. `scripts/preflight.mjs` — shell-safe spawn
3. `scripts/resolve-lean-ctx-hook.mjs` — probe logic + shell-safe spawn
4. `scripts/copilot-workspace/session-archive.ps1` — preflight exit code
