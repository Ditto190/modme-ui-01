# Obsidian Sidecar Vault – Quick Start

```powershell
yarn obsidian:sidecar:setup -OpenVault
```

- `C:\Users\dylan\ModMe-Vault` — lean Obsidian vault (opens automatically)
- Dir junctions linking to:
  - `inbox/` → `GenerativeUI_monorepo/docs/inbox` (Clipper dst)
  - `docs/` → `docs` (Architecture, pipeline docs, **ADAM notes**)
  - `clipper/` → `templates/obsidian-clipper` (Clipper templates)
  - `Templates/` → `templates/obsidian-note-templates` (Obsidian note templates)

## Problem This Solves

- **Before:** Obsidian opens the monorepo as vault → 10–30s startup, slow search (indexes 5000+ files, node_modules, .git)
- **After:** Sidecar vault at `ModMe-Vault/` → 1–2s startup, instant search (only 50–200 inbox/docs files)

## Flow

1. Obsidian opens: `C:\Users\dylan\ModMe-Vault/`
2. Clip a page with Chrome Clipper
3. Note lands in vault `inbox/` folder
4. Junction redirects to: `Monorepo_ModMe\GenerativeUI_monorepo\docs\inbox\`
5. Git (from monorepo root) commits it
6. Run: `yarn intake:orchestrate`

## Manual Obsidian Setup (after setup script)

1. **Open Obsidian** → "Open folder as vault" → `C:\Users\dylan\ModMe-Vault`
2. **Core plugins**: Templates, Unique note creator, Properties, Daily notes, **Bases**, **Canvas** — Template folder = `Templates`; Unique note template = `Templates/tpl-unique-note`
3. **Community plugins** (allowlisted): Advanced URI, Code Emitter (local py/ts/js only), Smart Connections, Copilot — see `docs/adam/Vault Plugin Policy.md`
4. **Open KM hub**: `docs/adam/ADAM Index.md` → Command Center `.base` / `.canvas`
5. **Configure Clipper**:
   - Vault name: `ModMe-Vault` (auto-detected)
   - Default folder: `inbox` (pre-set in vault config)
6. **Import templates**: Clipper settings → Templates → Import from file → select from `vault/clipper/` folder (include **Obsidian Help**; order per clipper README)
7. **Test clip**: Clip https://obsidian.md/help/import/zettelkasten → research + `uid` (not Code Snippet)

## Obsidian pack docs

→ [`docs/obsidian/README.md`](docs/obsidian/README.md) — unique notes, Advanced URI cookbook, Code Emitter, Clipper matching

## Project A.D.A.M (Obsidian Copilot)

1. Open `docs/adam/ADAM Index.md` (via vault `docs/adam/`)
2. Copy the prompt body from `docs/adam/copilot-project-system-prompt.md` into Copilot → Projects → **Project A.D.A.M**
3. Use `{[[Note Title]]}`, `{activeNote}`, `{#tag}`, `{docs/adam}` — never whole `{inbox}`
4. Note templates: Insert from `Templates/tpl-*.md`

## Commands

```powershell
yarn obsidian:sidecar:setup
yarn obsidian:sidecar:open
yarn intake:orchestrate
```

## FAQ

**Q: Why is the vault separate from the monorepo?**  
A: Obsidian indexes every file during startup. A 5000+ file monorepo slows it down. The sidecar keeps only knowledge files (~50–200).

**Q: Can I still use git?**  
A: Yes. Git from monorepo root sees the real files. Use `cd Monorepo_ModMe && git add .` as normal.

**Q: Is this Windows-only?**  
A: Junctions are Windows-only. On macOS/Linux, use symbolic links.

**Q: How do I sync the vault across machines?**  
Clone monorepo → re-run `yarn obsidian:sidecar:setup`. Copilot/plugin state syncs separately.

**Q: Can I use Obsidian Git to commit notes?**  
A: Obsidian Git only tracks vault `.obsidian/`. Use git CLI from monorepo root for inbox/docs.

→ [`docs/obsidian/README.md`](docs/obsidian/README.md) — Unique notes, Advanced URI, Code Emitter, Clipper matching  
→ [`docs/obsidian-sidecar-setup.md`](docs/obsidian-sidecar-setup.md) — full guide  
→ [`docs/adam/ADAM Index.md`](docs/adam/ADAM%20Index.md) — A.D.A.M hub  
→ [`docs/adam/ADAM Command Center.md`](docs/adam/ADAM%20Command%20Center.md) — Bases dashboards  
→ [`docs/adam/Vault Plugin Policy.md`](docs/adam/Vault%20Plugin%20Policy.md) — plugin allowlist  
→ [`scripts/setup-modme-obsidian-sidecar.ps1`](scripts/setup-modme-obsidian-sidecar.ps1)
