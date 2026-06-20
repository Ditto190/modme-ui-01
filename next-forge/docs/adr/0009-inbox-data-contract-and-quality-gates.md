# ADR-0009: Inbox Data Contract and Quality Gates

## Status

**Accepted**

## Context

The inbox funnel (`GenerativeUI_monorepo/docs/inbox/`) feeds a multi-stage pipeline (ingest → embed → categorize → output) persisted in Supabase. Today:

- Frontmatter rules are documented but not enforced at ingest
- Embedding dimensions drifted (256 in SQL vs 384 in embed script)
- No structured error reporting or self-healing for structural issues
- CI runs ingest on push without PR validation; humans debug engineering failures instead of improving content quality

## Decision Drivers

- **Separation of concerns**: humans own semantic quality (titles, tags, research value); automation owns structural quality (schema, enums, dedup, stage integrity)
- **Shift-left validation**: catch bad funnel files on PR before Supabase writes
- **Observable pipeline**: ADR-style reports (`latest.json`, `latest.md`, jsonl) for agents and humans
- **Safe self-healing**: auto-fix only missing timestamps, invalid enums, malformed YAML — never rewrite content

## Quality Dimensions

| Dimension | Funnel contract | Pipeline contract |
|-----------|-----------------|-------------------|
| Completeness | Required frontmatter on `.md`; non-empty text for text formats | `id`, `content_hash`, `created_at`, `status` present |
| Uniqueness | SHA-256 dedup | `content_hash` unique in `inbox_entries` |
| Validity | Enums: `type`, `severity`, `agent_role`, `source_format` | `category_id` references seeded categories; embedding dim = 384 |
| Consistency | `_index.json` vs DB (warn) | Status lifecycle: `indexed` → `categorized` → … |
| Timeliness | `timestamp` freshness (warn) | `updated_at` on stage transitions |

## Decision

Adopt **Inbox Data Contract v1** with:

1. **Zod schemas** in `@repo/schemas` exported to `docs/inbox-pipeline/contracts/`
2. **Quality engine**: `inbox-audit.mjs`, `inbox-fix.mjs`, `intake-orchestrator.mjs`
3. **CI gates**:
   - **PR**: validate-only (funnel lens + tests); no Supabase secrets
   - **Merge to dev/main**: staging dry-run orchestrator with Supabase secrets
   - **Push inbox paths**: funnel audit before write; report artifacts uploaded

## Contract Artifacts

| Path | Purpose |
|------|---------|
| `docs/inbox-pipeline/contracts/inbox-contract.v1.json` | Machine-readable contract |
| `docs/inbox-pipeline/contracts/expectations/funnel.v1.json` | Funnel expectation suite |
| `docs/inbox-pipeline/contracts/expectations/pipeline.v1.json` | Pipeline expectation suite |
| `docs/inbox-pipeline/reports/latest.json` | Latest audit report |
| `.cursor/hooks/state/inbox-errors.jsonl` | Append-only event log |

## Consequences

### Positive

- PRs block structurally invalid inbox captures before merge
- Agents consume structured finding codes (`INBOX.FM.*`, `INBOX.DB.*`)
- Single embedding dimension (384) aligned across SQL, embed script, and RPC

### Negative

- Existing inbox files may need `inbox-fix --apply` for missing frontmatter
- PR checks add ~30s for funnel scan + unit tests
- Staging dry-run requires CI secrets on dev/main pushes

## Implementation

```powershell
yarn inbox:audit              # funnel + optional pipeline lens
yarn inbox:fix --dry-run      # preview safe fixes
yarn inbox:fix:apply          # apply safe fixes
yarn intake:orchestrate       # full pipeline with quality gates
yarn inbox:test               # contract + audit unit tests
```

See [`docs/inbox-pipeline/README.md`](../../../docs/inbox-pipeline/README.md).

## Related

- [ADR-0002: Cloud-First Supabase](./0002-cloud-first-supabase-with-prisma.md)
- [`GenerativeUI_monorepo/docs/inbox/README.md`](../../../GenerativeUI_monorepo/docs/inbox/README.md)
