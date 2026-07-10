# Beads issue tracking — Monorepo_ModMe

Git-backed task memory for multi-session agent work. Prefix: **`modme`**.

**Canonical git remote:** [https://github.com/Ditto190/modme-ui-01](https://github.com/Ditto190/modme-ui-01) (`origin` and `upstream` should both point here).

**Run all beads commands from the monorepo root** (`Monorepo_ModMe/`), not from `next-forge/` or `.beads/`.

**Cursor command:** `/beads` (subcommands: `ready`, `create`, `show`, `close`, `sync`, `session`).

## Initialize (once)

```powershell
cd C:\Users\dylan\Monorepo_ModMe
yarn beads:init
```

Uses `npx @beads/bd` (no global `bd` install). Idempotent — skips init/seed if `.beads/metadata.json` or issues already exist.

Manual alternative:

```powershell
npx @beads/bd init --prefix modme --non-interactive --skip-agents
```

## Daily commands

```powershell
yarn beads:ready      # unblocked work
yarn beads:list       # all issues
yarn beads:push       # Dolt push to modme-ui-01 remote
yarn beads:pull       # Dolt pull
yarn beads:compact    # preview compaction candidates
```

Issue IDs use **hash suffixes** (e.g. `modme-aqu`), not sequential `modme-1`.

## Starter issues (seeded on first init)

| Title | Type |
|-------|------|
| chore: Verify compound Full Stack: Forge Core + Agent Server | chore |
| chore: CI Phase A — confirm pre-commit vs ci.yml split | chore |
| task: Migration Phase 4 — feature-flag cutover for generative-ui | task |
| chore: Document yarn verify:forge + yarn verify:generative in onboarding | chore |
| task: Complete Storybook workshop parity with GenerativeCanvas | task |
| task: Agent terminal orchestration - mprocs TUI + session envelopes | task |
| chore: E2E worktree-smoke CI job + local smoke checklist | chore |
| chore: BUGBOT template pack + labeler modernization | chore |
| chore: devops-autofix lane - polis router + backlog-health | chore |
| chore: GitLab issue templates + Duo devops-autofix job | chore |

## Session orchestration (beads + envelopes)

At **worktree session start** (automatic via Cursor `setup-worktree-windows.ps1` or manual):

```powershell
yarn agent:session:start --% -TaskTitle "my task" -ClaimPaths "next-forge/apps/app"
yarn beads:ready
```

At **session finish**:

```powershell
.\scripts\agent-session-finish.ps1 -VerifyStack -Yes -CommitMessage "feat: ..." -Push -CreatePr
yarn beads:push
```

Session envelopes: `logs/agent-orchestrator/sessions/<uuid>.json`. Guide: [`docs/agent-terminal-orchestration.md`](agent-terminal-orchestration.md).

## When to use beads vs chat todos

- **Beads:** multi-session work, dependencies, survives context compaction
- **Chat todos:** single-session linear tasks

See [`docs/agent-index.md`](agent-index.md) and [`.cursor/commands/init.md`](../.cursor/commands/init.md).

## CI / automation integration

Onboarding and CI work should be tracked in beads when it spans sessions. Use the repo-local skill:

- [`.agents/skills/cicd-automation-workflow-automate/SKILL.md`](../.agents/skills/cicd-automation-workflow-automate/SKILL.md) — Phase E (beads + verify scripts)

After `yarn beads:init`, agents run `npx @beads/bd ready` at session start and close issues when CI/migration tasks complete.

## GitHub SoR + GitLab adjunct

- **GitHub** (`Ditto190/modme-ui-01`) is system-of-record for issues and PRs.
- **GitLab** mirrors DevOps autofix work when `GITLAB_PROJECT_ID` is set; always include `github_sor` on GitLab issues.
- Promote beads → GitHub: [`.github/ISSUE_TEMPLATE/beads-handoff.yml`](../.github/ISSUE_TEMPLATE/beads-handoff.yml)

```javascript
import { beadsLinkExternal, beadsPromoteToIssue } from "./scripts/lib/beads-hooks.mjs";

await beadsPromoteToIssue("chore: fix ci.yml", "modme-aqu");
await beadsLinkExternal("modme-aqu", "https://github.com/Ditto190/modme-ui-01/issues/42");
```

Routing: [`docs/workflows/POLIS-ROUTING.md`](workflows/POLIS-ROUTING.md) (`beads-orchestrator` citizen).

Backlog hygiene: `yarn backlog:health`
