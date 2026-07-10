# Obsidian Sidecar Vault – Quick Start

## One-Line Setup

```powershell
yarn obsidian:sidecar:setup -OpenVault
```

This creates:
- `C:\Users\dylan\ModMe-Vault` — lean Obsidian vault (opens automatically)
- Three directory junctions linking to:
  - `inbox/` → `GenerativeUI_monorepo/docs/inbox` (Clipper destination)
  - `docs/` → `docs` (Architecture, pipeline docs)
  - `clipper/` → `templates/obsidian-clipper` (Clipper templates)

## Problem This Solves

- **Before:** Obsidian opens the monorepo as vault → 10–30s startup, slow search (indexes 5000+ files, node_modules, .git)
- **After:** Sidecar vault at `ModMe-Vault/` → 1–2s startup, instant search (only 50–200 inbox/docs files)

## Workflow

```
1. Obsidian opens:                        C:\Users\dylan\ModMe-Vault/
2. Clip a page with Chrome Clipper
3. Note lands in vault inbox/ folder
4. Junction redirects to:                 Monorepo_ModMe\GenerativeUI_monorepo\docs\inbox\
5. Git (from monorepo root) commits it
6. Run: yarn intake:orchestrate
```

## Manual Obsidian Setup (after running setup script)

1. **Open Obsidian** → "Open folder as vault" → `C:\Users\dylan\ModMe-Vault`
2. **Install Clipper plugin**: Community plugins → Search "Obsidian Web Clipper" → Install
3. **Configure Clipper**:
   - Vault name: `ModMe-Vault` (auto-detected)
   - Default folder: `inbox` (pre-set in vault config)
4. **Import templates**: Clipper settings → Templates → Import from file → select from `vault/clipper/` folder
5. **Test clip**: Clip this page https://stephango.com/saw → check `ModMe-Vault/inbox/` for the note

## Handy Commands

```powershell
# Setup vault (one-time)
yarn obsidian:sidecar:setup

# Open vault in Obsidian
yarn obsidian:sidecar:open

# Process clipped notes (from monorepo root)
yarn intake:orchestrate
```

## FAQ

**Q: Why is the vault separate from the monorepo?**
A: Obsidian indexes every file during startup. A 5000+ file monorepo with node_modules slows it down. The sidecar keeps only knowledge files (~50–200).

**Q: Can I still use git?**
A: Yes. Git from monorepo root sees the real files (junctions transparently redirect). Use `cd Monorepo_ModMe && git add .` as normal.

**Q: Is this Windows-only?**
A: Junctions are Windows-only. On macOS/Linux, use symbolic links instead (same concept).

**Q: How do I sync the vault across machines?**
A: 
- Clone `Monorepo_ModMe` to the new machine
- Re-run `yarn obsidian:sidecar:setup` to recreate junctions
- Copilot/Obsidian plugins sync separately via cloud storage (e.g., sync.obsidian.com or local Git)

**Q: Can I use Obsidian Git to commit notes?**
A: Obsidian Git plugin only tracks the vault `.obsidian/` folder, not monorepo files. Use `git` CLI from monorepo root instead.

## Full Docs

→ [`docs/obsidian-sidecar-setup.md`](docs/obsidian-sidecar-setup.md) — comprehensive guide with troubleshooting

## Setup Script Location

→ [`scripts/setup-modme-obsidian-sidecar.ps1`](scripts/setup-modme-obsidian-sidecar.ps1)
