# C4 Component — Intake Pipeline

**Location:** Root `scripts/` + Supabase pgvector

## Responsibility

Inbox → audit → ingest → embed → promote knowledge. Dual-store with GreptimeDB for code index (optional).

## Entry commands

- `yarn intake`, `yarn intake:orchestrate`
- `yarn inbox:audit`, `yarn inbox:fix`

## Evidence

- `docs/inbox-pipeline/README.md`
- `scripts/intake-orchestrator.mjs`
- `@repo/schemas` inbox exports
