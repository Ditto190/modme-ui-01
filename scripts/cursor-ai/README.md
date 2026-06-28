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

| Source                                                                                      | Cursor                                                                              | Copilot                                                    |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules)           | `.cursor/rules/patrickjs-*.mdc`                                                     | —                                                          |
| [sanjeed5/awesome-cursor-rules-mdc](https://github.com/sanjeed5/awesome-cursor-rules-mdc)   | `.cursor/rules/sanjeed5-*.mdc`                                                      | —                                                          |
| [github/awesome-copilot](https://github.com/github/awesome-copilot)                         | `.cursor/rules/copilot-*.mdc`, `.agents/skills/`                                    | `.github/copilot-instructions.md`, `.github/instructions/` |
| [obra/superpowers](https://github.com/obra/superpowers)                                     | global `~/.agents/skills/`                                                          | —                                                          |
| [spencerpauly/awesome-cursor-skills](https://github.com/spencerpauly/awesome-cursor-skills) | global `~/.cursor/skills/`, project pointer `.cursor/skills/awesome-cursor-skills/` | —                                                          |

Curated install set includes browser QA, port-conflict detection, cursor rules/hooks suggestions, PR workflow, and parallel explore patterns. Browse the full catalog in `.vendor/awesome-cursor-skills-main/resources/`.

## MCP servers (project)

| Server      | Config                                                      | Auth                                                                                    |
| ----------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `skills-sh` | `.cursor/mcp.json` (stdio)                                  | None                                                                                    |
| `buildkite` | `.cursor/mcp.json` (remote `https://mcp.buildkite.com/mcp`) | OAuth on first connect — no `BUILDKITE_API_TOKEN` in repo                               |
| `mantine`   | `.cursor/mcp.json`, `.vscode/mcp.json`, `.github/mcp.json`  | Mantine docs/components (`list_items`, `get_item_doc`, `get_item_props`, `search_docs`) |

After editing `.cursor/mcp.json`, restart Cursor. First Buildkite use: authorize in browser and pick your organization. Details: `docs/agent-tech-guide.md` § Buildkite MCP.

## Generate new MDC rules (sanjeed5 generator)

Requires [uv](https://github.com/astral-sh/uv) and API keys in `.vendor/awesome-cursor-rules-mdc-main/.env`:

```powershell
.\scripts\cursor-ai\generate-mdc-rules.ps1
.\scripts\cursor-ai\setup.ps1   # re-sync into .cursor/rules/
```

## ContextArch (AI context files)

[contextarch-cli](https://github.com/ksoventures/contextarch-cli) — one wizard generates `.cursorrules`, `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md`.

```powershell
yarn contextarch:install              # vendor source + verify CLI
yarn contextarch init                 # interactive wizard (review before --overwrite at root)
yarn contextarch init -C next-forge   # bootstrap a sub-project
yarn contextarch:bootstrap next-forge # non-interactive (scripts/contextarch-targets.json)
```

Root `AGENTS.md` and `.cursor/rules/` are custom; prefer contextarch for new packages or greenfield sub-trees.

## Agent DX: lean-ctx reads + disabled learning mode

| Item                          | Location                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| **No native Read/Grep**       | `.cursor/rules/lean-ctx.mdc` (always-on), `LEAN-CTX.md`, `.agents/skills/lean-ctx/SKILL.md`   |
| **Read modes**                | https://leanctx.com/docs/concepts/read-modes/                                                 |
| **Hook redirect**             | `~/.cursor/hooks.json` — `lean-ctx hook redirect` on Read\|Grep\|Glob                         |
| **Config ensure**             | `yarn lean-ctx:ensure` · `.lean-ctx.toml` (`auto_inject_rules/skills = true`)                 |
| **learning-output-style off** | `.cursor/settings.json` → `"claude-code-plugins/learning-output-style": { "enabled": false }` |
| **Re-patch hook popup**       | `.\scripts\cursor-ai\fix-learning-output-style-hook.ps1` (if plugin re-enabled)               |

## Refresh vendored sources

Delete `.vendor/` and re-run `setup.ps1`, or run setup (it skips existing vendor folders).
