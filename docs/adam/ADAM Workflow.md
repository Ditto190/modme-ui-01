---
tags:
  - adam
  - agentic-dev
  - workflow
type: workflow
updated: 2026-07-11
---

# ADAM Workflow

Context-driven loop for Agentic Development & Agent Management.

## Context → Spec → Plan → Implement

1. **Context** — Read [[ADAM Index]], [[ADAM Architecture Map]], relevant [[ADR Digest|ADRs]], [[Beads Board|beads]]. Prefer living docs over chat memory.
2. **Spec** — Acceptance criteria, stack boundary (forge vs generative), verify commands.
3. **Plan** — Phased tasks; open/update a bead for multi-session work.
4. **Implement** — Worktree only; lean-ctx for reads; PR to `dev`.

## Session start / end

**Start**

- Orient via [[ADAM Index]]
- Check [[Beads Board]] / `bd ready` / `bd list`
- Confirm worktree (`yarn worktree:ensure` or warn-only)
- Load lean-ctx session when coding in Cursor

**End**

- Update bead status / [[Beads Board]] digest if needed
- Capture R&D links via [[Inbox Capture Protocol]]
- Session finish from worktree (`vibe-session-finish` / `agent:session:finish`)

## Quality gates (by stack)

| Change in                | Prefer                                   |
| ------------------------ | ---------------------------------------- |
| `next-forge/`            | `yarn check:forge` → `yarn verify:forge` |
| `GenerativeUI_monorepo/` | `yarn verify:generative`                 |
| Inbox paths              | `yarn inbox:audit` before ingest         |

## Monorepo rules of thumb

- next-forge = Bun; GenerativeUI = Yarn 3.3; never cross-install package managers
- Cloud-first Supabase; do not overwrite `.env` with local Docker defaults
- ADRs before inventing architecture; beads before long chat todos
