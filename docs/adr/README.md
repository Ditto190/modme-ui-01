# Architecture Decision Records (repo root)

ADRs at this path cover **Monorepo_ModMe root orchestration** (scripts, agents, lean-ctx, worktrees). next-forge-specific ADRs live in [`next-forge/docs/adr/`](../../next-forge/docs/adr/README.md).

## Index

| ADR      | Title                                                                                                                                  | Status       | Date       |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------- |
| **0012** | [Advisory lean-ctx Session Config Workflow](./0012-advisory-lean-ctx-session-config-workflow.md)                                       | **Accepted** | 2026-06-27 |
| **0013** | [Observability Pipeline Entry Points and Session Trace Config](./0013-observability-pipeline-entry-points-and-session-trace-config.md) | **Proposed** | 2026-07-11 |
| **0014** | [KM C4 Ownership Taxonomy](./0014-km-c4-ownership-taxonomy.md)                                                                         | **Accepted** | 2026-07-11 |
| **0015** | [Router Layering — Polis, Inbox MDA, GenUI Routes](./0015-router-layering-km-polis-genui.md)                                           | **Accepted** | 2026-07-11 |
| **0016** | [vLLM in MicroVM behind Agent Gateway](./0016-vllm-microvm-agent-gateway.md)                                                          | **Proposed** | 2026-07-12 |
| **0017** | [Label Studio AI-driven annotation loop (Option C)](./0017-label-studio-ai-annotation-loop.md)                                        | **Accepted** | 2026-07-12 |
| **0018** | [TODO — Obsidian-first auto-tagging (Option A) deferred](./TODO-0018-obsidian-first-auto-tagging-option-a.md)                         | **TODO**     | 2026-07-12 |

## Creating a new root ADR

1. Copy MADR template from `next-forge/docs/adr/README.md`
2. Number sequentially under `docs/adr/`
3. Update this index
4. Link from `AGENTS.md` or relevant skill when agents must follow the decision
