# ADR-0010: Dolt vs Git + Supabase for Agent Catalog CMS

## Status

Proposed (research only — no implementation in this migration)

## Context

[Dolt](https://www.dolthub.com/blog/2024-10-15-dolt-use-cases/#content-management-for-a-catalog) provides Git-like branch/merge for **SQL tables**. ModMe already uses:

- **Supabase/Postgres + Prisma** (next-forge) for product data and inbox/knowledge
- **Git** for skills, toolsets, agent catalog seeds (`scripts/collections/`, `agent/toolsets.json`)
- **DSP** (`.dsp/`, `scripts/dsp-cli.py`) for agent structural-memory graphs

The migration plan evaluated Dolt for catalog CMS workflows (Threekit-style branch preview before merge).

## Decision

**Do not adopt Dolt in Phase 1.** Continue git-based curation + Supabase promotion for human-reviewed catalog data.

## Rationale

| Criterion             | Dolt                      | Git + Supabase (current)                                  |
| --------------------- | ------------------------- | --------------------------------------------------------- |
| Agent fleet graphs    | No — relational SQL only  | DSP + beads + lean-ctx catalog cover graphs/orchestration |
| Skills/toolsets today | New store + sync pipeline | Already in repo + intake pipeline                         |
| Branch preview        | Native SQL branch         | Git branches + worktrees + PR review                      |
| Ops surface           | +1 database engine        | Existing Supabase + GitHub/GitLab                         |
| Compliance audit      | SQL `dolt_log`            | Git history + Supabase RLS                                |

Dolt remains a **future option** if we need non-developer SQL editors with branch/merge on large tabular catalogs (e.g. 10k+ SKU rows with concurrent editors).

## Consequences

- No Dolt dependency in CI or local setup for this quarter
- Catalog changes stay in git PRs; promoted knowledge stays in Supabase
- Revisit when catalog row volume or non-git editors become a bottleneck

## References

- [Dolt use cases — content management for a catalog](https://www.dolthub.com/blog/2024-10-15-dolt-use-cases/#content-management-for-a-catalog)
- ModMe inbox pipeline ADR-0009
- `scripts/dsp-cli.py` — structural memory (not a substitute for Dolt)
