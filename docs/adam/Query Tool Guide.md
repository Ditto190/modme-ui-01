---
tags:
  - adam
  - agent-mgmt
  - vault
type: guide
updated: 2026-07-11
---

# Query Tool Guide

When to use **Bases**, **Smart Connections**, and **Dataview** in ModMe-Vault — keep one tool per job.

## Decision matrix

| Need                                                 | Tool                           | Why                                         |
| ---------------------------------------------------- | ------------------------------ | ------------------------------------------- |
| Table of notes by tag/status/date                    | **Bases**                      | Native, fast, inline edit on properties     |
| "What relates to this paragraph?"                    | **Smart Connections**          | Semantic embeddings; zero-setup local model |
| Complex joins, inline DQL in body, legacy dashboards | **Dataview**                   | Last resort when Bases filters too limited  |
| Visual architecture / workflow map                   | **Canvas**                     | Overview only — not a database              |
| Full-text repo search                                | **ripgrep** / `yarn km:search` | Per [[KNOWLEDGE_MANAGEMENT]]                |

## Bases — default for dashboards

Use for:

- Open beads (`tags` contains `bead`, `status` ≠ `closed`)
- ADR index (`tags` contains `adr` or `decision`)
- Recent inbox clips (`file.inFolder("inbox")`, `file.mtime` last 14 days)
- Curated `docs/adam` hub notes

Rules:

- Properties must live in **YAML frontmatter** (Bases does not read inline `#tag` only in body)
- Prefer `.base` files in `docs/adam/` ([[ADAM Command Center]])
- Do not replicate entire inbox — filter by time or severity

## Smart Connections — discovery while writing

Use for:

- Surfacing related ADRs, research, and hub notes while editing
- Lookup across vault when you do not know the exact title

Rules:

- Complements wikilinks; does not replace [[ADAM Semantic Map]]
- Rebuild embeddings after large inbox imports (`yarn intake:orchestrate`)

## Dataview — defer

Install only if you need:

- Inline query blocks inside arbitrary notes
- Aggregations Bases formulas cannot do yet
- Legacy queries from imported vault templates
- Community MOC “unsorted” inbox: `list from [[]] and !outgoing([[]])` — ModMe prefers Bases **Recent 14d** on [[MOC Obsidian]] instead

If you add Dataview, keep queries in **one** dashboard note — not scattered across 50 files.

## Canvas — visual only

Use for:

- [[ADAM Command Center.canvas]] — mission → spheres → inbox/ADR/beads flow
- Whiteboard sessions; embed file nodes pointing at hub notes

Do not:

- Store state only on Canvas
- Duplicate Bases tables on Canvas (link to `.base` or hub note instead)

## Anti-patterns

| Anti-pattern                         | Fix                                 |
| ------------------------------------ | ----------------------------------- |
| Three dashboards for same beads list | One Bases view + Beads Board digest |
| Dump `{inbox}` into Copilot          | Protocol note + filtered Bases      |
| Dataview for simple tag filter       | Bases table                         |
| Canvas as task tracker               | Beads + Bases                       |

## Related

- [[Vault Plugin Policy]]
- [[ADAM Command Center]]
- [[MOC Obsidian]]
- [[Zettelkasten Workflow]]
- [[Beads Board]]
- [[ADR Digest]]
