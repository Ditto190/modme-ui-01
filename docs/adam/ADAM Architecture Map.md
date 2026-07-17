---
tags:
  - adam
  - agentic-dev
  - agent-mgmt
type: architecture
updated: 2026-07-11
---

# ADAM Architecture Map

How Project A.D.A.M maps onto the ModMe monorepo and knowledge plane.

## Dual monorepo (do not merge)

| Stack                    | Manager  | Role                                                    |
| ------------------------ | -------- | ------------------------------------------------------- |
| `next-forge/`            | Bun      | Primary apps, Mintlify docs, Storybook, Prisma/Supabase |
| `GenerativeUI_monorepo/` | Yarn 3.3 | Legacy CopilotKit + agent-server; inbox funnel          |

Integrate via HTTP/WebSocket or published packages — never `workspace:*` across stacks.

## Containers (C4 L2 sketch)

| Container         | Tech                       | Port        | Path                                      |
| ----------------- | -------------------------- | ----------- | ----------------------------------------- |
| next-forge App    | Next.js + Auth.js          | 3100        | `next-forge/apps/app`                     |
| next-forge Web    | Marketing                  | 3101        | `next-forge/apps/web`                     |
| next-forge API    | Hono/Next                  | 3102        | `next-forge/apps/api`                     |
| agent-server      | FastAPI + AG2              | 8000        | `GenerativeUI_monorepo/apps/agent-server` |
| Supabase          | Hosted Postgres + pgvector | cloud       | `next-forge/packages/database`            |
| Docs / Storybook  | Mintlify / SB              | 3104 / 6106 | `next-forge/apps/*`                       |
| Root orchestrator | Yarn scripts               | —           | `scripts/`, `harness/`                    |

## R&D knowledge plane

```text
Clip / agent drop → inbox/ (funnel)
       ↓ yarn intake:orchestrate
  audit → ingest → embed → MDA
       ↓
  Supabase pgvector (knowledge)
```

- Contract: `docs/inbox-pipeline/contracts/inbox-contract.v1.json` (ADR-0009)
- Clipper templates: vault `clipper/` → `templates/obsidian-clipper/`
- Protocol: [[Inbox Capture Protocol]]

## Agent management plane

- **Worktrees** — feature work in `.worktrees/`, not main checkout
- **Beads** — multi-session issues (`modme-*`); see [[Beads Board]]
- **lean-ctx** — mandatory read/search/shell compression for agents
- **ADRs** — architecture truth; see [[ADR Digest]]

## Solution components (mental model)

1. **Product surfaces** — next-forge SaaS + GenUI agent canvas
2. **Agent runtime** — agent-server, skills, toolsets, MCP gateway
3. **Knowledge intake** — inbox + scrape + dual-store (Greptime / pgvector)
4. **Decision memory** — ADRs across `docs/adr`, `docs/architecture/decisions`, `next-forge/docs/adr`
5. **Session orchestration** — beads, envelopes, worktree ports, verify stacks
