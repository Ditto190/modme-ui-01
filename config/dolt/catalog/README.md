# Dolt catalog CMS (evaluation)

Optional [Dolt](https://github.com/dolthub/dolt) database for catalog branch/merge experiments. Primary path remains git + Supabase per [ADR-0010](../../../docs/architecture/decisions/0010-dolt-catalog-cms-evaluation.md).

## Quick start

```powershell
# Install Dolt: https://github.com/dolthub/dolt#installation
dolt version

cd config/dolt/catalog
dolt init modme-catalog
dolt sql -f schema.sql
dolt status
```

## Orchestration

```powershell
yarn builders:dolt:status
yarn builders:pipeline catalog-cms-eval
```

CMS use case reference: [Dolt — content management for a catalog](https://www.dolthub.com/blog/2024-10-15-dolt-use-cases/#content-management-for-a-catalog).
