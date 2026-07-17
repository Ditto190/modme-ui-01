# Merge Champion Policy (AI reviewers)

Only **bugbot-merge-champion** may approve merge when policy allows. Author agent ≠ merge champion.

## Target branch

Always **`dev`**. Never merge feature branches to `main` from agent workflows.

## Required checks

- `ci.yml` green (path-filtered jobs) + `merge_group` re-run in Trunk queue
- Agent role checks from [`.github/agent-codeowners.yml`](../../.github/agent-codeowners.yml) (skip-success when unmatched):
  - `modme/agent-forge` | `modme/agent-generative` | `modme/agent-devops` | `modme/agent-security` | `modme/agent-merge`
- `pre-push-checks.mjs` parity locally when possible
- Label `bugbot-reviewed` on PR
- Label `review:merge` present after dispatcher runs

## Trunk

Enqueue with `/trunk merge` (or Trunk UI) **only** after `modme/agent-merge` is green and Merge Champion policy allows. Do not bypass agent checks.

## AI-only merge allowed

| Condition                                        | Allowed |
| ------------------------------------------------ | ------- |
| Type `chore`, `docs`, `ci`                       | Yes     |
| Label `stack:root` or `stack:orchestration` only | Yes     |
| No auth/RLS/Supabase schema changes              | Yes     |
| No `next-forge/packages/feature-flags/` changes  | Yes     |

## Human merge required

- `priority:critical` or `security` label
- `stack:forge` + auth, RLS, payments, Stripe
- Feature flags package touched
- BREAKING CHANGE in commits
- Cross-stack PR (`verify:both` required — human spot-check)

## Service accounts

| Platform | Account                                               |
| -------- | ----------------------------------------------------- |
| GitHub   | `github-actions[bot]` + `agent:review` label workflow |
| GitLab   | `modme-merge-bot`, `modme-devops-bot`                 |

## Pre-merge checklist (/pr-merge-champion)

- [ ] Self-review: no debug logs, secrets, unrelated diffs
- [ ] Verify commands run and pasted in PR
- [ ] beads issue closed or updated (`yarn beads:push`)
- [ ] acceptance-orchestrator evidence block in PR comment

## Evidence block (paste on PR before merge)

```markdown
## Acceptance evidence

- Status: accepted
- Verify: `yarn verify:forge` (exit 0)
- Beads: modme-xxxx closed
- Open risks: none
```
