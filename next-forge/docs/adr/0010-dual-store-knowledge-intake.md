# ADR-0010: Dual-store knowledge intake (GreptimeDB + Supabase)

**Status**: Accepted  
**Date**: 2026-06-27  
**Supersedes**: N/A (extends ADR-0009 inbox contract)

## Context

The unified intake pipeline ingests **web crawl data** and **local repo AST patterns** into the existing inbox → knowledge funnel. Two storage characteristics conflict:

- **Code patterns** need fast semantic search over large AST chunks with metadata (`ast_kind`, `schema_json`) — GreptimeDB `code_index` table.
- **Knowledge entries** need pgvector RAG, MDA taxonomy, API/UI exposure — Supabase `inbox_entries`.

## Decision

Use a **dual store** with sync **only at the promote boundary**:

| Content | Store | Embedding | Cross-ref |
|---------|-------|-----------|-----------|
| Inbox prose / scrape text | Supabase `inbox_entries` | pgvector 384-dim HNSW (partial: `status = 'indexed'`) | `source_kind`, `code_pattern_ids[]` |
| AST / code patterns | GreptimeDB `code_index` | MiniLM 384 (client-side top-K) | `code_pattern_refs` join table |

Validation: `packages/intake-contracts` (Zod) at classify, promote, code-index, and ingest stages.

## Consequences

**Positive**

- Greptime retains full AST text; Supabase holds promoted summaries + tags.
- Promote writes `code_pattern_ids` and optional `code_pattern_refs` rows.
- HNSW partial index reduces pgvector size for filtered retrieval.

**Negative**

- Two connection strings (`GREPTIME_PSQL_URL`, Supabase service role).
- Orphan Greptime refs possible if promote fails mid-flight — audit via `inbox-audit.mjs --lens pipeline`.

## Implementation

- Migration: `next-forge/supabase/migrations/008_code_pattern_refs.sql`
- Orchestrator modes: `--mode=code-index`, `--mode=full`
- Molecules: `code_pattern_scanner`, `knowledge_intake` in agent-generator MCP registry
