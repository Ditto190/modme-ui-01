# Loki Mode CONTINUITY.md — Monorepo_ModMe

> **Version:** 2.35.0 | **Phase:** QA | **Role:** se-system-architecture-reviewer
> **Last Updated:** 2026-06-20T23:09Z
> **Constraint:** Haiku for ops/tests, Sonnet for development, Opus for architecture only

---

## What Am I Doing RIGHT NOW?

**Completed this session:**
- ✅ `integrate-skillsh-index` — wired `--details` + `--export-collection` into `scripts/install-agents.mjs`
- ✅ Bootstrapped `.loki/` SDLC framework directory + queue + state + memory dirs

**Current status:** All 8 todos complete. Ready to:
1. Commit `.loki/` bootstrap + installer additions
2. Start QA phase: verify Supabase env vars + smoke test pipeline

---

## Current Phase: QA

### QA Gate Checklist (must pass before Phase 5 / Deployment)
- [ ] **P0**: Supabase env vars confirmed in `next-forge/.env` + CI secrets
- [ ] **P0**: Drop test `.md` into `docs/inbox/` → workflow runs → row in Supabase
- [ ] **P0**: `inbox-embeddings.yml` produces non-null embedding column
- [ ] **P0**: `mda-categorize.yml` assigns tags + category
- [ ] **P1**: `output-generate.yml` produces `output_artefacts` row
- [ ] **P2**: `skillsh-mcp` registered in `.mcp.json`
- [ ] **P2**: Phase 5 Query UI scaffolded

### Pending Queue (see .loki/queue/pending.json)
| ID | Priority | Model |
|----|----------|-------|
| supabase-env-vars-verified | P0 | Haiku |
| e2e-pipeline-verification | P0 | Sonnet |
| mcp-json-registration | P2 | Haiku |
| phase5-query-ui | P1 | Sonnet |

---

## Architecture Map

### Completed Infrastructure
```
docs/inbox/                     ← multi-format inbox funnel
scripts/inbox-ingest.mjs        ← Phase 1: SHA-256 dedup + Supabase upsert
scripts/inbox-embeddings.mjs    ← Phase 2: embeddinggemma-300m → pgvector UPDATE
scripts/mda-categorize.mjs      ← Phase 3: FastAPI /categorize + taxonomy
scripts/output-generate.mjs     ← Phase 4: OutputSchema → artefacts
.github/workflows/
  inbox-ingest.yml              ← triggers on push to docs/inbox/
  inbox-embeddings.yml          ← triggers after ingest
  mda-categorize.yml            ← triggers after embeddings
  output-generate.yml           ← daily + manual dispatch
.github/agents/                 ← 20 agent .md files
.agents/skills/                 ← 41 skills installed
next-forge/packages/database/prisma/schema.prisma ← InboxEntry + relations models
```

### Environment Variables Required
| Var | Used By | Location |
|-----|---------|----------|
| NEXT_PUBLIC_SUPABASE_URL | inbox-ingest.mjs, mda-categorize.mjs | next-forge/.env |
| SUPABASE_SERVICE_ROLE_KEY | inbox-ingest.mjs, inbox-embeddings.mjs | next-forge/.env |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | next-forge browser client | next-forge/.env |

---

## Mistakes & Learnings (Do NOT Repeat)

1. **`create` tool silently fails on large files (>5KB)** → always verify with `Test-Path`; use `Set-Content` as workaround
2. **`hooks.json` is ReadOnly,Archive** → do NOT modify; `install-cursor-cookbook.ps1` will try to overwrite it
3. **Package manager discipline**: `next-forge` = `npx bun` only; `GenerativeUI_monorepo` = `yarn` only
4. **Supabase env vars** — NOT verified yet; check before claiming pipeline works
5. **`skills.sh` API returns 404** — always use vendor fallback, never hard-fail on skills.sh unreachable
6. **Positive `tabindex` values** on any new UI components → use only 0 or -1
7. **`.loki/` must exist** before Loki Mode can track state across sessions

---

## Key File Index

| File | Purpose |
|------|---------|
| `scripts/install-agents.mjs` | Central agent/skill/collection installer |
| `scripts/collections/modme-*.collection.json` | 4 collection manifests |
| `.agents/install-report.json` | All 41 installed items |
| `docs/inbox-pipeline/README.md` | Full Mermaid architecture reference |
| `docs/supabase/inventory.md` | Supabase setup progress |
| `next-forge/packages/database/prisma/schema.prisma` | Prisma models |
| `.loki/queue/pending.json` | Next tasks |
| `.loki/state/orchestrator.json` | SDLC phase state |
| `C:\Users\dylan\.copilot\session-state\...\plan.md` | Full Plan v3 (34KB) |

---

## Pattern Library (What Works Here)

- **Vendor-first resolution**: check `.vendor/` before calling remote APIs
- **SHA-256 dedup**: hash file content → check Supabase before re-inserting
- **ReadOnly lock**: `Set-ItemProperty -Name Attributes -Value ReadOnly,Archive` to protect critical files
- **Collection manifests**: JSON array of `{ slug, kind, src }` items for bulk install
- **ES module scripts**: all pipeline scripts use `import/export`, `node scripts/X.mjs` invocation
- **Parallel GitHub Actions**: use `needs:` chains between inbox → embeddings → categorize → output

---

## SDLC Phase Transitions

| Phase | Entry Criteria | Exit Criteria |
|-------|---------------|---------------|
| QA | All Phase 1–4 scripts written | E2E smoke test passes |
| Deployment | QA gates pass | Workflows run in production CI |
| Phase 5 (UI) | Supabase has live data | Knowledge UI renders real entries |
| Growth Loop | Phase 5 live | User-reported issues < 2 per week |
