# ADR-0012: Agent Gateway for A2A, MCP, and LLM routing

## Status

Proposed (config stub + catalog only — no production deploy)

## Context

ModMe orchestrates multiple agents across Git worktrees (Cursor, Copilot App, Copilot CLI) with:

- **lean-ctx MCP** — token-efficient repo reads/shell ([`docs/lean-ctx/proxy-and-protocols.md`](../lean-ctx/proxy-and-protocols.md))
- **A2A role routing** — beads BFS + agent catalog (`scripts/lean-ctx-agent-catalog.mjs`)
- **External MCP gateways** — context7, Supabase, GitLab via `mcp_gateways` hints

[Agent Gateway](https://github.com/agentgateway/agentgateway) is an agentic proxy for AI agents and MCP servers. The ModMe fork [`Ditto190/agentgateway-modme`](https://github.com/Ditto190/agentgateway-modme) will host route definitions aligned with our catalog namespaces.

Copilot workspace bootstrap (`.github/github-app.yml`, `scripts/copilot-workspace/`) needs a single upstream for LLM + MCP fan-out when parallel research agents run with lean-ctx compression.

## Decision

Add **Agent Gateway as Layer 4** above lean-ctx MCP for external LLM/MCP routing. Repo work stays on lean-ctx; gateway terminates A2A/MCP/LLM traffic for research and gateway MCP servers.

```
Client (Cursor / Copilot)
  → lean-ctx MCP (monorepo I/O)
  → agentgateway-modme (A2A / MCP / LLM route)
  → upstream models + external MCP (context7, supabase, gitlab, …)
```

**Phase 1 deliverables:**

- `config/agentgateway/routes.example.yaml` — documented stub
- `mcp_gateways.agentgateway` in agent catalog seed
- `collections/agent-gateway-orchestration.collection.yml`
- No Docker/K8s deploy in this phase

## Rationale

| Concern | Without gateway | With agentgateway |
|---------|-----------------|-------------------|
| Parallel research agents | Each client opens MCP directly | Central route table + policy |
| Token cost | lean-ctx handles repo only | Gateway can coalesce LLM hops (future) |
| A2A wire protocol | ModMe scripts (role routing) | Gateway can expose standard agent ports later |
| Ops | Fewer moving parts | +1 service; deferred until fork routes validated |

## Consequences

- Catalog `resolve` can suggest `agentgateway` namespace for `a2a mcp llm routing` intents
- `LEAN_CTX_PROFILE=orchestration` may use a dedicated lean-ctx daemon; gateway ADR documents when to split daemons for parallel agents
- Deploy blocked until `agentgateway-modme` routes are reviewed against Supabase/cloud secrets policy

## References

- https://github.com/agentgateway/agentgateway
- https://github.com/Ditto190/agentgateway-modme
- ADR-0010 (Dolt catalog CMS — git+Supabase path retained)
- [`docs/copilot-workspace-orchestration.md`](../copilot-workspace-orchestration.md)
