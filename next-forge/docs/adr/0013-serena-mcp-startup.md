# ADR-0013: Serena MCP launches on Cursor startup

**Status**: Accepted  
**Date**: 2026-07-11  
**Supersedes**: N/A

## Context

Agents in this monorepo need IDE-grade symbol navigation (find refs, rename, replace symbol body) beyond compressed file reads. [Serena](https://github.com/oraios/serena) provides those tools over MCP using an LSP backend.

Separately, the Wasp fullstack agent kit recommends:

1. LLM-friendly docs via [llms.txt](https://wasp.sh/llms.txt) / [llms-0.24.txt](https://wasp.sh/llms-0.24.txt) (prefer over doc-only MCP bloat)
2. Browser visibility via [Chrome DevTools MCP](https://developer.chrome.com/blog/chrome-devtools-mcp)
3. Opinionated skills (`wasp-plugin-init`, `start-dev-server`, etc.)

We already had a stub `scripts/start-serena.sh` that pulled Serena via `uvx` from GitHub on each run. That is slow, non-deterministic for Cursor stdio startup, and not wired into `.cursor/mcp.json`.

## Decision Drivers

* Serena must start when Cursor opens this workspace (no manual HTTP server)
* Cold start must be reliable on Windows (full path to `serena.exe`)
* Avoid marketplace/outdated install commands; follow official `uv tool install`
* Keep language-server set small (TypeScript + Python) for this dual monorepo
* Complement lean-ctx (exploration) without replacing it
* Document Wasp llms.txt + Chrome DevTools as the fullstack visibility kit

## Considered Options

### Option 1: Cursor project MCP stdio (chosen)

Add `serena` to `.cursor/mcp.json` with `start-mcp-server --context ide --project-from-cwd`. Cursor spawns Serena as a subprocess when the workspace loads.

**Pros**: True “launch on startup”; no extra daemon; project-scoped; works with Agents Window worktrees  
**Cons**: Client must resolve `serena.exe` (PATH or absolute path); first LSP index can be slow

### Option 2: Always-on HTTP/SSE daemon

Run `scripts/start-serena.ps1` as a background service and point MCP at a URL.

**Pros**: Shared across clients  
**Cons**: Port conflicts with worktree slots; process lifecycle ownership; not auto-started by Cursor alone

### Option 3: uvx-from-git on every launch (previous stub)

**Pros**: No global install  
**Cons**: Slow; network-dependent; unsuitable for MCP stdio cold start

## Decision

We will **install Serena globally via `uv tool install -p 3.13 serena-agent`**, configure **project `.cursor/mcp.json` so Cursor auto-starts Serena (stdio, `ide` context) on workspace open**, keep **HTTP helpers** for debugging, and adopt the **Wasp fullstack kit** (llms.txt + chrome-devtools MCP + wasp skills) alongside Serena.

## Rationale

Cursor’s MCP lifecycle is the correct “startup” hook for IDE agents. Official Serena docs recommend `--context ide` for Cursor-class clients and `--project-from-cwd` (or `--project`) so the monorepo activates without a manual prompt. Absolute path to `serena.exe` avoids Windows PATH gaps in GUI-spawned processes.

lean-ctx remains mandatory for compressed reads; Serena fills the symbol/refactor gap. Wasp’s guidance matches our preference for llms.txt over heavyweight doc MCPs, while Chrome DevTools closes the browser feedback loop.

## Consequences

### Positive

- Serena tools available as soon as Cursor loads the workspace MCP config
- Reproducible install (`uv tool`) + project config (`.serena/project.yml`)
- Fullstack visibility path documented (docs map + DevTools + skills)
- Worktree-friendly (`--project-from-cwd`)

### Negative

- Extra MCP tools consume context; mitigated by `ide` context (reduced duplication)
- Global `serena` install required per machine (`yarn serena:ensure`)
- LSP indexing cost on large monorepos; mitigated via `ls_workspace_folders` + ignores

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `serena` not on Cursor PATH | Absolute path in `.cursor/mcp.json`; `scripts/ensure-serena.ps1` |
| Too many language servers | Only `typescript` + `python` in `.serena/project.yml` |
| Agent ignores Serena tools | `.agents/skills/serena/SKILL.md` + ADR; optional future hooks |
| Chrome DevTools MCP unused | Documented in skill + wasp knowledge; enable when doing UI verify |

## Implementation

### Install (once per machine)

```powershell
uv tool install -p 3.13 serena-agent
serena init -b LSP
yarn serena:ensure
```

### Cursor MCP (auto-start)

`.cursor/mcp.json` entries:

- `serena` → `C:/Users/dylan/.local/bin/serena.exe start-mcp-server --context ide --project-from-cwd`
- `chrome-devtools` → `npx.cmd -y chrome-devtools-mcp@latest`

### Project config

- `.serena/project.yml` — languages, ignores, `ls_workspace_folders`
- `.agents/skills/serena/SKILL.md`
- Wasp skills via `npx skills add wasp-lang/wasp-agent-plugins`
- Docs: `docs/wasp/general-wasp-knowledge.md`, maps at https://wasp.sh/llms.txt

### Scripts

| Command | Purpose |
|---------|---------|
| `yarn serena:ensure` | Install/verify CLI + project.yml |
| `yarn serena:doctor` | `ensure-serena.ps1 -CheckOnly` |
| `.\scripts\start-serena.ps1` | Optional HTTP MCP (debug) |
| `./scripts/start-serena.sh` | Same on Unix |

### Validation

```powershell
yarn serena:ensure
serena --version   # expect 1.5.x+
# Cursor: reload window → MCP panel shows serena connected
# Optional HTTP smoke:
#   .\scripts\start-serena.ps1 -Port 9123
```

## Related Decisions

- **ADR-0011**: Agent terminal orchestration without Nx — complementary DevEx; Serena is IDE MCP, not a root orchestrator
- **ADR-0012**: Bounded parallel agent lifecycle — Serena runs per Cursor workspace, not as a shared multi-agent bus

## References

- [Serena README](https://github.com/oraios/serena)
- [Serena clients (Cursor / ide context)](https://oraios.github.io/serena/02-usage/030_clients.html)
- [Wasp llms.txt](https://wasp.sh/llms.txt) · [0.24 map](https://wasp.sh/llms-0.24.txt)
- [Claude Code fullstack essentials (MCP + llms.txt)](https://wasp.sh/blog/2026/01/29/claude-code-fullstack-development-essentials#mcp-servers-for-docs-fetching)
- [Wasp agent plugin / skills](https://wasp.sh/docs/wasp-ai/coding-agent-plugin)

---

**ADR Created**: 2026-07-11  
**Last Updated**: 2026-07-11  
**Status**: Accepted
