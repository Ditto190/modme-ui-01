# Unique notes (Zettelkasten UID)

Adopt Obsidian’s **Unique note creator** UID format for vault literature notes, and stamp the same `uid` on inbox Clipper notes without changing the inbox filename contract.

## UID format

`YYYYMMDDHHmm` — e.g. note created 09:45 on 2024-01-01 → `202401010945`.

If a collision exists, Unique note creator advances to the next available minute.

## Inbox vs vault filenames

| Surface | Filename | `uid` property |
| ------- | -------- | -------------- |
| Web Clipper → `inbox/` | `YYYY-MM-DDTHH-mm-ss_{type}_{role}_{slug}.md` (inbox-contract.v1) | `uid: YYYYMMDDHHmm` in frontmatter |
| Unique note creator | `YYYYMMDDHHmm` or `YYYYMMDDHHmm Title` | Same UID in body frontmatter via template |

Do **not** rename inbox clips to bare UIDs — ingest relies on the contract pattern.

## Sidecar setup

1. Enable **Core plugins → Unique note creator**.
2. **Template file location:** `Templates/tpl-unique-note`  
   (junction → `templates/obsidian-note-templates/tpl-unique-note.md`).
3. Ribbon **Create new unique note** or Command palette → **Create new unique note**.
4. Optionally rename to `UID Short title` for readable wikilinks.

## Importing older Zettelkasten vaults

If links are `[[UID]]` but files are named `UID Title`, Obsidian cannot resolve them.

1. Enable **Format converter**.
2. Ribbon → **Open format convert**.
3. Enable **Zettelkasten link fixer** (and optionally **Zettelkasten link beautifier**).
4. **Start conversion**.

Beautifier turns `[[UID]]` into `[[UID My note title|My note title]]`.

Official: [Import Zettelkasten notes](https://obsidian.md/help/import/zettelkasten) · [Unique note creator](https://obsidian.md/help/plugins/unique-note).

## Template

See [`templates/obsidian-note-templates/tpl-unique-note.md`](../../templates/obsidian-note-templates/tpl-unique-note.md).

## Advanced URI

Create a unique note via command (after Advanced URI install):

```
obsidian://adv-uri?vault=ModMe-Vault&commandid=unique-note-creator%3Acreate
```

Command IDs can vary by Obsidian version — confirm with Advanced URI helper commands. See [advanced-uri-cookbook.md](advanced-uri-cookbook.md).
