# Dolt catalog CMS

Local [Dolt](https://github.com/dolthub/dolt) database for agent/catalog CMS. Product data stays on Supabase per [ADR-0013](../../../docs/architecture/decisions/0013-dolt-beads-entire-agent-data-plane.md) (supersedes ADR-0010).

## Quick start

```powershell
# Install Dolt: winget install DoltHub.Dolt
dolt version

yarn dolt:up                 # shared sql-server on 127.0.0.1:3307
yarn dolt:catalog:init       # init + apply schema.sql
yarn dolt:status
yarn builders:dolt:status
```

Manual:

```powershell
cd config/dolt/catalog
dolt init
dolt sql -f schema.sql
dolt status
```

## Orchestration

```powershell
yarn builders:dolt:status
yarn builders:pipeline catalog-cms-eval
yarn km:status
```

## Multi-worktree

Run **one** `yarn dolt:up` per machine. All worktrees share `:3307`. Do not start a second sql-server per worktree.

## Tables

- `agent_catalog_entries` — agent fleet catalog rows
- `catalog_promotion_queue` — inbox → catalog promotion queue
- `knowledge_doc_index` — classified KM doc index (not product inbox)

CMS use case reference: [Dolt — content management for a catalog](https://www.dolthub.com/blog/2024-10-15-dolt-use-cases/#content-management-for-a-catalog).
