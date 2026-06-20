# Architecture Review: Phases 1–4 Assessment

> **Reviewer:** se-system-architecture-reviewer (Loki Mode)
> **Date:** 2026-06-20
> **Scope:** Inbox→MDA→Supabase pipeline, Phases 1–4
> **Standard:** SDLC QA gate — must pass before Phase 5 (Query UI) begins

---

## Executive Summary

Phases 1–4 are **IMPLEMENTED** but **NOT YET VERIFIED** against a live Supabase instance. The architecture is sound and follows established monorepo patterns. Two P0 blockers must be resolved before deployment: Supabase environment variable confirmation and an end-to-end smoke test.

**Verdict: CONDITIONAL PASS** — resolve P0 blockers, then advance to Phase 5.

---

## Phase 1 — Foundation (inbox-ingest.mjs)

### ✅ Strengths
- SHA-256 content hashing prevents duplicates (O(1) dedup check via Supabase `contentHash` unique index)
- Multi-format detection: MIME type + extension fallback
- Structured frontmatter extraction (YAML) with graceful degradation for non-.md files
- Binary upload to Supabase Storage for PDF/image types
- Workflow triggers correctly on `push to docs/inbox/**`

### ⚠️ Risks
| Risk | Severity | Mitigation |
|------|----------|-----------|
| SUPABASE_SERVICE_ROLE_KEY not set in CI secrets | **P0 Blocker** | Verify in GitHub repo Settings → Secrets |
| Large binary files (>50MB PDFs) may timeout in CI | Medium | Add `max-content-length` guard; skip storage upload if >10MB |
| YAML frontmatter parse errors silently skip metadata | Low | Add `try/catch` + log warning, still ingest raw content |

### Recommendation
Add explicit error on missing env vars at script startup:
```js
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL not set');
```

---

## Phase 2 — Embeddings (inbox-embeddings.mjs)

### ✅ Strengths
- Uses `@xenova/transformers` (local, no API key required)
- 256-dim vectors stored in pgvector `VECTOR(256)` column
- Processes only entries where `embedding IS NULL` (idempotent)
- Workflow chains from Phase 1 via `needs: [ingest]`

### ⚠️ Risks
| Risk | Severity | Mitigation |
|------|----------|-----------|
| `@xenova/transformers` model download (~300MB) on first CI run | Medium | Cache model in GH Actions `~/.cache/huggingface` |
| GitHub-hosted runners have 14GB RAM — model fits safely | Low | ✅ No action needed |
| Embedding dimension mismatch if model changes | Medium | Pin model version in script + document in ADR |

### Recommendation
Cache Xenova model in workflow:
```yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/huggingface
    key: xenova-embeddinggemma-300m-v1
```

---

## Phase 3 — MDA Categorization (mda-categorize.mjs)

### ✅ Strengths
- Calls FastAPI `/api/inbox/categorize` with entry batch
- Updates `tags`, `category_id`, `entry_type` in Supabase
- Taxonomy tree in `categories` table supports hierarchical classification
- Graceful fallback if FastAPI server is unreachable (logs warning, skips entry)

### ⚠️ Risks
| Risk | Severity | Mitigation |
|------|----------|-----------|
| FastAPI `agent-server` not running in CI | **P0 Blocker** | Script must detect offline and use local fallback tagger |
| Python deps not installed in CI runner | Medium | Add `pip install -r requirements.txt` step to workflow |
| Category taxonomy not seeded | Medium | Add seed migration to Phase 2 migration |

### Critical Gap: Offline Fallback
The categorization script assumes `http://localhost:8000` is running. In CI, this won't be available unless the agent-server is started as a background service. **Recommended fix**: implement a local regex/keyword fallback tagger in `mda-categorize.mjs` that activates when FastAPI is unreachable.

---

## Phase 4 — Output Generation (output-generate.mjs)

### ✅ Strengths
- Query-based: fetches `output_schemas` rows and generates artefacts
- Produces skills JSON, Storybook stories, ADR promotions
- Daily + manual dispatch (appropriate for batch generation)
- Output written back to `output_artefacts` table

### ⚠️ Risks
| Risk | Severity | Mitigation |
|------|----------|-----------|
| No `output_schemas` rows exist yet | Medium | Add seed data or defer until inbox has real entries |
| ADR promotion writes to `next-forge/docs/adr/` — needs git push in CI | Medium | Ensure CI workflow has `contents: write` permission |
| Generated Storybook stories not wired to Storybook build | Low | Phase 5 task |

---

## Cross-Phase Architecture Review

### Data Flow Integrity
```
inbox/*.md → ingest (dedup + extract) → inbox_entries
          → embeddings (pgvector)     → inbox_entries.embedding
          → categorize (tags/type)    → inbox_entries.category_id, tags[]
          → output_generate           → output_schemas → output_artefacts
```
**Assessment:** Linear pipeline with correct `needs:` chaining. ✅

### Database Schema Review (next-forge/packages/database/prisma/schema.prisma)
- `InboxEntry` ↔ `EntryRelation` — bidirectional self-join modeled correctly
- `Category` — recursive tree via `parentId` self-join — correct
- `OutputSchema` ↔ `OutputArtefact` — one-to-many via `schemaId` — correct
- **Missing**: pgvector `embedding` column not in Prisma schema (stored via raw migration) — document this in ADR
- **Missing**: RLS policies — `se-system-architecture-reviewer` recommends adding before production

### Security Assessment
| Control | Status |
|---------|--------|
| Service role key in CI secrets | ⚠️ Unverified |
| RLS on `inbox_entries` | ❌ Not added yet |
| Secret scanning in `inbox-ingest.mjs` | ⚠️ Not implemented (risk: agents paste secrets) |
| `SUPABASE_SERVICE_ROLE_KEY` not logged | ✅ Not logged in scripts |

**Recommendation:** Add pre-ingest secret scan using regex patterns from `scripts/cleanup-cursor-hooks.ps1` blocked patterns.

---

## Acceptance Criteria for QA Gate

To advance to Phase 5 (Query UI) and Deployment:

| Criterion | Status | Owner |
|-----------|--------|-------|
| Drop `test.md` in `docs/inbox/` → row in Supabase `inbox_entries` | 🔲 Pending | Dev |
| `inbox_entries.embedding` non-null after Phase 2 run | 🔲 Pending | Dev |
| `inbox_entries.tags` populated after Phase 3 run | 🔲 Pending | Dev |
| `output_artefacts` row created by Phase 4 | 🔲 Pending | Dev |
| No unhandled exceptions in any workflow logs | 🔲 Pending | QA |
| Supabase env vars confirmed in CI | 🔲 Pending | DevOps |

---

## Phase 5 (Query UI) Pre-Conditions

Before starting Phase 5:
1. At least 5 live rows in `inbox_entries` with embeddings
2. At least 3 categories in `categories` table
3. API routes `/api/inbox` + `/api/catalogue` designed (OpenAPI spec in `.loki/specs/`)

---

## Linked Documents

- [docs/inbox-pipeline/README.md](../../docs/inbox-pipeline/README.md) — Mermaid architecture
- [docs/supabase/inventory.md](../../docs/supabase/inventory.md) — Supabase setup status
- [next-forge/docs/adr/0001-supabase-local-development-with-hybrid-cloud.md](../../next-forge/docs/adr/0001-supabase-local-development-with-hybrid-cloud.md)
- [.loki/CONTINUITY.md](../../.loki/CONTINUITY.md) — working memory
- [.loki/queue/pending.json](../../.loki/queue/pending.json) — P0 tasks

---

*Generated by se-system-architecture-reviewer via Loki Mode v2.35.0*
