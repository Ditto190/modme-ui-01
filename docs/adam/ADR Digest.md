---
tags:
  - adam
  - adr
  - decision
type: digest
updated: 2026-07-11
---

# ADR Digest

Architecture Decision Records are first-class memory for A.D.A.M. Prefer an existing ADR over inventing architecture in chat.

## Locations

| Tree                           | Notes                                                          |
| ------------------------------ | -------------------------------------------------------------- |
| `docs/adr/`                    | Root/repo ADRs (lean-ctx, observability)                       |
| `docs/architecture/decisions/` | Agent gateway, Dolt eval, observability search                 |
| `next-forge/docs/adr/`         | Supabase, inbox contract, dual-store, orchestration, worktrees |

next-forge ADRs are **outside** the sidecar `docs/` junction — summarize here or open the monorepo path when needed.

## Index (accepted / notable)

### next-forge

| ADR  | Title                                                    |
| ---- | -------------------------------------------------------- |
| 0001 | Supabase local development with hybrid cloud             |
| 0002 | Cloud-first Supabase with Prisma                         |
| 0009 | Inbox data contract and quality gates                    |
| 0010 | Dual-store knowledge intake / GH-AW secrets (see folder) |
| 0011 | Terminal orchestration without Nx / Turbo remote cache   |
| 0012 | Bounded parallel agent lifecycle                         |

### Root `docs/adr`

| ADR  | Title                                                        |
| ---- | ------------------------------------------------------------ |
| 0012 | Advisory lean-ctx session config workflow                    |
| 0013 | Observability pipeline entry points and session trace config |

### `docs/architecture/decisions`

| ADR  | Title                         |
| ---- | ----------------------------- |
| 0010 | Dolt catalog CMS evaluation   |
| 0011 | Observability search deferred |
| 0012 | Agent gateway MCP routing     |

## Writing a new ADR

Use template `tpl-adr` (Obsidian Templates folder) or agent skill `adr-generator`.

Minimum sections: **Status**, **Context**, **Decision Drivers**, **Decision**, **Consequences**, **Related**.

Statuses: `proposed` | `accepted` | `superseded` | `deprecated`.

Tag new vault-facing ADR notes with frontmatter `tags: [adr, decision]` so Copilot `{#adr, #decision}` can resolve them.

## Related

- [[ADAM Architecture Map]]
- [[Beads Board]] — implementation work after a decision
- [[Inbox Capture Protocol]] — research that motivates ADRs
