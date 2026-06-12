---
name: antigravity-awesome-skills
description: Browse and install 1,500+ agentic skills from sickn33/antigravity-awesome-skills. Use for brainstorming, TDD, security review, DevOps, QA automation, MCP building, and workflow bundles across development domains.
---

# Antigravity Awesome Skills

Catalog: [sickn33/antigravity-awesome-skills](https://github.com/sickn33/antigravity-awesome-skills) (1,541+ skills)

## Install (recommended)

From repo root:

```powershell
$env:PATH = "C:\Program Files\Git\cmd;$env:PATH"
npx --yes antigravity-awesome-skills --cursor
```

Or re-run the full Cursor AI setup (includes this install when Git is on PATH):

```powershell
.\scripts\cursor-ai\setup.ps1
```

Installs the full catalog into `~/.cursor/skills/` (global). Use `@skill-name` in Cursor chat.

## Specialized plugin bundles

Prefer focused bundles when you know the domain — see [CATALOG.md](https://github.com/sickn33/antigravity-awesome-skills/blob/main/CATALOG.md) and `docs/users/bundles.md`:

| Plugin | Best for |
|--------|----------|
| AAS Web App Builder | Frontend / full-stack web |
| AAS Security Engineer | Security testing and hardening |
| AAS QA & Test Automation | Tests, browser automation |
| AAS DevOps & Cloud | Infra and deployments |
| AAS Agent & MCP Builder | MCP servers and agentic apps |

## Discover skills

```text
@brainstorming help me plan a feature
@systematic-debugging investigate this failure
```

Browse: [skills_index.json](https://github.com/sickn33/antigravity-awesome-skills/blob/main/skills_index.json)

## Paths

| Scope | Path |
|-------|------|
| Global (installed) | `~/.cursor/skills/<skill-name>/` |
| Project pointer | `.cursor/skills/antigravity-awesome-skills/` (this file) |

## Notes

- Full install is large (~1,500 folders). Restart Cursor after install.
- Review third-party skills before production use.
- Refresh: re-run `npx antigravity-awesome-skills --cursor`.
