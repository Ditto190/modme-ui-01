# ADR-0010: Catalogue Items as Unified Agent Registry

## Status

**Accepted**

## Context

The inbox→knowledge pipeline stores raw agent captures in `inbox_entries` and generated artefacts in `output_schemas` / `output_artefacts`. Downstream consumers need a single addressable registry:

- Web agent catalog UI (`apps/web/catalog`)
- Eval popularity scores (`eval_catalogue_scores`)
- Future VoltAgent runtime loader (Phase C)
- awesome-copilot-style resource taxonomy (agents, skills, hooks, workflows, plugins)

Previously, the web catalog used hardcoded mock data while `/api/catalogue` queried `output_schemas` directly. Eval tables referenced a non-existent `catalogue_items` table.

## Decision Drivers

- **Data structure first**: one canonical row type for published agents/skills before wiring UI and runtime
- **Separation of concerns**: inbox = capture; output_schemas = generation intermediate; catalogue_items = curated publish
- **Option value**: VoltAgent LibSQL session memory stays separate; institutional knowledge accessed via tools

## Decision

Adopt **`catalogue_items`** as the canonical addressable registry with:

1. **Prisma models**: `CatalogueItem`, `CataloguePopularitySnapshot`, `EvalCatalogueScore`
2. **Promotion pipeline**: `scripts/catalogue-sync.mjs` upserts from `output_schemas` and tagged inbox entries
3. **Orchestrator integration**: runs after `output-generate.mjs` in `intake-orchestrator.mjs`
4. **API**: `GET /api/catalogue?action=list|popular|search` queries `catalogue_items`
5. **Contract**: Zod schemas in `@repo/schemas/catalogue.ts`

### Layer responsibilities

| Layer | Table | Role |
|-------|-------|------|
| Capture | `inbox_entries` | Raw agent notes, embeddings, relations |
| Generation | `output_schemas`, `output_artefacts` | MDA-generated skills, stories, ADRs |
| Registry | `catalogue_items` | Published, addressable agents/skills for UI/runtime/eval |
| Session | VoltAgent LibSQL | Conversation memory (not merged with Supabase) |

## Consequences

### Positive

- Web catalog, eval scores, and future VoltAgent loader share one FK target
- Promotion is idempotent (upsert on `slug`)
- Backward compat: `/api/catalogue` can still return `output_schemas` during transition

### Negative

- Extra sync step in orchestrator
- Seed data in migration 008 for dev/E2E until real pipeline produces items

## Implementation

```powershell
# After schema push
cd next-forge/packages/database
bun run db:push
bunx supabase db push --workdir ../..

# Full pipeline including catalogue sync
yarn intake:orchestrate
```

## Related

- [ADR-0009: Inbox Data Contract](./0009-inbox-data-contract-and-quality-gates.md)
- [ADR-0002: Cloud-First Supabase](./0002-cloud-first-supabase-with-prisma.md)
- [`docs/inbox-pipeline/README.md`](../../../docs/inbox-pipeline/README.md)

---

**ADR Created**: 2026-06-21
