---
tags:
  - adam
  - zettelkasten
  - agent-mgmt
type: workflow
updated: 2026-07-12
---

# Zettelkasten Workflow

ModMe maps classic Zettelkasten stages onto the sidecar vault + inbox contract.

## Stages

| Stage          | ModMe location                 | Action                                          |
| -------------- | ------------------------------ | ----------------------------------------------- |
| **Fleeting**   | `inbox/web-clipper/{parent}/`  | Clipper capture; keep contract filename + `uid` |
| **Literature** | same folder, refined body      | Defuddle / Help content; link `source`          |
| **Permanent**  | `docs/adam/` or Unique note    | One idea, own words, wikilinks to MOCs          |
| **MOC**        | `docs/adam/MOC *.md` + `.base` | Curated index; Bases = unsorted tray            |

## Daily loop

1. Clip → lands under `inbox/web-clipper/…`
2. `yarn clipper:organize --dry-run` if anything flat
3. Open [[MOC Obsidian]] → Bases **Recent 14d**
4. Promote 1–3 notes: rewrite atomic idea → Unique note / adam hub → link `[[MOC Obsidian]]`
5. `yarn zettel:promote --dry-run` to list clips still missing MOC links

## UID + Format converter

- Clipper stamps `uid: YYYYMMDDHHmm` — do **not** rename inbox files to bare UIDs
- After importing an old Zettelkasten vault: enable **Format converter** → Zettelkasten link fixer (optional beautifier)
- See [[unique-notes]]

## Prefer Bases over Dataview

Dataview `list from [[]] and !outgoing([[]])` is a fine community pattern ([Obsidian Rocks MOC tip](https://obsidian.rocks/quick-tip-quickly-organize-notes-in-obsidian/)) but ModMe keeps **Bases** as default per [[Query Tool Guide]]. Growth charts (DataviewJS + Charts) stay out of policy.

## References

- [Import Zettelkasten notes](https://obsidian.md/help/import/zettelkasten)
- [Getting started with Zettelkasten](https://obsidian.rocks/getting-started-with-zettelkasten-in-obsidian/)
- [[Vault Plugin Policy]] · [[Inbox Capture Protocol]] · [[MOC Obsidian]]
