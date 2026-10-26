# Agent review routing (operator runbook)

GitLab-style **multiple approval rules** on GitHub: cloud **agents** (not humans) are path-routed reviewers via required checks. Trunk/`merge_group` is the merge gate.

## Source of truth

| File                                                                                               | Role                                        |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [`.github/agent-codeowners.yml`](../../.github/agent-codeowners.yml)                               | Paths → roles → check names → citizens      |
| [`scripts/lib/agent-codeowners.mjs`](../../scripts/lib/agent-codeowners.mjs)                       | Matcher CLI                                 |
| [`data/agent-citizens/*.yaml`](../../data/agent-citizens/)                                         | Skills + verify commands per citizen        |
| [`.github/workflows/agent-review-dispatch.yml`](../../.github/workflows/agent-review-dispatch.yml) | Labels + matrix dispatch                    |
| [`.cursor/bugbot/MERGE-CHAMPION.md`](../../.cursor/bugbot/MERGE-CHAMPION.md)                       | Only agent that may approve + Trunk enqueue |

Humans are **not** required CODEOWNERS.

## Roles → checks

| Label               | Check                    | Paths (summary)            | Required      |
| ------------------- | ------------------------ | -------------------------- | ------------- |
| `review:forge`      | `modme/agent-forge`      | `next-forge/**`            | yes           |
| `review:generative` | `modme/agent-generative` | `GenerativeUI_monorepo/**` | yes           |
| `review:devops`     | `modme/agent-devops`     | `.github/**`, `scripts/**` | yes           |
| `review:security`   | `modme/agent-security`   | auth, supabase, lockfiles  | yes           |
| `review:docs`       | `modme/agent-docs`       | `docs/**`, AGENTS.md       | advisory      |
| `review:merge`      | `modme/agent-merge`      | after other matches        | yes (enqueue) |

Unmatched required roles publish **skip-success** so rulesets never block forever.

## Local matcher

```bash
node scripts/lib/agent-codeowners.mjs --paths next-forge/apps/app/page.tsx --json
node scripts/lib/polis-router.mjs --all --labels review:forge,stack:forge
```

## Add a role

1. Add section under `roles:` in `.github/agent-codeowners.yml` (`label`, `check`, `required`, `citizen`, `paths`).
2. Add citizen YAML in `data/agent-citizens/<id>.yaml`.
3. Add `review:<role>` globs to `.github/labeler.yml`.
4. Map role in `scripts/quality-orchestrator.manifest.json` → `routing.agentReviewRoles`.
5. Add check name to GitHub **CodeReview_Ruleset** (id `11504025`) required status checks.
6. Smoke: open a draft PR touching only those paths.

## SaaS bots (path-gated)

| Bot                 | Config                                       | Lane                                                |
| ------------------- | -------------------------------------------- | --------------------------------------------------- |
| CodeRabbit          | [`.coderabbit.yaml`](../../.coderabbit.yaml) | Product code; ignores docs/md by default            |
| Cubic               | [`cubic.yaml`](../../cubic.yaml)             | Devops (`.github/**`, `scripts/**`)                 |
| Copilot PR reviewer | Prefer `@copilot` / label on-demand          | Avoid always-on huge diffs                          |
| Gemini Code Assist  | **Disable before 2026-07-17 sunset**         | Org install → remove                                |
| Trunk               | Keep                                         | `/trunk merge` only after `modme/agent-merge` green |

Force CodeRabbit: comment `@coderabbitai review` on the PR.

## Ruleset + Trunk ops

Update **CodeReview_Ruleset** required checks to include (with skip-success pattern):

- `modme/agent-forge`
- `modme/agent-generative`
- `modme/agent-devops`
- `modme/agent-security`
- `modme/agent-merge`
- Existing CI / Preflight jobs as today

`ci.yml` and `preflight-ci.yml` listen to `merge_group: checks_requested` for Trunk queue re-runs.

Enable **auto-delete head branches** in repo settings (Settings → General → Pull Requests).

## Cloud env / Copilot review sessions

```powershell
# After review:* labels exist on the PR:
pwsh scripts/agent-session-start.ps1 -AgentRole review -CitizenId forge-reviewer -BootstrapIntelligence -SkipBeads
# Or Copilot App Run script: session:review
```

`scripts/lib/worktree-bootstrap.ps1` must exist for `session.create` (`Invoke-WorktreeBootstrap -SharedDeps -SkipSession`).

## Smoke tests

| Change set            | Expect                                                                |
| --------------------- | --------------------------------------------------------------------- |
| Only `docs/**`        | `review:docs` advisory; required roles skip-success; CodeRabbit quiet |
| Only `next-forge/**`  | `modme/agent-forge` + `modme/agent-merge` run; generative/devops skip |
| `.github/workflows/*` | `modme/agent-devops` + Cubic; forge skip                              |
| Auth/supabase paths   | `modme/agent-security` required                                       |

## Failure issue template

Use [`.github/ISSUE_TEMPLATE/agent-review-routing.yml`](../../.github/ISSUE_TEMPLATE/agent-review-routing.yml) when dispatch/checks mis-route.

## Related

- [`docs/workflows/POLIS-ROUTING.md`](../workflows/POLIS-ROUTING.md)
- [`docs/devops/quality-loop.md`](quality-loop.md)
- [`docs/plans/2026-07-11-agent-review-routing.md`](../plans/2026-07-11-agent-review-routing.md)
