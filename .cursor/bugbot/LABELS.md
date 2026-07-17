# Label Taxonomy (ModMe)

GitHub is system-of-record; mirror these labels on GitLab adjunct project when configured.

## Stack (auto-applied from paths)

| Label                 | Paths (prefix)                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------- |
| `stack:forge`         | `next-forge/`                                                                                |
| `stack:generative`    | `GenerativeUI_monorepo/`                                                                     |
| `stack:orchestration` | `scripts/`, `docs/`, `.cursor/`, `.agents/`, `.github/`, root `package.json`, `CHANGELOG.md` |
| `stack:root`          | Repo root files not covered above (manual or fallback)                                       |

src: [scripts/lib/path-filter.mjs](../../scripts/lib/path-filter.mjs), [AUTOTAGS.yml](./AUTOTAGS.yml)

| Label                    | Meaning                                       |
| ------------------------ | --------------------------------------------- |
| `ci-cd`                  | Pipeline, hooks, workflow files               |
| `needs-triage`           | New issue; remove after first triage          |
| `agent-routed`           | Assigned to agent citizen / service account   |
| `devops-autofix`         | Eligible for autonomous CI fix (max 2 rounds) |
| `bugbot-reviewed`        | Bugbot completed PR review                    |
| `beads-linked`           | Body contains `modme-` beads ID               |
| `status:triage`          | Awaiting classification                       |
| `status:in-progress`     | Active agent session                          |
| `status:blocked`         | External dep                                  |
| `status:agent-escalated` | acceptance-orchestrator escalated             |

## Agent specialty

| Label          | Citizen                   |
| -------------- | ------------------------- |
| `agent:devops` | devops-ci-champion        |
| `agent:review` | forge/generative reviewer |

## Agent review roles (path-routed)

| Label               | Check                    | When                             |
| ------------------- | ------------------------ | -------------------------------- |
| `review:forge`      | `modme/agent-forge`      | `next-forge/**`                  |
| `review:generative` | `modme/agent-generative` | `GenerativeUI_monorepo/**`       |
| `review:devops`     | `modme/agent-devops`     | `.github/**`, `scripts/**`       |
| `review:security`   | `modme/agent-security`   | auth, supabase, lockfiles        |
| `review:docs`       | `modme/agent-docs`       | docs (advisory)                  |
| `review:merge`      | `modme/agent-merge`      | after other roles; Trunk enqueue |

Applied by [`.github/labeler.yml`](../../.github/labeler.yml) and [`agent-review-dispatch.yml`](../../.github/workflows/agent-review-dispatch.yml).  
Runbook: [`docs/devops/agent-review-routing.md`](../../docs/devops/agent-review-routing.md).  
SoT: [`.github/agent-codeowners.yml`](../../.github/agent-codeowners.yml).

## Priority (existing)

`priority:critical`, `priority:high`, `priority:medium`, `priority:low`

## Legacy (GenUI — prefer stack labels for new issues)

`agent`, `frontend`, `toolset`, `component-registry` — retained for old issues only.
