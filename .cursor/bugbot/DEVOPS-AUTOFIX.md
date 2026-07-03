# DevOps Autofix Contract

For issues labeled `devops-autofix`. Agents: **devops-ci-champion** (Cursor cloud / GitLab Duo Fix CI/CD Flow).

## Principles

Follow `/principle-fix-root-causes`:

1. Reproduce the failure locally or from CI logs
2. Ask "why" until root cause — not symptom patches
3. Fix the pattern, not one instance (grep for same anti-pattern)
4. Suspect stale state on restart bugs (caches, lock files, env)

## acceptance-orchestrator gates

| State | Requirement |
|-------|-------------|
| issue-gated | Issue has acceptance criteria; `self_heal: Yes` |
| executing | Worktree session; run targeted verify |
| review-loop | PR open; CI re-run |
| accepted | Verify commands pass with fresh evidence |
| escalated | After **2** full fix rounds — label `status:agent-escalated` |

## Verify commands (by stack)

```powershell
yarn verify:forge        # next-forge/**
yarn verify:generative   # GenerativeUI_monorepo/**
yarn pre-commit:check    # orchestration / root hooks
```

## Human gates (stop autonomous fix)

- Production deploy
- Secret rotation
- `git push --force`
- `prisma db push --accept-data-loss` on cloud Supabase

## Issue body requirements

- Pipeline name and failing job
- Error log excerpt (not full 10k lines)
- `verify_commands` field
- Optional: `beads_issue_id`, `github_sor` (GitLab mirror)

## GitLab adjunct

When `GITLAB_PROJECT_ID` is set, mirror issue to GitLab for Duo **Fix CI/CD Pipeline Flow**. GitHub issue remains authoritative.
