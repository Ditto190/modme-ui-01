# ModMe Vault

This repository **is** an Obsidian vault. The configuration folder is [`.obsidian/`](.obsidian/).

## Why clips were missing

Obsidian Web Clipper only writes into an **open vault**. Until `.obsidian/` existed, Chrome had no vault target that mapped to this repo, so nothing appeared under `GenerativeUI_monorepo/docs/inbox/`.

## Quick start (do this once)

1. Install [Obsidian](https://obsidian.md/download) (desktop).
2. **Open folder as vault** → select `C:\Users\dylan\Monorepo_ModMe` (this repo root).
3. Confirm Bookmarks show **Inbox** and **Clipper templates**.
4. Install [Obsidian Web Clipper](https://obsidian.md/clipper) in Chrome.
5. Extension settings → choose vault **Monorepo_ModMe**.
6. Import JSON from [`templates/obsidian-clipper/`](templates/obsidian-clipper/) (see that README for order).
7. Clip a page → a new `.md` should appear in [[GenerativeUI_monorepo/docs/inbox/README|Inbox]].

Or run:

```powershell
.\scripts\setup-obsidian-vault.ps1
```

## PKM layout (ModMe-oriented)

| Path                                    | Role                                              |
| --------------------------------------- | ------------------------------------------------- |
| `GenerativeUI_monorepo/docs/inbox/`     | Capture funnel (Clipper target + pipeline ingest) |
| `templates/obsidian-clipper/`           | Chrome Clipper JSON (import into extension)       |
| `templates/obsidian-note-templates/`    | In-app Obsidian Templates plugin                  |
| `docs/inbox-pipeline/`                  | Contract + pipeline docs                          |
| `next-forge/`, `GenerativeUI_monorepo/` | Code (hidden from explorer via ignore filters)    |

Heavy monorepo folders (`node_modules`, `.worktrees`, UniversalWorkbench copies, etc.) are excluded in `.obsidian/app.json` → `userIgnoreFilters` so the vault stays usable in Obsidian while Cursor/VS Code still see the full tree.

## Recommended community plugins (optional)

Install from Obsidian → Settings → Community plugins (not vendored in-repo):

- **Dataview** — query inbox notes by `type` / `tags` / `agent`
- **Templater** — richer note templates if you outgrow core Templates
- **Linter** — keep frontmatter aligned with inbox-contract

This vault is intentionally leaner than [kepano/kepano-obsidian](https://github.com/kepano/kepano-obsidian): same core ideas (daily notes, templates, bases, properties) without importing an unrelated personal note corpus into the monorepo.

## IDE + Obsidian together

- **Cursor / VS Code**: open the same folder; edit inbox markdown normally.
- **Obsidian**: same folder as vault; Clipper URI handler writes files Obsidian and git both see.
- After clipping: `yarn inbox:audit:funnel` then commit under `GenerativeUI_monorepo/docs/inbox/`.

## Related

- Clipper setup: [[templates/obsidian-clipper/README]]
- Inbox protocol: [[GenerativeUI_monorepo/docs/inbox/README]]
- Contract: `docs/inbox-pipeline/contracts/inbox-contract.v1.json`
