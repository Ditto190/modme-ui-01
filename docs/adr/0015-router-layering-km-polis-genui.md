---
title: "ADR-0015: Router Layering — Polis, Inbox MDA, GenUI Utterance Routes"
status: "Accepted"
date: "2026-07-11"
authors: "Cursor agent"
tags: ["architecture", "decision", "routing", "knowledge-management"]
supersedes: ""
superseded_by: ""
---

## Status

**Accepted**

## Context

ModMe has three distinct routing surfaces that must not compete as systems-of-record:

1. **Polis-style citizen routing** — CI/devops/agent session citizens (`data/agent-citizens/`, `scripts/lib/polis-router.mjs`).
2. **Inbox MDA** — knowledge classification, embed, promote (`scripts/intake-orchestrator.mjs`, inbox contract).
3. **GenUI utterance routes** — legacy GenerativeUI intent routing (`GenerativeUI_monorepo` agent routes).

Restoring `_polis/` is explicitly out of scope. Beads is the **work SoR**; inbox is the **knowledge SoR**.

## Decision

### Layering (frozen for Phase 1–2)

| Layer            | Purpose                                                                | SoR                                        | Entry                                                                            |
| ---------------- | ---------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| **Polis**        | Route CI labels, changed paths, self-heal, beads-orchestrator citizens | Citizen cards + beads pointers             | [`docs/workflows/POLIS-ROUTING.md`](../workflows/POLIS-ROUTING.md)               |
| **Inbox MDA**    | Classify knowledge drops, embed, catalogue, RAG brain                  | Inbox contract + Supabase pgvector         | [`docs/inbox-pipeline/README.md`](../inbox-pipeline/README.md)                   |
| **GenUI routes** | Map user utterances to canvas/toolsets (legacy stack)                  | `agent/toolsets.json` + GenUI agent server | GenerativeUI `agent/routes` — **freeze**; migrate later, do not merge into beads |

### Non-goals

- Do not merge polis citizens into inbox MDA labels.
- Do not use `data/agent-registry.json` as work SoR (local cache only; optional `beadsIssue` pointer).
- Do not route knowledge classification through GenUI utterance routers.

### Session integration

`agent-session-start.ps1` may pass `-CitizenId` from polis router output. Intake/scrape pipelines use `beads-hooks.mjs` lifecycle independently of polis.

## Consequences

- KM E2E tests cover inbox contract + beads lifecycle only (not GenUI utterance routing).
- GenUI router migration is a separate epic after beads + inbox platform stabilizes.

## References

- [ADR-0014: C4 ownership taxonomy](./0014-km-c4-ownership-taxonomy.md)
- [POLIS-ROUTING.md](../workflows/POLIS-ROUTING.md)
