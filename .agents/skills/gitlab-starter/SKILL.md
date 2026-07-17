---
name: gitlab-starter
description: "GitLab mirror + hybrid Auto DevOps adjunct for ModMe: glab auth, child pipelines, security templates, Duo autofix, smart-git session hooks. Use when setting up GitLab CI, mirror sync, pipeline status, or GitLab MCP."
---

# gitlab-starter (ModMe)

Onboarding for **GitLab as CI/CD adjunct** while **GitHub remains merge authority**.

## When to use

- Session start in a worktree with `GITLAB_PROJECT_ID` set
- After `git push` / before PR — check mirror pipeline status
- Configuring GitLab CI, labels, Duo autofix
- GitLab MCP (`plugin-gitlab-GitLab`) for issues, MRs, pipelines

## Policy

| Layer                           | Role                                                   |
| ------------------------------- | ------------------------------------------------------ |
| GitHub (`Ditto190/modme-ui-01`) | SoR — PRs, `gh pr create --base dev`, primary CI       |
| GitLab mirror                   | Adjunct — security scans, Duo autofix, optional verify |
| Auto DevOps UI                  | **Off** — committed `.gitlab-ci.yml` wins              |

## First-run checklist

```powershell
yarn gitlab:doctor
glab auth login
# .env (never commit):
# GITLAB_PROJECT_ID=<numeric id>
# GITLAB_TOKEN=<PAT read_api>
# GITLAB_GROUP=<top-level-group-path>
yarn gitlab:labels:sync
```

Mirror secrets on GitHub: `GITLAB_TOKEN`, `GITLAB_MIRROR_URL` → [`.github/workflows/gitlab-mirror.yml`](../../.github/workflows/gitlab-mirror.yml)

## CI layout

```
.gitlab-ci.yml              # parent router
next-forge/.gitlab-ci.yml   # Bun check/test/build (child)
GenerativeUI_monorepo/.gitlab-ci.yml
.gitlab/ci/security-adjunct.yml   # SAST, secret-detection, dependency-scanning
.gitlab/ci/devops-autofix.yml     # Duo Fix CI/CD Flow (manual)
.gitlab/autodev-reference.yml     # upstream Auto DevOps (reference only)
```

Child pipelines use `allow_failure: true` during rollout — GitHub CI is the merge gate.

## smart-git session flow

1. `yarn lean-ctx:ensure`
2. `yarn gitlab:doctor -Quiet` (non-fatal)
3. Prototype → `yarn check:forge` / `yarn verify:*`
4. `git push` → GitHub mirror workflow → GitLab parent pipeline
5. `gh pr create --base dev`
6. On failure + `devops-autofix` label → mirror issue with `github_sor` URL

## MCP tools (gitlab-assistant)

- `manage_pipeline`, `get_pipeline_jobs`, `get_job_log` — post-push status
- `create_issue`, `search` — autofix escalation
- `create_merge_request` — adjunct only (not default merge path)

## Related

- [`docs/gitlab-setup.md`](../../docs/gitlab-setup.md)
- [`docs/repo-alignment.md`](../../docs/repo-alignment.md)
- [`.agents/skills/smart-git-automation/SKILL.md`](../smart-git-automation/SKILL.md)
- [Auto DevOps docs](https://docs.gitlab.com/topics/autodevops/)
