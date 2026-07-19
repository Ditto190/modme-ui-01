---
tags:
  - adam
  - agent-mgmt
  - dashboard
type: dashboard
updated: 2026-07-11
aliases:
  - Command Center
---

# ADAM Command Center

Operational dashboards for Project A.D.A.M. Open this note from ModMe-Vault at `docs/adam/ADAM Command Center`.

> [!tip] Bases
> Open [[ADAM Command Center.base]] in Obsidian for table views: **Open Beads**, **ADRs and Decisions**, **Inbox Review 14d**, **ADAM Hubs**.

## Quick navigation

| Lane         | Hub                                 |
| ------------ | ----------------------------------- |
| Mission      | [[Mission Augmented Intelligence]]  |
| Architecture | [[ADAM Architecture Map]]           |
| Work         | [[ADAM Workflow]] · [[Beads Board]] |
| R&D          | [[Inbox Capture Protocol]]          |
| Decisions    | [[ADR Digest]]                      |
| Visual map   | [[ADAM Command Center.canvas]]      |

## KPI-style signals (manual refresh)

Update weekly or after `bd ready` / `yarn inbox:audit`:

| Signal          | Target               | Check                 |
| --------------- | -------------------- | --------------------- |
| Open beads      | ≤ 5 ready            | `bd ready`            |
| Inbox audit     | 0 critical FM errors | `yarn inbox:audit`    |
| ADR drift       | 0 proposed > 30d     | [[ADR Digest]]        |
| Session handoff | 1 per agent session  | `tpl-session-handoff` |

## Commands (monorepo root)

```powershell
bd ready
yarn inbox:audit
yarn intake:orchestrate
yarn worktree:doctor
```

## Related

- [[ADAM Semantic Map]]
- [[Query Tool Guide]]
- [[Vault Plugin Policy]]
