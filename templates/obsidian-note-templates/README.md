# Obsidian note templates (ModMe / A.D.A.M)

Starter Templates-plugin notes for Project A.D.A.M. Clipper JSON templates live in [`../obsidian-clipper/`](../obsidian-clipper/).

## Files

| File                     | Use                                         |
| ------------------------ | ------------------------------------------- |
| `tpl-adr.md`             | Architecture Decision Record                |
| `tpl-bead.md`            | Vault mirror of a `modme-*` bead            |
| `tpl-inbox-capture.md`   | Manual inbox note (contract v1 + `uid`)     |
| `tpl-unique-note.md`     | Unique note creator / Zettel literature     |
| `tpl-code-sandbox.md`    | Code Emitter local py / ts / js fences      |
| `tpl-session-handoff.md` | End-of-session handoff                      |
| `tpl-agent-brief.md`     | Scoped agent task brief                     |

## Install (sidecar vault)

`yarn obsidian:sidecar:setup` creates a `Templates` junction → this folder.

Or manually:

```powershell
cmd /c mklink /J "C:\Users\dylan\ModMe-Vault\Templates" "C:\Users\dylan\Monorepo_ModMe\templates\obsidian-note-templates"
```

Then Obsidian → Settings → Core plugins → **Templates** → Template folder location: `Templates`.

**Unique note creator:** Template file location = `Templates/tpl-unique-note` (see [`docs/obsidian/unique-notes.md`](../../docs/obsidian/unique-notes.md)).

`{{date}}` placeholders work with the core Templates plugin date format; Templater users may swap to Templater syntax.

## Related

- Vault ADAM notes: `docs/adam/` (junction `docs/adam/` in ModMe-Vault)
- Catalog: `docs/adam/Template Catalog.md`
- Obsidian pack: `docs/obsidian/`
- Copilot prompt: `docs/adam/copilot-project-system-prompt.md`
