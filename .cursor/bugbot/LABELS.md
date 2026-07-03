# Label Taxonomy (ModMe)

GitHub is system-of-record; mirror these labels on GitLab adjunct project when configured.

## Stack (auto-applied from paths)

| Label | Paths (prefix) |
|-------|----------------|
| `stack:forge` | `next-forge/` |
| `stack:generative` | `GenerativeUI_monorepo/` |
| `stack:orchestration` | `scripts/`, `docs/`, `.cursor/`, `.agents/`, `.github/`, root `package.json`, `CHANGELOG.md` |
| `stack:root` | Repo root files not covered above (manual or fallback) |

Source: [scripts/lib/path-filter.mjs](../../scripts/lib/path-filter.mjs), [AUTOTAGS.yml](./AUTOTAGS.yml)

## Workflow

| Label | When to apply |
|-------|---------------|
| `ci-cd` | Pipeline, hooks, workflow files |
| `needs-triage` | New issue; remove after first triage |
| `agent-routed` | Assigned to agent citizen / service account |
| `devops-autofix` | Eligible for autonomous CI fix (max 2 rounds) |
| `bugbot-reviewed` | Bugbot completed PR review |
| `beads-linked` | Body contains `modme-` beads ID |

## Status

| Label | Meaning |
|-------|---------|
| `status:triage` | Awaiting classification |
| `status:in-progress` | Active agent session |
| `status:blocked` | External dependency |
| `status:agent-escalated` | acceptance-orchestrator escalated |

## Agent specialty

| Label | Routes to |
|-------|-----------|
| `agent:devops` | devops-ci-champion |
| `agent:review` | forge/generative reviewer |
| `agent:beads` | beads-orchestrator |

## Priority (existing)

`priority:critical`, `priority:high`, `priority:medium`, `priority:low`

## Legacy (GenUI — prefer stack labels for new issues)

`agent`, `frontend`, `toolset`, `component-registry` — retained for old issues only.
