# Backlog health

Analyze open GitHub issues and beads queue for staleness, missing labels, and DevOps autofix debt.

## Run

```powershell
yarn backlog:health
# or with agent audit:
node scripts/agent-audit.mjs --backlog
```

Report: [`docs/inbox-pipeline/reports/backlog-health-latest.md`](../docs/inbox-pipeline/reports/backlog-health-latest.md)

## Checks

1. **beads** — `bd ready`, open list, unlinked GitHub issues
2. **GitHub** — `gh issue list` for `needs-triage`, missing `stack:*`, stale >14d, `devops-autofix`
3. **GitLab** (optional) — when `GITLAB_PROJECT_ID` set, use GitLab MCP search

## Triage

Follow [`.cursor/bugbot/TRIAGE.md`](../.cursor/bugbot/TRIAGE.md).

Bulk updates: GitLab Planner Agent or Data Analyst (human-approved).
