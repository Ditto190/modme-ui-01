# ADR-0011: Defer Observability Semantic Search

## Status

Accepted — 2026-07-05

## Context

Migration `009_observability_tenant.sql` adds:

- `eval_signals.embedding vector(384)` with ivfflat index
- `idx_telemetry_events_message_fts` GIN index on `telemetry_events.message`
- RPC `match_observability_signals` (vector-only on `eval_signals`)

The Knowledge UI `SessionOpsPanel` uses a recency feed via `GET /telemetry/ingest` (pipeline runs + eval signals). Embedding ETL and hybrid search API wiring are not yet implemented.

## Decision

**Defer semantic/hybrid search** for observability data. Keep recency-based Session Ops feed. Preserve schema indexes and RPC for a future spec; do not drop migration 009 artifacts.

Greptime SQL span synthesis (Phase A) ships now; OTLP SDK export remains Phase B.

## Consequences

- `eval_signals.embedding` may stay NULL until a future embedding job exists
- `match_observability_signals` is not called from API routes
- BM25 + vector RRF fusion documented as future work in `similarity-search-patterns` playbook
- lean-ctx `ctx_callgraph` / `ctx_graph` outputs may feed Greptime `code_index` at promote boundary (see `docs/observability/maps/`)

## References

- [log-sources.v1.json](../observability/log-sources.v1.json) — `eval-signals-embedding` marked deferred
- [modme-distributed-observability skill](../../.agents/skills/modme-distributed-observability/SKILL.md)
