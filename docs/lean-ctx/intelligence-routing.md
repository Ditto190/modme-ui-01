# lean-ctx Intelligence Routing (ModMe)

Decision tree for MCP intelligence tools. Full reference: [leanctx.com/docs/tools/intelligence](https://leanctx.com/docs/tools/intelligence/).

## Quick routing

| User intent                  | Primary tool                         | Secondary                    |
| ---------------------------- | ------------------------------------ | ---------------------------- |
| Where is X? / orient         | `ctx_compose(task)`                  | `ctx_overview(task)`         |
| What breaks if I change Y?   | `ctx_impact(path)`                   | `ctx_callgraph` (BFS)        |
| Codebase map                 | `ctx_architecture`                   | `ctx_graph action=build`     |
| Keyword → files in catalogue | `ctx_fill(keywords)`                 | `ctx_search`                 |
| Classify task type           | `ctx_intent(message)`                | `yarn agent:catalog:resolve` |
| After edits                  | `ctx_delta(path)`                    | `ctx_read mode=diff`         |
| Project indexing             | `ctx_index` / `lean-ctx index build` | universal intake script      |

## Session bootstrap

```powershell
yarn agent:session:start -BootstrapIntelligence
# or
.\scripts\lean-ctx-session-bootstrap.ps1
```

MCP sequence:

1. `ctx_graph action=build`
2. `ctx_knowledge action=wakeup`
3. `ctx_session action=load`
4. `ctx_preload task="..."` when profile set (`$env:LEAN_CTX_PROFILE`)

## Profiles

See [`data/lean-ctx-task-profiles.toml.example`](../../data/lean-ctx-task-profiles.toml.example).

| Profile            | Collection              | Intelligence tools               |
| ------------------ | ----------------------- | -------------------------------- |
| orchestration      | modme-lean-ctx-advanced | compose, graph, callgraph, agent |
| inbox-intake       | modme-inbox-mda         | index, fill, search              |
| forge-dev          | modme-core              | impact, architecture, delta      |
| observability-work | modme-observability     | compose, graph, search           |

## Protocol stack

Multi-agent sessions: **CEP + CCP + A2A** ([protocol map](https://leanctx.com/docs/concepts/protocols/#which-protocol-when)).

- Register: `ctx_agent action=register`
- Claim: `ctx_agent action=claim`
- Diary: `ctx_agent action=diary category=decision`

## Terminal aliases

Configured in [`.lean-ctx.toml`](../../.lean-ctx.toml): `@graph-build`, `@beads-ready`, `@prove-it`, `@session-audit`.
