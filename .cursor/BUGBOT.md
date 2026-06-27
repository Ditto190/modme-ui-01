# Bugbot repository rules (ModMe)

`beads_prefix: modme` | `github_sor: Ditto190/modme-ui-01`

## Template pack

| File | Purpose |
|------|---------|
| [REVIEW-RUBRIC.md](bugbot/REVIEW-RUBRIC.md) | BLOCKER / NON-BLOCKER / SUGGESTION + stack checks |
| [ISSUE.md](bugbot/ISSUE.md) | Promote findings to GitHub issues |
| [CONTRIBUTION.md](bugbot/CONTRIBUTION.md) | Worktree, verify, PR conventions |
| [LABELS.md](bugbot/LABELS.md) | Label taxonomy |
| [AUTOTAGS.yml](bugbot/AUTOTAGS.yml) | Path → label globs |
| [TRIAGE.md](bugbot/TRIAGE.md) | Triage checklist |
| [DEVOPS-AUTOFIX.md](bugbot/DEVOPS-AUTOFIX.md) | Autonomous CI fix contract |
| [MERGE-CHAMPION.md](bugbot/MERGE-CHAMPION.md) | AI merge policy |

## Skill usage

When helpful during a PR review, Bugbot should:

- Prefer `/smart-git-automation` for worktree-session commit/PR preparation (grouping related changes into a cohesive PR).
- Prefer `/gitlab-assistant` for creating/updating GitLab issues or merge requests when the review needs external tracking (GitLab adjunct; GitHub remains SoR).
- Prefer `/beads` when the review or follow-up spans multiple sessions and needs persistent task memory.
- Prefer `/principle-fix-root-causes` for CI/CD flakes and restart bugs — trace root cause, not symptom guards.
- Prefer `/pr-merge-champion` before claiming a PR is merge-ready.
- Prefer `/acceptance-orchestrator` for multi-step fixes (max 2 iteration rounds before escalate).
- Prefer `/setup-matt-pocock-skills` when review work requires bootstrapping the engineering-skill issue tracker/triage vocabulary/domain docs.

## Stack-specific review

### stack:forge (`next-forge/`)

- Bun/Turbo; no Yarn in `next-forge/`
- Supabase RLS, `getUser()` server-side, Auth.js default for `apps/app`
- Feature flags: [FEATURE-FLAGS.md](../next-forge/packages/feature-flags/FEATURE-FLAGS.md)
- Verify: `yarn verify:forge`

### stack:generative (`GenerativeUI_monorepo/`)

- Yarn 3.3; no Bun in GenerativeUI
- No `workspace:*` or relative imports to `next-forge/`
- Verify: `yarn verify:generative`

### stack:orchestration (scripts, beads, hooks, `.cursor/`)

- Worktrees only for feature work; PRs to `dev`
- Link `modme-xxxx` beads ID in PR when multi-session
- Verify: `yarn pre-commit:check`

Route citizens via [data/agent-citizens/](../data/agent-citizens/) and [scripts/lib/polis-router.mjs](../scripts/lib/polis-router.mjs).

## Oracle-to-PostgreSQL migration bug reports

For PRs/issues that are specifically Oracle-to-Postgres migration defects, Bugbot should use the Oracle-to-PostgreSQL defect report structure from:

- [Oracle->Postgres BUG-REPORT-TEMPLATE (awesome-copilot skill)](../.vendor/awesome-copilot-main/skills/creating-oracle-to-postgres-migration-bug-report/references/BUG-REPORT-TEMPLATE.md)
- [Oracle->Postgres BUG-REPORT-TEMPLATE (oracle-to-postgres plugin)](../.vendor/awesome-copilot-main/plugins/oracle-to-postgres-migration-expert/skills/creating-oracle-to-postgres-migration-bug-report/references/BUG-REPORT-TEMPLATE.md)

When Bugbot converts a discovered specification into an actionable issue, it should use:

- [gen-specs-as-issues.prompt.md](../agent-library/prompts/gen-specs-as-issues.prompt.md)
- [ISSUE.md](bugbot/ISSUE.md) for body structure and labels

## Feature-flag touchpoints (next-forge)

If a PR touches `next-forge/packages/feature-flags/`, Bugbot should review behavior, access control, and env/secrets wiring using:

- [FEATURE-FLAGS.md](../next-forge/packages/feature-flags/FEATURE-FLAGS.md)

Human merge required — see [MERGE-CHAMPION.md](bugbot/MERGE-CHAMPION.md).
