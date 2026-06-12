# Cursor AI setup

## Quick start

```powershell
.\scripts\cursor-ai\setup.ps1
```

Then **restart Cursor** (and open a new terminal so `git` is on PATH).

## What failed before

`npx skills add ...` failed with:

```
Failed to clone ... Error: spawn git ENOENT
```

**Cause:** Git was not installed / not on `PATH`.

**Fix applied:** `setup.ps1` installs Git via winget when missing, prepends `C:\Program Files\Git\cmd` for the session, and falls back to copying skills from `.vendor/` if clone still fails.

## What gets configured

| Source | Cursor | Copilot |
|--------|--------|---------|
| [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) | `.cursor/rules/patrickjs-*.mdc` | — |
| [sanjeed5/awesome-cursor-rules-mdc](https://github.com/sanjeed5/awesome-cursor-rules-mdc) | `.cursor/rules/sanjeed5-*.mdc` | — |
| [github/awesome-copilot](https://github.com/github/awesome-copilot) | `.cursor/rules/copilot-*.mdc`, `.agents/skills/` | `.github/copilot-instructions.md`, `.github/instructions/` |
| [obra/superpowers](https://github.com/obra/superpowers) | global `~/.agents/skills/` | — |
| [spencerpauly/awesome-cursor-skills](https://github.com/spencerpauly/awesome-cursor-skills) | global `~/.agents/skills/` | — |

## Generate new MDC rules (sanjeed5 generator)

Requires [uv](https://github.com/astral-sh/uv) and API keys in `.vendor/awesome-cursor-rules-mdc-main/.env`:

```powershell
.\scripts\cursor-ai\generate-mdc-rules.ps1
.\scripts\cursor-ai\setup.ps1   # re-sync into .cursor/rules/
```

## Refresh vendored sources

Delete `.vendor/` and re-run `setup.ps1`, or run setup (it skips existing vendor folders).
