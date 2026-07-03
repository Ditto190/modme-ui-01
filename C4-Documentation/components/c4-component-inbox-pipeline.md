# C4 Component — inbox pipeline

## Responsibility

Capture → audit → ingest → embed → promote knowledge from `GenerativeUI_monorepo/docs/inbox/` into Supabase pgvector.

## Location

- Docs: `docs/inbox-pipeline/`
- Scripts: `scripts/inbox-audit.mjs`, `scripts/run-intake.mjs`, `scripts/intake-orchestrator.mjs`
- Contract: `docs/inbox-pipeline/contracts/inbox-contract.v1.json`

## Evidence

- `docs/inbox-pipeline/README.md` (ADR-0009)
