# Architecture Decision Records (repo root)

ADRs at this path cover **Monorepo_ModMe root orchestration** (scripts, agents, lean-ctx, worktrees). next-forge-specific ADRs live in [`next-forge/docs/adr/`](../../next-forge/docs/adr/README.md).

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| **0012** | [Advisory lean-ctx Session Config Workflow](./0012-advisory-lean-ctx-session-config-workflow.md) | **Accepted** | 2026-06-27 |

Also see architecture decisions: [0013 dual-store agent data plane](../architecture/decisions/0013-dolt-beads-entire-agent-data-plane.md), [0014 KM session startup](../architecture/decisions/0014-km-session-startup-wiring.md), runbook [`docs/monorepo/km-agent-data-plane-startup.md`](../monorepo/km-agent-data-plane-startup.md).

## Creating a new root ADR

1. Copy MADR template from `next-forge/docs/adr/README.md`
2. Number sequentially under `docs/adr/`
3. Update this index
4. Link from `AGENTS.md` or relevant skill when agents must follow the decision
