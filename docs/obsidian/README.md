# Obsidian pack (ModMe-Vault)

Lean Obsidian tooling for ModMe: unique-note UIDs, Clipper source matching, Advanced URI automations, and local Code Emitter sandboxes.

## Quick Start

Prefer the script directly if `yarn` fails (e.g. corrupted classic `yarn.lock` on a dirty tree):

```powershell
.\scripts\setup-modme-obsidian-sidecar.ps1 -OpenVault
# or, after a healthy Berry lockfile:
yarn obsidian:sidecar:setup -OpenVault
```

If yarn reports `monorepo_modme-root@workspace:.` missing from the lockfile, restore Berry lockfile (`git checkout HEAD -- yarn.lock`) — do not run classic Yarn against this repo.

1. Open vault `C:\Users\dylan\ModMe-Vault` (sidecar — not the monorepo root).
2. Install community plugins: **Advanced URI**, **Code Emitter** (see [Vault Plugin Policy](../adam/Vault%20Plugin%20Policy.md)).
3. Core plugins: **Unique note creator** → Template file location = `Templates/tpl-unique-note`.
4. Re-import Clipper JSON from vault `clipper/` (junction → `templates/obsidian-clipper/`). Prefer **Obsidian Help** above generic Docs for help pages. ModMe templates write under vault-relative `inbox/web-clipper/…` (junction → monorepo inbox).
5. Clip `https://obsidian.md/help/import/zettelkasten` — expect `type: research`, Defuddle body, `uid` set.

## Features

| Feature                                | Doc                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| Unique note / Zettelkasten UID         | [unique-notes.md](unique-notes.md)                                                 |
| Clipper HTML vs code matching          | [clipper-source-matching.md](clipper-source-matching.md)                           |
| URL hierarchy (`web-clipper/{parent}`) | [clipper-source-matching.md](clipper-source-matching.md) · `yarn clipper:organize` |
| Obsidian KB (Firecrawl phase 1)        | [kb/\_index.md](kb/_index.md)                                                      |
| Advanced URI cookbook                  | [advanced-uri-cookbook.md](advanced-uri-cookbook.md)                               |
| Code Emitter (py/ts/js local)          | [code-emitter.md](code-emitter.md)                                                 |
| Sidecar architecture                   | [obsidian-sidecar-setup.md](../obsidian-sidecar-setup.md)                          |

## Architecture (Sidecar)

ModMe-Vault is a **sidecar** read surface: Obsidian indexes only knowledge junctions; monorepo remains write/SoR for git.

```
Clipper / Unique note / Advanced URI
        ↓
  ModMe-Vault (inbox, Templates, docs, clipper)
        ↓ junctions
  Monorepo_ModMe (GenerativeUI inbox + templates/)
```

## Configuration

| Setting                   | Value                                                |
| ------------------------- | ---------------------------------------------------- |
| Vault name (Advanced URI) | `ModMe-Vault`                                        |
| Clipper folder path       | `inbox` (templates use `inbox/web-clipper/{parent}`) |
| Unique note template      | `Templates/tpl-unique-note`                          |
| Code sandbox template     | `Templates/tpl-code-sandbox`                         |

## Offline scrapes

Source scrapes for this pack live under repo `.firecrawl/` (gitignored). Re-fetch:

```powershell
firecrawl scrape `
  "https://publish.obsidian.md/advanced-uri-doc" `
  "https://publish.obsidian.md/advanced-uri-doc/Actions/Navigation" `
  "https://publish.obsidian.md/advanced-uri-doc/Actions/Writing" `
  "https://publish.obsidian.md/advanced-uri-doc/Actions/Commands" `
  "https://publish.obsidian.md/advanced-uri-doc/Actions/Search" `
  "https://publish.obsidian.md/advanced-uri-doc/Actions/Bookmarks" `
  "https://publish.obsidian.md/advanced-uri-doc/Actions/Frontmatter" `
  "https://publish.obsidian.md/advanced-uri-doc/Actions/Canvas" `
  "https://obsidian.md/help/plugins/unique-note" `
  "https://obsidian.md/help/import/zettelkasten" `
  -f markdown --only-main-content
```

## Related

- [Template Catalog](../adam/Template%20Catalog.md)
- [Clipper README](../../templates/obsidian-clipper/README.md)
- [OBSIDIAN_SIDECAR_QUICK_START](../../OBSIDIAN_SIDECAR_QUICK_START.md)
- Upstream: [Advanced URI docs](https://publish.obsidian.md/advanced-uri-doc) · [Unique note](https://obsidian.md/help/plugins/unique-note) · [Code Emitter](https://github.com/mokeyish/obsidian-code-emitter)
