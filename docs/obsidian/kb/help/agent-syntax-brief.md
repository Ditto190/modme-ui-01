---
tags:
  - obsidian-kb
  - help
  - syntax
type: guide
updated: 2026-07-12
---

# Agent syntax brief (phase 1)

Synthesized from inbox clips + official help (Basic/Advanced syntax, Core plugins, Import Zettelkasten). Prefer this over dumping whole help pages into Copilot.

## Essential Obsidian Flavored Markdown

| Feature    | Syntax                                       |
| ---------- | -------------------------------------------- | ---- |
| Wikilinks  | `[[Note Title]]` · `[[Note\|Alias]]`         |
| Embeds     | `![[Note]]` · `![[image.png\|300]]`          |
| Callouts   | `> [!tip]` / `> [!note]` / `> [!warning]`    |
| Properties | YAML frontmatter `---` keys Bases can filter |
| Tables     | Escape `\|` in cells: `[[A\\                 | B]]` |
| Diagrams   | Fenced `mermaid` blocks                      |

## Format converter (Zettelkasten)

After importing UID-named notes: enable **Format converter** → **Zettelkasten link fixer** (optional beautifier). Converts `[[UID]]` → `[[UID Title]]`. One-shot vault conversion — not a daily habit. See [[unique-notes]] · [[Zettelkasten Workflow]].

## Core plugins for ModMe-Vault

| Plugin                             | Role                        |
| ---------------------------------- | --------------------------- |
| Templates                          | Insert `Templates/tpl-*.md` |
| Properties                         | Frontmatter for Bases       |
| Bases                              | Dashboards / MOC trays      |
| Canvas                             | Architecture overview only  |
| Daily notes                        | Session capture             |
| Unique note creator                | Permanent Zettel UID notes  |
| Format converter                   | ZK link fixer after imports |
| Backlinks / Outgoing links / Graph | Navigation (default-on OK)  |

## Do not install by default

- Dataview / Obsidian Charts (growth dashboards) — Bases first
- Random community plugins from awesome lists without a proven gap
- Publishing / Sync / Slides unless productized

Community allowlist stays in [[Vault Plugin Policy]] (Smart Connections, Copilot, Periodic Notes, Obsidian Git for `.obsidian/` only).

## Related

- [[_index]] · [[MOC Obsidian]] · [[clipper-source-matching]]
