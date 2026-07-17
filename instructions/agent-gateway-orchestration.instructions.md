---
description: Agent gateway orchestration pointers for A2A/MCP routing and Copilot workspace stubs
---

# Agent Gateway Orchestration

Use this instruction when wiring Agent Gateway, A2A/MCP routing, or Copilot workspace lifecycle scripts.

## Canonical docs (repo)

- ADR: `docs/architecture/decisions/0012-agent-gateway-mcp-routing.md`
- Example routes: `config/agentgateway/routes.example.yaml`
- Copilot workspace orchestration: `docs/copilot-workspace-orchestration.md`
- Multi-agent worktrees: `docs/multi-agent-worktrees.md`
- lean-ctx protocols (when present): `docs/lean-ctx/proxy-and-protocols.md`

## Scripts

- Shared roots: `scripts/copilot-workspace/lib/paths.ps1` (`Get-CopilotRepoRoot` ascends 3 levels from `lib/`)
- Bootstrap / session: `scripts/copilot-workspace/bootstrap.ps1`, `session-start.ps1`, `session-archive.ps1`
