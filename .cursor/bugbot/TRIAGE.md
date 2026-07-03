# Triage Checklist (Maintainers & Agents)

Run after new issues land or via `yarn backlog:health`.

## 1. Classify stack

- [ ] Apply `stack:forge` | `stack:generative` | `stack:root` | `stack:orchestration` from changed paths or reporter dropdown
- [ ] Remove `needs-triage` when classified; add `status:triage` if still unclear

## 2. Route to citizen

Use [polis-router](../../scripts/lib/polis-router.mjs) or manual assignment:

| Signal | Citizen |
|--------|---------|
| `ci-cd` + self-heal Yes | devops-ci-champion |
| `next-forge/**` PR | forge-reviewer |
| `GenerativeUI_monorepo/**` PR | generative-reviewer |
| beads ready, no GitHub issue | beads-orchestrator |
| `bugbot-reviewed` + green CI | bugbot-merge-champion |

- [ ] Add `agent-routed` when citizen assigned
- [ ] Link beads ID (`modme-xxxx`) → add `beads-linked`

## 3. Staleness (backlog-health)

| Signal | Threshold | Action |
|--------|-----------|--------|
| Open, no update | >14 days | Comment; consider close or milestone |
| `needs-triage` | >7 days | Escalate or assign |
| `devops-autofix` stuck | >2 agent rounds | `status:agent-escalated`; remove autofix label |
| Duplicate title | Jaccard ≥0.65 | Merge via Planner Agent |

## 4. Escalate when

- Missing secrets/permissions
- Prod deploy or destructive git required
- DoD fails after 2 acceptance-orchestrator rounds
- Conflicting review instructions

Add `status:agent-escalated`; document blocker in issue + beads comment.

## 5. Bulk cleanup (human-approved)

- GitLab **Planner Agent** — label/milestone/close duplicates
- GitLab **Data Analyst** — trend reports on `ci-cd` MTTR

Do not bulk-close without human approval.
