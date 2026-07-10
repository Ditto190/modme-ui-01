# ModMe Sidecar Obsidian Vault

Lean Obsidian vault for knowledge management, separate from the massive monorepo.

## Problem Solved

Obsidian with vault root at `Monorepo_ModMe/` becomes slow (10–30s startup, sluggish search) because it indexes:
- `node_modules/` (~500MB+)
- `.yarn/` cache
- `.git/` history
- `dist/`, `build/` output
- Multiple nested workspaces and packages

The `userIgnoreFilters` setting in `app.json` provides "soft" exclusion (no search/graph indexing), but Obsidian still traverses the entire file tree during startup.

## Solution: Sidecar Vault with Junctions

The sidecar vault (`ModMe-Vault/`) is a **separate vault** with directory junctions linking only the knowledge folders you need:

```
C:\Users\dylan\ModMe-Vault\          ← Open THIS in Obsidian (fast, ~1-2s)
  .obsidian\
    app.json                         ← Lean config
  inbox/              → junction → Monorepo_ModMe\GenerativeUI_monorepo\docs\inbox
  docs/               → junction → Monorepo_ModMe\docs
  clipper/            → junction → Monorepo_ModMe\templates\obsidian-clipper
  ModMe Vault (Sidecar).md
```

## Setup

### Automated

```powershell
# From repo root:
.\scripts\setup-modme-obsidian-sidecar.ps1 -OpenVault
```

This script:
1. Creates `C:\Users\dylan\ModMe-Vault/` directory
2. Initializes lean `.obsidian/` config (no heavy community plugins by default)
3. Creates directory junctions for `inbox/`, `docs/`, `clipper/`
4. Optionally opens the vault in Obsidian

### Manual

If you prefer to set it up step by step:

```powershell
# 1. Create vault root
mkdir "C:\Users\dylan\ModMe-Vault"
cd "C:\Users\dylan\ModMe-Vault"

# 2. Create .obsidian config (empty template)
mkdir .obsidian
'{"attachmentFolderPath":"attachments","newFileLocation":"folder","newFileFolderPath":"inbox","alwaysUpdateLinks":true,"userIgnoreFilters":["*.lock","*.json","*.ts","*.tsx","*.js","*.jsx","*.py",".git/",".yarn/",".env",".env.*"]}' | Out-File .obsidian\app.json

# 3. Create junctions (from vault root)
$monorepoRoot = "C:\Users\dylan\Monorepo_ModMe"
cmd /c mklink /J "inbox" "$monorepoRoot\GenerativeUI_monorepo\docs\inbox"
cmd /c mklink /J "docs" "$monorepoRoot\docs"
cmd /c mklink /J "clipper" "$monorepoRoot\templates\obsidian-clipper"

# 4. Open in Obsidian
obsidian://open?path=C:\Users\dylan\ModMe-Vault
```

## How It Works

1. **Clipper writes** a note to vault `inbox/` folder
2. **Windows junction** transparently redirects to `Monorepo_ModMe\GenerativeUI_monorepo\docs\inbox\`
3. **Git (from monorepo root)** sees and commits the real file
4. **Obsidian** only indexes the vault root, stays fast

```
Obsidian clip → inbox/notes.md (vault)
                       ↓ (junction)
               MonorepoUI_monorepo/docs/inbox/notes.md (real file)
                       ↓ (git add .)
               Committed to monorepo history
```

## Using Clipper

1. Open Obsidian with vault `C:\Users\dylan\ModMe-Vault`
2. Install Chrome Clipper extension
3. Clipper Settings:
   - **Vault name**: ModMe-Vault (if not auto-detected)
   - **Default folder**: `inbox` (vault-relative, already set in app.json)
4. Import JSON templates from `vault/clipper/` subfolder
5. Clip a page → note lands in `inbox/` (which is the real monorepo folder)
6. Run `yarn intake:orchestrate` from monorepo root to ingest and process the note

## Using Obsidian

### Core Plugins to Enable

- Templates
- Properties
- Daily notes
- Command palette (on by default)
- File explorer

### Optional Community Plugins

- **Obsidian Git** — for tracking vault `.obsidian/` plugin state (not monorepo files; use `git` CLI for that)
- **Periodic Notes** — for daily/weekly note templates
- **Dataview** — for querying notes by frontmatter

### First Time

- Create a `ModMe Vault (Sidecar).md` index note in the vault root with links to `inbox/`, `docs/`, `clipper/` folders

## Performance

| Metric | Main Monorepo | Sidecar Vault |
| --- | --- | --- |
| Startup | 10–30s | 1–2s |
| Search | 2–5s | <100ms |
| Graph view | Sluggish | Instant |
| File count | 5000+ | 50–200 |

## Limitations

- **Junctions are Windows-only.** On macOS/Linux, use `ln -s` symbolic links or copy files.
- **Obsidian Git plugin** tracks vault `.obsidian/` state, not the monorepo. Use `git` CLI from monorepo root to commit inbox notes.
- **Plugin sync** across vault clones: if you modify plugin state (.obsidian/plugins/) and later clone the vault, the plugins sync but the real files don't.

## Troubleshooting

### Junctions not showing up?

Verify junctions exist:

```powershell
Get-Item "C:\Users\dylan\ModMe-Vault\*" -Force | Where-Object { $_.Attributes -match "ReparsePoint" } | ForEach-Object { Write-Host "$($_.Name) -> $(cmd /c dir $_.FullName | Select-String 'points to')" }
```

If missing, manually recreate:

```powershell
cmd /c mklink /J "C:\Users\dylan\ModMe-Vault\inbox" "C:\Users\dylan\Monorepo_ModMe\GenerativeUI_monorepo\docs\inbox"
```

### Clipper not writing to vault?

- Confirm Clipper is set to **ModMe-Vault**
- Confirm template `"path"` is `"inbox"` (vault-relative)
- Check `C:\Users\dylan\ModMe-Vault\inbox/` for the clipped note

### Obsidian search is still slow?

- Check `.obsidian/app.json` for `userIgnoreFilters` — should exclude `*.lock`, `*.json`, `.git/`, `.yarn/`, etc.
- Disable any heavy community plugins (Graph, Dataview, Calendar) temporarily
- Close and reopen Obsidian

### Notes not showing up in inbox after clip?

- Verify junction: `cmd /c dir "C:\Users\dylan\ModMe-Vault\inbox"` should list monorepo files
- Check `C:\Users\dylan\Monorepo_ModMe\GenerativeUI_monorepo\docs\inbox\` directly
- Run `yarn intake:audit` to check for inbox contract violations

## Links

- [Obsidian Documentation](https://help.obsidian.md/)
- [Web Clipper Docs](https://help.obsidian.md/web-clipper)
- [Inbox Pipeline](./inbox-pipeline/README.md)
- Setup script: `scripts/setup-modme-obsidian-sidecar.ps1`
