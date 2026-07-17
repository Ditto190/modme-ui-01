---
tags:
  - adam
  - agent-mgmt
  - vault
type: policy
updated: 2026-07-12
---

# Vault Plugin Policy

Lean plugin stack for **ModMe-Vault** / Project A.D.A.M. Core-first; community plugins only when they remove recurring friction.

## Principles

1. **Markdown is source of truth** — hubs, ADRs, beads digests, inbox protocol live in `docs/adam/`.
2. **Sidecar stays fast** — no plugin that forces full-vault indexing on every keystroke.
3. **One home** — [[ADAM Index]] + [[ADAM Command Center.canvas]]; avoid duplicate dashboards.
4. **Monorepo git from repo root** — Obsidian Git tracks `.obsidian/` only, not inbox/docs content.

## Core plugins (enable)

| Plugin                  | Role                                                        |
| ----------------------- | ----------------------------------------------------------- |
| **Templates**           | Insert `Templates/tpl-*.md`                                 |
| **Unique note creator** | Zettel UIDs; template = `Templates/tpl-unique-note`         |
| **Properties**          | Frontmatter editing; required for Bases                     |
| **Daily notes**         | Session capture                                             |
| **Bases**               | Property tables: beads, ADRs, inbox review                  |
| **Canvas**              | Visual command center (read-only overview)                  |
| **Backlinks**           | Wikilink discovery                                          |
| **File recovery**       | Safety net                                                  |
| **Format converter**    | Optional — Zettelkasten link fixer/beautifier after imports |

Optional core: **Graph** (light use), **Outline**.

## Community plugins

| Plugin                   | Status      | Allowed use                                                                                              |
| ------------------------ | ----------- | -------------------------------------------------------------------------------------------------------- |
| **Smart Connections**    | Recommended | Semantic related-notes while writing; local embeddings                                                   |
| **Copilot for Obsidian** | Recommended | Project A.D.A.M system prompt + file context                                                             |
| **Advanced URI**         | Recommended | Automations: open/create notes, frontmatter, commands ([cookbook](../obsidian/advanced-uri-cookbook.md)) |
| **Code Emitter**         | Optional    | Run **local** Python / TypeScript / JavaScript fences only ([guide](../obsidian/code-emitter.md))        |
| **Periodic Notes**       | Optional    | Weekly review template                                                                                   |
| **Obsidian Git**         | Optional    | `.obsidian/` config sync only                                                                            |
| **Templater**            | Defer       | Only if core Templates lacks needed logic                                                                |
| **Dataview**             | Defer       | Only when Bases cannot express the query                                                                 |

**Code Emitter constraint:** vault templates must not use remote playground languages (Kotlin, Rust, Sololearn, etc.). Pyodide + JS/TS sandbox only.

## Do not install (unless proven gap)

- Calendar / Tasks mega-stacks
- Heavy graph/analytics plugins
- Plugins that duplicate Bases + Canvas + Smart Connections
- Anything that indexes the whole monorepo if vault root ever moves

## File context (Copilot Project A.D.A.M)

**Include**

- Folder: `docs/adam`
- Tags: `adam`, `mission`, `adr`, `decision`, `bead`, `issue`, `agentic-dev`, `agent-mgmt`, `inbox`, `research`

**Ignore**

- `inbox/*` (funnel — use [[Inbox Capture Protocol]] instead)
- `.beads/*` (use [[Beads Board]] digest)

## Related

- [[Query Tool Guide]]
- [[ADAM Semantic Map]]
- [[ADAM Command Center]] — Bases views
- [[Zettelkasten Workflow]]
- [[MOC Obsidian]]
- [[agent-syntax-brief]] — KB syntax + core plugin brief
- [[obsidian-sidecar-setup]]
- [Obsidian pack](../obsidian/README.md) — unique notes, Advanced URI, Code Emitter, Clipper matching
- [Obsidian KB index](../obsidian/kb/_index.md) — Firecrawl phase-1 promote
