---
name: smart-git-automation
description: "Use when finishing a session, starting agent work in Monorepo_ModMe, lean-ctx is missing/misconfigured, agents bypass ctx_read/ctx_search, or configuring lean-ctx from config-schema.json. Worktree-first smart git grouping, commit, and PR to dev."
---

# smart-git-automation (Monorepo_ModMe)

Extends the global [smart-git-automation](https://github.com/mskadu/opencode-agent-skills) skill with **Monorepo_ModMe** rules. Use at **session end** after prototyping in a worktree — not for branch creation.

## When to use

- Finishing a vibe-coding / prototype session in `next-forge` or GenerativeUI
- Grouping related changes before commit
- Streamlined push + PR to `dev`

## When NOT to use

- Creating branches or worktrees (use `new-agent-worktree.ps1` or Cursor `/worktree`)
- Main checkout `Monorepo_ModMe/` feature work (forbidden)
- Cross-stack changes without first splitting them into separate next-forge and GenerativeUI PR scopes

## ModMe overrides (non-negotiable)

| Global smart-git | Monorepo_ModMe |
|------------------|----------------|
| `git checkout -b feature/add-auth` | Branches only via `.\scripts\new-agent-worktree.ps1 -Name "<task>" -Owner <owner>` → `feature/<owner>/<task>` |
| PR base `main` | **`gh pr create --base dev`** |
| Auto-commit | **User must confirm** each commit/push/PR step |
| One blob commit | If both `next-forge/` and `GenerativeUI_monorepo/` changed → split the work into separate PR scopes before committing |

## Recommended flow

```powershell
# 1. Work in worktree (not main checkout)
.\scripts\new-agent-worktree.ps1 -Name "my-prototype" -Owner cursor

# 2. Prototype (next-forge)
yarn dev:forge:core
yarn check:forge          # fast lint during iteration

# 3. Session end
.\scripts\vibe-session-finish.ps1
# or agent-driven equivalent following steps below
```

## Agent workflow (manual smart-git)

### 0. lean-ctx ensure (before git)

```powershell
yarn lean-ctx:ensure
# Check only: .\scripts\ensure-lean-ctx-config.ps1 -CheckOnly
```

- Auto-applies safe ModMe defaults if global/project config missing or invalid
- Nudges hybrid adoption once per session if agents bypass lean-ctx
- Details: [references/lean-ctx-config-workflow.md](references/lean-ctx-config-workflow.md)

### 1. Smart detection & grouping

Run in parallel and group by **stack**:

| Stack | Path prefix |
|-------|-------------|
| next-forge | `next-forge/` |
| GenerativeUI | `GenerativeUI_monorepo/` |
| Root orchestration | `scripts/`, `docs/`, `.cursor/`, `.agents/`, `.github/` |
| UniversalWorkbench | `GenerativeUI_monorepo/UniversalWorkbench*/` (read-only unless tasked) |

### 2. Branch validation (skip branch creation)

- Abort if cwd is main `Monorepo_ModMe/` (not under `Monorepo_ModMe-dev/`)
- Expect branch `feature/<owner>/<task>`
- Do **not** create new branches with smart-git naming

### 3. Pre-commit before commit

```powershell
git pull origin dev
yarn pre-commit:check
# next-forge only: yarn check:forge
# pre-PR: yarn verify:forge
```

### 4. Commit

- Stage with **pathspecs only** (`git add -- path/to/file ...`)
- Conventional commits with scope: `feat(next-forge): add prototype canvas`
- User confirms before `git commit`

### 5. Push & PR

```powershell
git push -u origin HEAD
gh pr create --base dev --title "..." --body "..."
```

PR body must include test plan with `yarn check:forge` / `yarn verify:forge` when next-forge changed.

## Helper script

[`scripts/vibe-session-finish.ps1`](../../scripts/vibe-session-finish.ps1) implements this flow interactively.

## Related

- [references/lean-ctx-config-workflow.md](./references/lean-ctx-config-workflow.md)
- [`docs/lean-ctx-guide.md`](../../docs/lean-ctx-guide.md)
- [`docs/multi-agent-worktrees.md`](../../docs/multi-agent-worktrees.md)
- [`.agents/skills/next-forge/SKILL.md`](../next-forge/SKILL.md)
