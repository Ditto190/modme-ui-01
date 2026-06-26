# GitHub Agentic Workflows (gh-aw) — ModMe setup

This repo is initialized for [GitHub Agentic Workflows](https://github.github.com/gh-aw/). Local CLI: **gh-aw v0.79.8+** (avoid 0.68.4–0.71.3 — billing bug per upstream).

**Architecture decision**: [ADR-0010 — Copilot secrets & root `.env` sync](../next-forge/docs/adr/0010-gh-aw-copilot-secrets-and-root-env-sync.md)

## What was installed

| Path | Purpose |
|------|---------|
| `.github/aw/` | Agent prompt library (create, debug, syntax, runbooks) |
| `.github/aw/llms.txt` | Index of all gh-aw agent prompts |
| `.github/aw/runbooks/workflow-health.md` | Debugging runbook for failed workflows |
| `.github/agents/*.agent.md` | Copilot agents from [gh-aw v0.71.5 agents](https://github.com/github/gh-aw/tree/v0.71.5/.github/agents) |
| `.github/agents/agentic-workflows.md` | Dispatcher agent for create/debug/upgrade routing |
| `.github/skills/agentic-workflows/` | Skill router for gh-aw tasks |
| `.github/skills/agentic-workflow-designer/` | Interview skill before creating workflows |
| `.github/workflows/create-agentic-workflow-builder.md` | **Workflow** — builds new agentic workflows via dispatch |
| `.github/workflows/workflow-health.md` | **Workflow** — weekly compilation + run health |
| `.github/mcp.json` | `github-agentic-workflows` MCP server (`gh aw mcp-server`) |

## Copilot engine secret (required)

Agentic workflows use `engine: copilot`. Set **`COPILOT_GITHUB_TOKEN`** on the repo (fine-grained PAT with **Copilot Requests: Read**).

From root `.env` (maps `COPILOT_GITHUB_TOKEN`, `GITHUB_PAT`, or `GITHUB_PERSONAL_ACCESS_TOKEN`):

```powershell
# Add token to root .env first, then:
.\scripts\setup-gh-aw-secrets.ps1
# or: yarn setup:gh-aw
```

Manual: [gh-aw quick start — COPILOT_GITHUB_TOKEN](https://github.com/github/gh-aw/blob/main/docs/src/content/docs/setup/quick-start.mdx)

### Windows note

`gh aw compile` / `gh aw status` may hang in native PowerShell. Use WSL or rely on GitHub Actions:

```bash
wsl bash -lc 'cd /mnt/c/Users/dylan/Monorepo_ModMe && gh aw compile --validate'
```

## CLI (local)

```powershell
gh extension install github/gh-aw
gh aw version
gh aw init          # already run once
gh aw compile --validate
gh aw run create-agentic-workflow-builder
gh aw logs workflow-health
```

## Full dev setup (env + gh-aw + next-forge)

```powershell
Copy-Item .env.example .env   # fill Supabase + PAT values
yarn setup:modme              # sync dotenv + set secret + forge check
```

## Refresh vendored prompts

To download the full gh-aw v0.71.5 prompt set:

```powershell
.\scripts\setup-gh-aw-assets.ps1
```

## Agents to use in Cursor / Copilot

- **Build workflows**: `@agentic-workflows` or `.github/agents/agentic-workflows.md`
- **Create from scratch**: load `.github/aw/create-agentic-workflow.md`
- **Debug failures**: `.github/aw/debug-agentic-workflow.md` + `.github/aw/runbooks/workflow-health.md`
- **ADR / specs**: `adr-writer`, `w3c-specification-writer` in `.github/agents/`

## Trigger the workflow builder on GitHub

After merge to a branch with Actions enabled:

```bash
gh aw run create-agentic-workflow-builder \
  --ref dev \
  -f workflow_name=issue-triage \
  -f workflow_description="Label and prioritize new issues"
```

## References

- [gh-aw README v0.71.5](https://github.com/github/gh-aw/blob/v0.71.5/README.md)
- [llms.txt index](https://github.github.com/gh-aw/llms.txt)
- [Quick start](https://github.github.com/gh-aw/setup/quick-start/)
