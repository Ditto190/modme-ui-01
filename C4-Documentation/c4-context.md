# C4 Level 1 — System Context

## ModMe GenUI Platform

AI-assisted consulting platform with **dynamic Generative UI**: agents orchestrate UI components via WebSocket streaming.

## Actors

| Actor | Interaction |
|-------|-------------|
| Consultant / user | Uses next-forge SaaS app (browser) |
| AI agents (AG2) | Run in agent-server, emit UI actions |
| Developer | Maintains dual-monorepo, harness, intake pipeline |

## External systems

| System | Relationship |
|--------|--------------|
| Supabase Postgres | Primary data store (next-forge) |
| LLM providers (OpenAI, etc.) | agent-server backend |
| GitHub / CI | Build and deploy |
| Mintlify | Product documentation |

## Context diagram

```mermaid
C4Context
  title ModMe System Context
  Person(user, "Consultant", "Uses GenUI dashboard")
  System(modme, "ModMe Platform", "next-forge + agent-server")
  System_Ext(supabase, "Supabase", "Postgres + pgvector")
  System_Ext(llm, "LLM APIs", "Agent reasoning")
  Rel(user, modme, "HTTPS + WSS")
  Rel(modme, supabase, "Prisma / SQL")
  Rel(modme, llm, "API")
```

## Evidence

- `docs/ARCHITECTURE.md`
- `AGENTS.md`
- `next-forge/SETUP.md`
