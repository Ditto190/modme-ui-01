---
name: serena
description: Use Serena MCP for IDE-level symbol navigation, references, rename/refactor, and project memories. Prefer Serena over raw grep for cross-file symbol work. Activate on session start when Serena tools are available.
---

# Serena — IDE for the coding agent

Serena ([oraios/serena](https://github.com/oraios/serena)) exposes semantic code tools over MCP (LSP backend by default).

## When to use

| Use Serena | Prefer lean-ctx / built-ins |
|------------|-----------------------------|
| Find symbol / refs / rename | Compressed file reads (`ctx_read`) |
| Replace symbol body | Shell builds/tests |
| Cross-file refactor | Non-code docs / URLs |
| Project memories (`.serena/memories`) | Package-manager installs |

## Startup (ModMe)

Cursor starts Serena automatically from `.cursor/mcp.json` when this workspace opens:

```text
serena start-mcp-server --context ide --project-from-cwd
```

Manual / HTTP mode:

```powershell
yarn serena:ensure
.\scripts\start-serena.ps1          # default port 8001
.\scripts\start-serena.ps1 -Port 9123
```

Validate:

```powershell
yarn serena:doctor
```

Config: `.serena/project.yml` · Global: `~/.serena/serena_config.yml` · ADR-0013

## Session start checklist

1. Confirm Serena MCP is connected (tools visible / `yarn serena:doctor`).
2. If project not active: ask agent to activate current dir via Serena.
3. For symbol work, call Serena tools before falling back to grep.

## Fullstack kit (Wasp blog essentials)

Complement Serena with:

1. **llms.txt docs** — https://wasp.sh/llms.txt → https://wasp.sh/llms-0.24.txt (version-matched maps; prefer over doc MCP bloat).
2. **Chrome DevTools MCP** — `chrome-devtools` in `.cursor/mcp.json` for browser console/network.
3. **Wasp skills** — `wasp-plugin-init`, `start-dev-server`, `expert-advice`, `deploying-app`, `wasp-plugin-help` under `.agents/skills/`.

## References

- Clients: https://oraios.github.io/serena/02-usage/030_clients.html
- Configuration: https://oraios.github.io/serena/02-usage/050_configuration.html
- Install: `uv tool install -p 3.13 serena-agent` then `serena init`
- Vendored mirror (gitignored): `.vendor/serena/` (README + AGENTS.md + docs)
