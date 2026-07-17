# ADR-0010: Dolt vs Git + Supabase for Agent Catalog CMS

## Status

<<<<<<< HEAD
Proposed (research only — no implementation in this migration)

## Context

[Dolt](https://www.dolthub.com/blog/2024-10-15-dolt-use-cases/#content-management-for-a-catalog) provides Git-like branch/merge for **SQL tables**. ModMe already uses:
=======
**Superseded by [ADR-0013](0013-dolt-beads-entire-agent-data-plane.md)** (2026-07-10).

Historical note: this ADR deferred Dolt for Phase 1 catalog CMS. ADR-0013 adopts Dolt for the **agent/catalog plane** while keeping Supabase as product SoR.

## Context

[Dolt](https://github.com/dolthub/dolt) provides Git-like branch/merge for **SQL tables**. ModMe already uses:
>>>>>>> origin/dev

- **Supabase/Postgres + Prisma** (next-forge) for product data and inbox/knowledge
- **Git** for skills, toolsets, agent catalog seeds (`scripts/collections/`, `agent/toolsets.json`)
- **DSP** (`.dsp/`, `scripts/dsp-cli.py`) for agent structural-memory graphs

The migration plan evaluated Dolt for catalog CMS workflows (Threekit-style branch preview before merge).

<<<<<<< HEAD
## Decision

**Do not adopt Dolt in Phase 1.** Continue git-based curation + Supabase promotion for human-reviewed catalog data.

## Rationale
=======
## Decision (historical)

**Do not adopt Dolt in Phase 1.** Continue git-based curation + Supabase promotion for human-reviewed catalog data.

## Rationale (historical)
>>>>>>> origin/dev

| Criterion             | Dolt                      | Git + Supabase (current)                                  |
| --------------------- | ------------------------- | --------------------------------------------------------- |
| Agent fleet graphs    | No — relational SQL only  | DSP + beads + lean-ctx catalog cover graphs/orchestration |
| Skills/toolsets today | New store + sync pipeline | Already in repo + intake pipeline                         |
| Branch preview        | Native SQL branch         | Git branches + worktrees + PR review                      |
| Ops surface           | +1 database engine        | Existing Supabase + GitHub/GitLab                         |
| Compliance audit      | SQL `dolt_log`            | Git history + Supabase RLS                                |

<<<<<<< HEAD
Dolt remains a **future option** if we need non-developer SQL editors with branch/merge on large tabular catalogs (e.g. 10k+ SKU rows with concurrent editors).

## Consequences

- No Dolt dependency in CI or local setup for this quarter
- Catalog changes stay in git PRs; promoted knowledge stays in Supabase
- Revisit when catalog row volume or non-git editors become a bottleneck

## References

- [Dolt use cases — content management for a catalog](https://www.dolthub.com/blog/2024-10-15-dolt-use-cases/#content-management-for-a-catalog)
- ModMe inbox pipeline ADR-0009
- `scripts/dsp-cli.py` — structural memory (not a substitute for Dolt)
=======
## Consequences (historical)

- No Dolt dependency in CI or local setup for that quarter
- Catalog changes stayed in git PRs; promoted knowledge stayed in Supabase

## References

- [ADR-0013 — Dolt + Beads + Entire agent data plane](0013-dolt-beads-entire-agent-data-plane.md)
- [Dolt use cases — content management for a catalog](https://www.dolthub.com/blog/2024-10-15-dolt-use-cases/#content-management-for-a-catalog)
- ModMe inbox pipeline ADR-0009
>>>>>>> origin/dev
