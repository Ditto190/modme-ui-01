---
tags:
  - adam
  - bead
  - issue
type: board
updated: 2026-07-11
---

# Beads Board

Living digest of ModMe beads (`modme-*` prefix). Source of truth remains `.beads/` in the monorepo (not vault-junctioned) — refresh this note when priorities change.

## When to use beads

- Multi-session or multi-agent work with dependencies
- Anything that should survive chat context reset

Use chat todos only for short single-session linear tasks.

## Daily commands

```powershell
bd ready              # unblocked work
bd list --status open
bd show <id>
bd update <id> --status in_progress
bd close <id>
```

Session orchestration: `yarn agent:session:start` / `yarn agent:status` / session finish scripts. Full guide: `docs/beads-workflow.md`.

## Active focus (edit me)

| ID  | Title                             | Status | Sphere |
| --- | --------------------------------- | ------ | ------ |
| —   | _(run `bd ready` and paste rows)_ | —      | —      |

Spheres: `agentic-dev` | `agent-mgmt` | `research` | `product`

## Related vault templates

- Note template: `Templates/tpl-bead` (after sidecar Templates junction)
- GitHub: `.github/ISSUE_TEMPLATE/beads-handoff.yml`

## Links

- [[ADAM Workflow]]
- [[ADR Digest]] — decisions often spawn beads
- [[Inbox Capture Protocol]] — research that becomes beads
