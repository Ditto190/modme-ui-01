# ADR-0013: Dolt + Beads + Entire Agent Data Plane

## Status

Accepted (2026-07-10)

## Context

ModMe needs a first-class **agent memory plane** for multi-worktree agents:

- Session transcripts (why code changed)
- Task graphs that survive context compaction
- Versioned SQL for agent/catalog CMS

[ADR-0010](0010-dolt-catalog-cms-evaluation.md) deferred Dolt for catalog CMS. Beads already stores issues in Dolt (embedded). [Entire CLI](https://github.com/entireio/cli) captures agent sessions on a git checkpoint branch. next-forge product data remains on Supabase Postgres (pgvector, RLS, Auth.js).

## Decision

**Adopt a dual-store architecture:**

| Plane | Store | Role |
|-------|--------|------|
| Product + inbox/knowledge UI | Supabase Postgres + Prisma | SoR for app data and embeddings |
| Agent tasks + memories | Beads on Dolt | Task graph; prefer local `dolt sql-server` (:3307) for multi-writer worktrees |
| Agent/catalog CMS | Dolt at `config/dolt/catalog/` | Required for agent preflight; CI may skip |
| Agent session transcripts | Entire CLI (local) | Checkpoints on `entire/checkpoints/v1`; telemetry off; no session push |

**Do not** rewrite next-forge Prisma schemas onto Dolt (MySQL wire ≠ Postgres/pgvector).

This ADR **supersedes ADR-0010** for the agent/catalog plane. ADR-0010 remains historical context.

## Consequences

- Local install: `yarn entire:install`, `winget install DoltHub.Dolt`, `yarn dolt:up`
- Health: `yarn km:status`
- Catalog init: `yarn dolt:catalog:init`
- Product CI (`yarn verify:forge`) does not hard-fail when Dolt is missing on runners
- Agent session start runs `scripts/km-session-bootstrap.ps1` then `catalog-cms-eval` builders pipeline as preflight ([ADR-0014](0014-km-session-startup-wiring.md))
- Worktree setup and VS Code `next-forge: dev core` soft-depend on KM bootstrap; strict launch available for KM debugging

## References

- [entireio/cli](https://github.com/entireio/cli)
- [dolthub/dolt](https://github.com/dolthub/dolt)
- [gastownhall/beads](https://github.com/gastownhall/beads)
- [docs/KNOWLEDGE_QUICKSTART.md](../../KNOWLEDGE_QUICKSTART.md)
- [docs/knowledge/CATALOG.md](../../knowledge/CATALOG.md)
- [docs/monorepo/km-agent-data-plane-startup.md](../../monorepo/km-agent-data-plane-startup.md)
- [config/dolt/catalog/README.md](../../../config/dolt/catalog/README.md)
- [ADR-0014](0014-km-session-startup-wiring.md)
