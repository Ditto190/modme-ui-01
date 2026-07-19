---
title: "ADR-0014: KM C4 Ownership Taxonomy"
status: "Accepted"
date: "2026-07-11"
authors: "Cursor agent"
tags: ["architecture", "decision", "knowledge-management", "inbox"]
supersedes: ""
superseded_by: ""
---

## Status

**Accepted**

## Context

ModMe spans multiple bounded contexts (root orchestration, next-forge, GenerativeUI legacy stack, agent runtime). Inbox captures and MDA labels need a stable **C4 container** tag so ingestion, catalogue, and RAG routing can scope knowledge to the correct codebase without cross-monorepo imports.

Work is tracked in **beads** (`modme` prefix). Knowledge enters via **inbox contract v1** (ADR-0009) → intake → Supabase pgvector / MDA.

## Decision

Adopt four C4 **container** values in inbox frontmatter (`c4_container`) and MDA labels:

| `c4_container`       | Owns                                                                      | Primary doc home                  |
| -------------------- | ------------------------------------------------------------------------- | --------------------------------- |
| `root-orchestration` | `scripts/`, `data/agent-*`, `docs/agent-*`, root `yarn agent:*`           | `docs/`                           |
| `next-forge`         | `next-forge/**` apps, packages, Mintlify, workshop                        | `next-forge/docs/`                |
| `generative-ui`      | `GenerativeUI_monorepo/**` (excludes `UniversalWorkbench*` unless tasked) | `GenerativeUI_monorepo/docs/`     |
| `agent-stack`        | `agent/**`, GenerativeUI `apps/agent-server`, CopilotKit paths            | `agent/`, GenerativeUI agent docs |

### Rules

1. Every structured inbox `.md` capture SHOULD set `c4_container` when the knowledge applies to one primary container.
2. `yarn inbox:audit` warns on invalid `c4_container` (see `inbox-contract.v1.json` enum `c4Container`).
3. MDA classification SHOULD echo `c4_container` as a tag for catalogue/RAG filters.
4. **next-forge app DB** (Prisma/Supabase product data) is **not** a KM container — integrate via HTTP/contracts only ([monorepo-boundaries](../../.cursor/rules/monorepo-boundaries.mdc)).

## Consequences

- Journal → inbox promotion (`scripts/journal-to-inbox.mjs`) defaults `c4_container: agent-stack` for private journal exports.
- Agents filing inbox drops must pick the container that owns the changed paths.
- Future UI filters in KM brain can group by `c4_container` without path heuristics.

## References

- [Inbox pipeline README](../inbox-pipeline/README.md)
- [ADR-0009 dual-store / inbox contract](../../next-forge/docs/adr/0009-inbox-data-contract-and-quality-gates.md)
- [beads-workflow.md](../beads-workflow.md)
