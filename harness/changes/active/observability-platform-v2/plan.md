# observability-platform-v2 — Plan (HOW)

## Implementation order

1. Spec 7 — git-hook-bridge + post-commit (enables Spec 1 git-hook collector)
2. Spec 1 — log-sources registry + agenttrace collector
3. Spec 2 — strict mode, DLQ, coverage stats in bridge
4. Spec 3 — span synthesis module + cmdSync wiring + trace_refs
5. Spec 4 — PARENT_SESSION_ID in session-logger, otel-session-start, adapters
6. Spec 5 — ADR 0011 stub
7. Spec 6 — API trace_refs join, session_id filter, report enhancements
8. lean-ctx maps + CI workflow updates

## Key files

| Area | Files |
|------|-------|
| Collect | `scripts/telemetry/telemetry-cli.mjs`, `lib/git-hook-bridge.mjs` |
| Normalize/Promote | `scripts/telemetry/lib/telemetry-bridge.mjs`, `lib/span-synthesis.mjs` |
| Tracing | `otel-session-start.mjs`, `session-logger.ps1`, `agent-platform-adapters.mjs` |
| Audit | `scripts/telemetry-audit.mjs` |
| UI | `next-forge/apps/api/app/telemetry/ingest/route.ts`, Session Ops components |
| Hooks | `.githooks/post-commit`, `scripts/pre-commit-checks.mjs` |
| Docs | `docs/observability/log-sources.v1.json`, ADR 0011, maps/ |

## Verification

```powershell
yarn telemetry:test:contracts
node scripts/telemetry/telemetry-cli.mjs sync --dry-run --strict
yarn telemetry:audit --lens sources
node scripts/lint-ecl.mjs
```
