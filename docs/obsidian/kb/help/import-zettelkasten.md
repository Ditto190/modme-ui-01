---
timestamp: 2026-07-12T11:42:05+10:00
agent: "human"
agent_role: "researcher"
type: "snippet"
severity: "medium"
tags:
  - "clipper"
  - "snippet"
  - "SoftwareSourceCode"
  - "obsidian.md"
  - "zettelkasten"
title: "zettelkasten"
summary: "Import Zettelkasten notes - Obsidian Help"
source: "https://obsidian.md/help/import/zettelkasten"
schema_type: "SoftwareSourceCode"
code_sample_type: "full"
file_name: "zettelkasten"
file_extension: "zettelkasten"
programming_language: "zettelkasten"
encoding_format: "text/plain"
code_repository:
code_path: "zettelkasten"
commit_ref:
raw_url: "https://obsidian.md/help/import/zettelkasten"
---

# Import Zettelkasten notes

**URL:** https://obsidian.md/help/import/zettelkasten
**Path:** zettelkasten
**Language:** zettelkasten · **Extension:** `.zettelkasten`
**encodingFormat:** text/plain
**codeSampleType:** full



## Semantic summary

Import Zettelkasten notes - Obsidian Help


## Source


_No source text extracted from the blob viewer._

1. Wait for the file to finish loading, then clip again, **or**
2. Open **Raw** (`https://obsidian.md/help/import/zettelkasten`) and clip that page, **or**
3. Select the code in the viewer before clipping.

Do not rely on Defuddle `If you've been using the Zettelkasten method to name and link your notes, you may need to convert links from `[[UID]]` to `[[UID My note title]]`.

For example, if you have a note with the name `202301011230 My note title` and link to it from another note using only the UID, `[[202301011230]]`. Since Obsidian uses the full name of the note to resolve internal links, links like these will break.

To update all `[[UID]]` links in your vault to use the full name of the note instead, use the [Format converter](https://obsidian.md/help/plugins/format-converter).

1. Open **[Settings](https://obsidian.md/help/settings)**.
2. Under **Core plugins**, enable **Format converter** and close the Settings window.
3. In the ribbon, on the left side of the app window, select **Open format convert** .
4. Enable **Zettelkasten link fixer**.
5. Select **Start conversion**. This will convert all the notes in your entire vault.

> [!tip] Zettelkasten link beautifier
> [Format converter](https://obsidian.md/help/plugins/format-converter) can also beautify your links by removing the UID from the display name. For example, `[[UID]]` converts to `[[UID My note title|My note title]]`.
> 
> To beautify your Zettelkasten links, enable **Zettelkasten link beautifier** in the format converter window.

You can also use the [Unique note creator](https://obsidian.md/help/plugins/unique-note) to create Zettelkasten notes in Obsidian.` for GitHub blobs — it captures page chrome, not the file.



## Capture metadata

- schema.org: `SoftwareSourceCode` (https://schema.org/SoftwareSourceCode)
- inbox `type`: `snippet`
- AST: not parsed in Clipper — promote later via `code-chunk.v1` / code-index
- GitHub blob source: `#read-only-cursor-text-area` / `textarea[aria-label="file content"]` (full file; visible `.react-code-line-contents` is virtualized/incomplete)
