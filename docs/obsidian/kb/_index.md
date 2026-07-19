---
tags:
  - obsidian-kb
  - index
type: moc
updated: 2026-07-12
---

# Obsidian knowledge base (phase 1)

Curated promote from Firecrawl + inbox clips. Focus: help pages (syntax, format-converter, Zettelkasten, core plugins) and awesome-obsidian **Plugins**.

## Start here

- [[agent-syntax-brief]] — agent-facing syntax + core plugins + what not to install
- [[MOC Obsidian]] — vault hub + Bases tray
- [[Zettelkasten Workflow]]

## Categories

### help

- [[agent-syntax-brief]]
- [[basic-formatting-syntax]]
- [[advanced-formatting-syntax]]
- [[core-plugins]]
- [[import-zettelkasten]]

## Commands

```powershell
yarn obsidian:kb:manifest
yarn firecrawl:setup   # once
yarn firecrawl:up
yarn obsidian:kb:download --limit 20
yarn obsidian:kb:promote --from-inbox
yarn adam:mocs:generate
yarn clipper:organize --dry-run
```

Firecrawl self-host must be healthy (`yarn firecrawl:status`) before download. Without Docker, use `--from-inbox` promote + manifest dry-run only.

## Related

- [[MOC Obsidian]]
- [[Vault Plugin Policy]]
- [[Zettelkasten Workflow]]
- [[clipper-source-matching]]
- ![[MOC Obsidian KB.base]]
