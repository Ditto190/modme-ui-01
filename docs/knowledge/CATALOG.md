# Knowledge catalog index

Classification of ModMe knowledge docs and tooling. Update when adding/removing KM surfaces.

**Legend:** `canonical` · `legacy` · `missing` · `supporting`

| Path | Classification | Plane | Notes |
|------|----------------|-------|-------|
| [docs/KNOWLEDGE_QUICKSTART.md](../KNOWLEDGE_QUICKSTART.md) | canonical | hub | Single runbook entrypoint |
| [docs/inbox-pipeline/README.md](../inbox-pipeline/README.md) | canonical | product | Inbox → Supabase knowledge |
| [docs/beads-workflow.md](../beads-workflow.md) | canonical | agent | Beads + Dolt task graph |
| [docs/architecture/decisions/0013-dolt-beads-entire-agent-data-plane.md](../architecture/decisions/0013-dolt-beads-entire-agent-data-plane.md) | canonical | agent | Dual-store ADR |
| [config/dolt/catalog/](../../config/dolt/catalog/) | canonical | agent | Dolt catalog CMS |
| [.entire/settings.json](../../.entire/settings.json) | canonical | agent | Entire local-only config |
| [scripts/entire/](../../scripts/entire/) | canonical | agent | Entire install/status/doctor |
| [scripts/dolt/](../../scripts/dolt/) | canonical | agent | Dolt up/down/status/catalog |
| [scripts/km-status.mjs](../../scripts/km-status.mjs) | canonical | hub | `yarn km:status` |
| [docs/architecture/decisions/0010-dolt-catalog-cms-evaluation.md](../architecture/decisions/0010-dolt-catalog-cms-evaluation.md) | legacy | agent | Superseded by ADR-0013 |
| [docs/KNOWLEDGE_MANAGEMENT.md](../KNOWLEDGE_MANAGEMENT.md) | legacy | toolsets | Toolset JSON↔MD sync; `agent/` deprecated |
| [docs/KNOWLEDGE_BASE_INTEGRATION.md](../KNOWLEDGE_BASE_INTEGRATION.md) | legacy | issues | Issue context mapper docs |
| [docs/KB_QUICK_REFERENCE.md](../KB_QUICK_REFERENCE.md) | legacy | issues | Overlaps scripts/knowledge-management |
| [docs/KB_IMPLEMENTATION_SUMMARY.md](../KB_IMPLEMENTATION_SUMMARY.md) | legacy | issues | Historical |
| [docs/KB_MEMORY_GRAPH.md](../KB_MEMORY_GRAPH.md) | legacy | issues | Historical |
| [scripts/knowledge-management/](../../scripts/knowledge-management/) | supporting | issues+legacy | Issue mapper + sync-docs |
| [docs/agent-index.md](../agent-index.md) | supporting | hub | Onboarding map |
| `templates/obsidian-clipper/` | missing | capture | Claimed in CHANGELOG; not on disk |
| `scripts/knowledge-management/export-obsidian-clipper.mjs` | missing | capture | Referenced by `yarn docs:clipper:*` |

## How to classify a new doc

1. Product searchable knowledge → inbox pipeline (`canonical` / product)
2. Agent task memory → beads (`canonical` / agent)
3. Catalog tabular CMS → Dolt catalog (`canonical` / agent)
4. Session why/how → Entire (`canonical` / agent)
5. Old toolset / issue-KB only → `legacy`

## Seed rows (Dolt `knowledge_doc_index`)

After `yarn dolt:catalog:init`, optional:

```sql
INSERT INTO knowledge_doc_index (id, path, title, classification, plane, status)
VALUES
  ('kq', 'docs/KNOWLEDGE_QUICKSTART.md', 'KM Quickstart', 'canonical', 'hub', 'active'),
  ('inbox', 'docs/inbox-pipeline/README.md', 'Inbox Pipeline', 'canonical', 'product', 'active'),
  ('adr13', 'docs/architecture/decisions/0013-dolt-beads-entire-agent-data-plane.md', 'ADR-0013', 'canonical', 'agent', 'active');
```
