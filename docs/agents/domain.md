# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Layout: single-context monorepo

ModMe is a **single-context** federated monorepo at the repository root. One glossary and one system-wide ADR tree apply to both `next-forge/` and `GenerativeUI_monorepo/` orchestration layers.

```
/
├── CONTEXT.md              ← create lazily via /domain-modeling when needed
├── docs/adr/               ← system-wide decisions (reports under docs/adr/reports/)
├── next-forge/docs/adr/    ← next-forge–scoped ADRs (read when touching next-forge)
├── AGENTS.md               ← agent commands, boundaries, learned facts
└── docs/frontend-gen-engine/PROJECT_BRIEF.md  ← Frontend Gen Engine program brief
```

There is no `CONTEXT-MAP.md` at the root. Do not invent per-stack glossaries unless a future ADR splits contexts.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root, if it exists.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.
- **`next-forge/docs/adr/`** — when editing next-forge apps or packages only.
- **`docs/frontend-gen-engine/PROJECT_BRIEF.md`** — when working on the molecule catalog, `@repo/gen-engine`, or generative-ui route upgrades.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill creates `CONTEXT.md` lazily when terms or decisions actually get resolved.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

Preferred terms for the Frontend Gen Engine program:

| Term | Meaning |
|------|---------|
| **Molecule** | Typed UI atom with Zod `parameterSchema`, `genUItier`, and optional `route_hint` |
| **Catalog** | Built `data/molecule-index/catalog.v1.json` consumed at compile/runtime |
| **GenUI tier** | `static` \| `declarative` \| `open-ended` renderer routing |
| **Strangler** | Keep legacy WebSocket agent panel live until TanStack AI parity (Phase 4) |

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0009 (inbox data contract) — but worth reopening because…_

## Monorepo boundary (hard rule)

No `workspace:*` or relative imports across `next-forge/` ↔ `GenerativeUI_monorepo/`. The molecule orchestrator **reads** GenerativeUI sources at build time; runtime apps consume **built** catalog JSON only.
