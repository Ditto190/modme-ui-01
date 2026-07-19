# Multi-Agent Worktrees — Monorepo_ModMe

Canonical guide for running **multiple agents and IDEs in parallel** without fighting over a single checkout, Git state, or dev-server ports.

## Problem

A single checkout shared by Cursor Agents, Copilot, Claude Code, and Antigravity causes:

- File watcher and index churn (IDE slowdown)
- Git state conflicts and accidental cross-agent edits
- Port collisions (`3000`, `3001`, `8000` from [`scripts/launch-manifest.json`](../scripts/launch-manifest.json))
- **Duplicate dependency trees** — each worktree running full `yarn`/`bun`/`poetry` installs (multi-GB `node_modules` + `.venv` per agent)

Worktrees give each agent its own folder, branch, and port slot. **Heavy dependencies are shared** via Windows junctions from `.worktrees/dev` (golden image); only source edits differ per worktree.

## Architecture

Two complementary layers share naming, branches, and port logic:

| Layer                      | Mechanism                                                             | Who uses it                                                           |
| -------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Cursor auto-bootstrap**  | [`.cursor/worktrees.json`](../.cursor/worktrees.json) + setup scripts | Cursor Agents Window, Editor `/worktree`, `/best-of-n`, CLI worktrees |
| **Explicit Git worktrees** | `scripts/init-worktrees.ps1`, `new-agent-worktree.ps1`                | Copilot, Claude Code, Antigravity, humans opening folders manually    |

### Directory layout

```
C:\Users\dylan\Monorepo_ModMe\          ← main (review/merge only)
  .worktrees/
    dev/                               ← golden shared-deps image (stays on C:)

D:\Github_Projects\worktrees\Monorepo_ModMe\   ← canonical agent worktrees root
  dev-agent-cursor-<task>/
  dev-agent-copilot-<task>/
  dev-agent-claude-<task>/
  dev-agent-antigravity-<task>/
  dev-human-<task>/

D:\Github_Projects\workspace\
  Monorepo_ModMe.code-workspace        ← multi-root IDE workspace
  docs\                                ← ops / migration docs
```

**Resolution for new agent worktrees:** `$env:WORKTREES_ROOT` → `-WorktreesRoot` → legacy `<repo>/.worktrees`.

**Deprecated:** `D:\AIB Github Projects\worktrees` — do not use for Monorepo_ModMe.

Branch naming: `feature/<owner>/<task>` (e.g. `feature/cursor/auth-fix`).

---

## Terminal / pwsh startup

If pwsh shows `code is not recognized`, `Invoke-Expression`, or conda errors on startup:

```powershell
.\scripts\install-pwsh-terminal-hooks.ps1
```

Then restart the terminal. This patches:

- `Microsoft.PowerShell_profile.ps1` — Cursor/VS Code shell integration + safe direnv hook
- `profile.ps1` — conda init wrapped in try/catch (conda 23.x `activate base` can throw on pwsh)

To fully repair conda afterward: `conda init powershell` and restart the terminal. If warnings persist on pwsh 7.6 + conda 23.x, re-run `install-pwsh-terminal-hooks.ps1` (uses `conda-hook.ps1` without auto-activate).

## One-time setup

From the **main** checkout:

```powershell
.\scripts\init-worktrees.ps1
```

Creates golden `.worktrees/dev` on the `dev` branch (shared-deps junction source). Optionally add staging:

```powershell
.\scripts\init-worktrees.ps1 -IncludeStaging
```

Point new agent trees at D: (recommended):

```powershell
$env:WORKTREES_ROOT = "D:\Github_Projects\worktrees\Monorepo_ModMe"
# or: .\scripts\new-agent-worktree.ps1 -Name "my-task" -Owner cursor -WorktreesRoot $env:WORKTREES_ROOT
```

Open the multi-root workspace: `D:\Github_Projects\workspace\Monorepo_ModMe.code-workspace`.

---

## Per-agent workflows

### Cursor Agents Window

1. Start an agent from the Agents Window.
2. Cursor creates a worktree and runs [`.cursor/setup-worktree-windows.ps1`](../.cursor/setup-worktree-windows.ps1) (or Unix equivalent).
3. Review changes in the worktree diff UI; commit/PR from the worktree.

Setup steps (automatic, **shared-deps** default):

1. Port allocation → `.worktree-ports.env`
2. Copy `.env` + lockfiles from `ROOT_WORKTREE_PATH` (main checkout)
3. Junction-link `node_modules` / `.venv` from `.worktrees/dev` (no per-agent installs)
4. Git pre-commit hook install (`scripts/install-git-hooks.ps1`)
5. Optional agent session envelope

Manual bootstrap modes (`yarn workspace:bootstrap`, `:shared`, `:lite`) — see [Shared dependencies](#shared-dependencies).

Debug setup failures: **Output → Worktrees Setup**.

### GitHub Copilot App

Copilot App workspaces use [`.github/github-app.yml`](../.github/github-app.yml) and [`.worktreeinclude`](../.worktreeinclude) instead of Cursor setup scripts.

1. Trust the repository config in Copilot App **Project Settings** when prompted.
2. On `session.create`, the app runs [`scripts/copilot-workspace/lifecycle.ps1`](../scripts/copilot-workspace/lifecycle.ps1) (bootstrap + agent session envelope).
3. On `session.archive`, preflight fast + session envelope close.
4. Use **Run** scripts from the workspace menu (`dev:forge:core`, `workbench`, `preflight:copilot`, etc.).

`COPILOT_WORKSPACE_PATH` maps to the worktree; `COPILOT_ROOT_PATH` is the main checkout for env copy. Generated env: `.copilot/workspace.generated.env`.

Full guide: [`docs/copilot-workspace-orchestration.md`](copilot-workspace-orchestration.md).

### End of session

When finishing a prototype session:

```powershell
yarn worktree:doctor              # optional pre-flight in worktree
yarn agent:session:start          # optional if not auto-started by Cursor setup
yarn agent:status                 # worktree + ports + doctor summary
yarn check:forge                  # fast next-forge lint during iteration
yarn verify:forge                 # full CI parity before opening PR
.\scripts\agent-session-finish.ps1 -VerifyStack  # envelope + agenttrace + vibe finish
.\scripts\vibe-session-finish.ps1 # prefer direct script in worktrees
# Agents (non-interactive):
.\scripts\agent-session-finish.ps1 -Yes -CommitMessage "feat(scope): summary" -Push -CreatePr -VerifyStack
# Preview: .\scripts\vibe-session-finish.ps1 -DryRun -SkipPull
```

See [`docs/agent-terminal-orchestration.md`](agent-terminal-orchestration.md). Branch creation stays on `new-agent-worktree.ps1` / `/worktree` — smart-git is for commit/PR only.

### Cursor Editor commands

| Command            | Purpose                                 |
| ------------------ | --------------------------------------- |
| `/worktree <task>` | Create worktree for a task              |
| `/best-of-n`       | Parallel attempts in isolated worktrees |
| `/apply-worktree`  | Apply worktree changes to main          |
| `/delete-worktree` | Remove a Cursor-managed worktree        |

### VS Code Copilot

```powershell
.\scripts\new-agent-worktree.ps1 -Name "auth-fix" -Owner copilot
```

Open `.worktrees/dev-agent-copilot-auth-fix` in VS Code.

### Claude Code

```powershell
.\scripts\new-agent-worktree.ps1 -Name "auth-fix" -Owner claude
```

Open the generated folder in Claude Code.

### Antigravity

```powershell
.\scripts\new-agent-worktree.ps1 -Name "auth-fix" -Owner antigravity
```

`leanctx.binaryPath` in [`.vscode/settings.json`](../.vscode/settings.json) applies per worktree.

### Human developers

```powershell
.\scripts\new-agent-worktree.ps1 -Name "auth-fix" -Owner human
```

---

## Port isolation

[`scripts/worktree-allocate-ports.ps1`](../scripts/worktree-allocate-ports.ps1) derives a stable **slot** (0–9) from the worktree folder name hash and writes [`.worktree-ports.env`](../.worktree-ports.env):

| Variable             | Base (main) | Offset      |
| -------------------- | ----------- | ----------- |
| `VIBE_WEB_PORT`      | 3000        | + slot × 10 |
| `WEB_DASHBOARD_PORT` | 3001        | + slot × 10 |
| `AGENT_SERVER_PORT`  | 8000        | + slot × 10 |
| `EXAMPLE_NEXT_PORT`  | 3002        | + slot × 10 |
| `EXAMPLE_REACT_PORT` | 3003        | + slot × 10 |

Example (slot 3): dashboard `3031`, agent server `8030`.

### Loading ports before dev

**PowerShell (recommended):**

```powershell
. .\scripts\load-worktree-ports.ps1
# or: yarn worktree:ports   # prints loaded vars; dot-source for env in same shell

yarn dev:forge:core
```

**Manual (same effect):**

```powershell
Get-Content .worktree-ports.env | ForEach-Object {
  if ($_ -match '^([A-Z_]+)=(.+)$') { Set-Item -Path "env:$($Matches[1])" -Value $Matches[2] }
}
```

**Unix / WSL:**

```bash
set -a && source .worktree-ports.env && set +a
```

Main checkout debugging uses [`.vscode/launch.json`](../.vscode/launch.json) base ports. Worktree debugging should use generated port env vars.

---

## Management scripts

| Script                                                                    | Purpose                                                                    |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [`init-worktrees.ps1`](../scripts/init-worktrees.ps1)                     | One-time dev worktree root                                                 |
| [`new-agent-worktree.ps1`](../scripts/new-agent-worktree.ps1)             | Create agent worktree + branch + ports + env                               |
| [`list-worktrees.ps1`](../scripts/list-worktrees.ps1)                     | List worktrees with assigned ports                                         |
| [`remove-agent-worktree.ps1`](../scripts/remove-agent-worktree.ps1)       | Safe removal; optional `-DeleteBranch`                                     |
| [`worktree-allocate-ports.ps1`](../scripts/worktree-allocate-ports.ps1)   | Regenerate `.worktree-ports.env`                                           |
| [`worktree-copy-env.ps1`](../scripts/worktree-copy-env.ps1)               | Copy `.env` by name from main checkout                                     |
| [`ensure-worktree.ps1`](../scripts/ensure-worktree.ps1)                   | Fail (or warn with `-WarnOnly`) if cwd is main checkout                    |
| [`migrate-main-to-worktree.ps1`](../scripts/migrate-main-to-worktree.ps1) | Stash main-checkout changes → new worktree → stash pop                     |
| [`worktree-doctor.ps1`](../scripts/worktree-doctor.ps1)                   | Pre-flight: checkout, yarn.lock, ports, gh, Supabase env (`-Fix`, `-Json`) |
| [`load-worktree-ports.ps1`](../scripts/load-worktree-ports.ps1)           | Dot-source `.worktree-ports.env` into current pwsh session                 |
| [`agent-workspace-tmux.sh`](../scripts/agent-workspace-tmux.sh)           | WSL/Linux tmux dashboard: `status`, `layout`, `attach`                     |
| [`worktree-relink-deps.ps1`](../scripts/worktree-relink-deps.ps1)           | Remove local deps + junction-link agent worktrees to `.worktrees/dev`      |
| [`worktree-session-end.ps1`](../scripts/worktree-session-end.ps1)         | Session end wrapper (verify, commit, PR, optional worktree removal)        |
| [`vibe-session-finish.ps1`](../scripts/vibe-session-finish.ps1)           | Session end: sync, group, pre-commit, commit, push, PR to `dev`            |

List all worktrees:

```powershell
.\scripts\list-worktrees.ps1
```

Remove when merged:

```powershell
.\scripts\remove-agent-worktree.ps1 -Path "C:\Users\...\Monorepo_ModMe\.worktrees\dev-agent-cursor-auth-fix"
# Optional: -DeleteBranch after merge
```

---

## Environment secrets

Copied **by name only** from the main checkout (never committed):

- `.env` (repo root)
- `GenerativeUI_monorepo/apps/agent-server/.env`
- `GenerativeUI_monorepo/apps/web-dashboard/.env.local`

Use `.env.example` for required variable **names**.

Lockfiles copied for junction matching: `yarn.lock`, `.yarnrc.yml`, `next-forge/bun.lock`, `GenerativeUI_monorepo/apps/agent-server/poetry.lock`.

---

## Shared dependencies

Agent worktrees **do not** run full installs by default. One golden checkout holds deps:

| Checkout | Bootstrap | Role |
| -------- | --------- | ---- |
| `.worktrees/dev` | `yarn workspace:bootstrap` (full) | Dependency source (junction target) |
| `dev-agent-*` | `yarn workspace:bootstrap:shared` | Junction-link heavy dirs from dev |
| Any worktree | `yarn workspace:bootstrap:lite` | Ports + env only |

```powershell
# One-time golden image (from .worktrees/dev)
yarn workspace:bootstrap

# New agent worktree (shared-deps is default)
.\scripts\new-agent-worktree.ps1 -Name "my-task" -Owner cursor

# Migrate bloated worktrees after upgrading bootstrap
yarn worktree:relink-deps

# Verify junction health
yarn worktree:doctor
yarn worktree:doctor:fix
```

Heavy dirs junction-linked: `node_modules`, `GenerativeUI_monorepo/node_modules`, `next-forge/node_modules`, `GenerativeUI_monorepo/apps/agent-server/.venv`.

Implementation: [`scripts/lib/worktree-link-deps.ps1`](../scripts/lib/worktree-link-deps.ps1) (Windows `mklink /J`) + Yarn `nmMode: hardlinks-global` in [`.yarnrc.yml`](../.yarnrc.yml).

Preflight: `yarn preflight:worktree` (contract tests + orchestration smoke).

---

Mirror [UniversalWorkbench GIT_WORKFLOW](../GenerativeUI_monorepo/UniversalWorkbench/docs/GIT_WORKFLOW.md):

1. Feature branches: `feature/<owner>/<task>` off `dev`
2. Commit in the worktree
3. Open PR to `dev` (not `main`)
4. After merge: remove worktree with `remove-agent-worktree.ps1`
5. **Never** merge/rebase manually across worktrees

Main checkout is for review, merge, and release — not active feature development.

## Repo alignment

GitHub (`Ditto190/modme-ui-01`) is canonical; GitLab is an automated mirror. See [`docs/repo-alignment.md`](repo-alignment.md).

```powershell
yarn repo:doctor              # remotes, AGENTS.md, workspace.json validity
yarn repo:doctor:fix          # regenerate minimal workspace.code-workspace
```

Open [`workspace.code-workspace`](../workspace.code-workspace) so IDE roots match `next-forge/` and `GenerativeUI_monorepo/`.

### Main checkout policy

Agents and humans should **not** implement features in `Monorepo_ModMe/` (the main checkout). Use a worktree under the agent worktrees root (`$env:WORKTREES_ROOT` / `D:\Github_Projects\worktrees\Monorepo_ModMe`, or legacy `.worktrees/`) instead.

Verify before starting feature work:

```powershell
yarn worktree:ensure          # exits 1 on main checkout
.\scripts\ensure-worktree.ps1 -WarnOnly   # warning only
```

### Recovering uncommitted work on main

If you already have uncommitted changes on the main checkout, migrate them into a new worktree (does not commit):

```powershell
# From main checkout Monorepo_ModMe/
.\scripts\migrate-main-to-worktree.ps1 -Name "my-task" -Owner cursor
# or: yarn worktree:migrate -- -Name "my-task" -Owner cursor
```

If main is not on `dev`, prefer `-FromCurrentBranch` to attach the worktree to the current HEAD and reduce stash conflicts:

```powershell
.\scripts\migrate-main-to-worktree.ps1 -Name "my-task" -Owner cursor -FromCurrentBranch

cd .worktrees\dev-agent-cursor-my-task
yarn vibe:finish
```

The script stashes all changes (including untracked), creates the worktree via `new-agent-worktree.ps1`, then `git stash pop` in the new folder. On failure it attempts to restore the stash on main.

Use `-DryRun` to preview steps without mutating Git.

---

## Working directory matrix (human + agents)

Run commands from the **correct checkout and folder**. Wrong cwd is the most common terminal failure in shared codespaces.

| Goal                              | Checkout                     | Directory                       | Command                                                                                   |
| --------------------------------- | ---------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| Feature implementation            | worktree under `.worktrees/` | worktree root                   | `yarn worktree:ensure` then edit                                                          |
| Pre-flight / fix yarn in worktree | worktree                     | worktree root                   | `yarn worktree:doctor` / `yarn worktree:doctor:fix`                                       |
| Load dev ports                    | worktree                     | worktree root                   | `. .\scripts\load-worktree-ports.ps1`                                                     |
| next-forge dev / verify           | worktree                     | **repo root**                   | `yarn dev:forge:core`, `yarn verify:forge`                                                |
| next-forge package scripts        | worktree                     | `next-forge/`                   | `npx bun run …` (Bun, not root yarn)                                                      |
| Prisma / database package         | worktree                     | `next-forge/packages/database/` | `npx bun run db:push` (needs `.env` there)                                                |
| Root intake / catalogue           | worktree                     | **repo root**                   | `yarn intake` (needs root `.env` Supabase vars)                                           |
| Supabase CLI status               | worktree                     | `next-forge/`                   | `npx bunx supabase status -o env`                                                         |
| Session finish (commit/PR)        | worktree                     | worktree root                   | `.\scripts\vibe-session-finish.ps1` (prefer over `yarn vibe:finish` if yarn.lock missing) |
| Review / merge only               | main `Monorepo_ModMe/`       | main root                       | no feature edits                                                                          |

**Package managers:** root = Yarn 3; `next-forge/` = Bun. Never run `yarn install` inside `next-forge/` or `bun install` at repo root.

---

## Agent-friendly CLI contract

Scripts follow [cli-for-agents](https://github.com/cursor/plugins/tree/main/cli-for-agents) patterns: flags first, layered `--help`, dry-run, machine output where useful.

| Script                         | Non-interactive flags                                     | Help    |
| ------------------------------ | --------------------------------------------------------- | ------- |
| `ensure-worktree.ps1`          | `-WarnOnly`                                               | `-Help` |
| `migrate-main-to-worktree.ps1` | `-DryRun`                                                 | `-Help` |
| `worktree-doctor.ps1`          | `-Fix`, `-Json`, `-Quiet`                                 | `-Help` |
| `vibe-session-finish.ps1`      | `-DryRun`, `-Yes`, `-CommitMessage`, `-Push`, `-CreatePr` | `-Help` |
| `remove-agent-worktree.ps1`    | `-Yes`, `-Force`                                          | `-Help` |

**Agent session finish (headless):**

```powershell
.\scripts\vibe-session-finish.ps1 -Yes -CommitMessage "feat(next-forge): add catalogue route" -Push -CreatePr
```

Requires `gh` auth (`gh auth refresh -h github.com`) or `GH_TOKEN` / `GITHUB_TOKEN` for `gh pr create`.

**Doctor JSON (pipelines):**

```powershell
.\scripts\worktree-doctor.ps1 -Json | ConvertFrom-Json
```

---

## tmux dashboard (WSL / Linux / Git Bash)

For humans monitoring multiple worktrees, or agents on Unix shells:

```bash
./scripts/agent-workspace-tmux.sh status
./scripts/agent-workspace-tmux.sh layout    # detached session modme-agents
./scripts/agent-workspace-tmux.sh attach
yarn worktree:tmux -- attach                # from repo root
```

Windows pwsh: use `yarn agent:tui` (mprocs) as the primary terminal manager; `worktree-doctor` + `list-worktrees.ps1` for status. tmux optional via WSL (`yarn worktree:tmux:ps`). See [`windows-docker-wsl-setup.md`](windows-docker-wsl-setup.md).

---

## IDE settings

[`.vscode/settings.json`](../.vscode/settings.json):

```json
{
  "cursor.worktreeMaxCount": 12,
  "cursor.worktreeCleanupIntervalHours": 6
}
```

Recommended concurrent **agent** worktrees (soft): **8**. Cursor MaxCount can be higher for short-lived `/best-of-n` trees; prune finished agents promptly.

Agent terminals should respect `.worktree-ports.env` when starting dev servers.

---

## Cleanup

| Action                      | When                                           |
| --------------------------- | ---------------------------------------------- |
| `remove-agent-worktree.ps1` | Task merged or abandoned                       |
| `git worktree prune`        | Orphaned worktree metadata                     |
| Cursor auto-cleanup         | Every 6 hours; max **12** Cursor-managed worktrees (`.vscode/settings.json`) |
| Soft agent cap              | ~**8** concurrent `dev-agent-*` / `dev-human-*` under `WORKTREES_ROOT` |

**Disk note:** Prefer **shared-deps junctions** from `.worktrees/dev` — do **not** full-install per agent. `new-agent-worktree.ps1` warns if the worktrees drive has under 20 GB free or agent count is at/above 8. Canonical root: `D:\Github_Projects\worktrees\Monorepo_ModMe`. Ops detail: `D:\Github_Projects\workspace\docs\worktree-essential-mirror-limits.md`.

### Sparse-checkout

**Rejected** for agent worktrees: Yarn/Bun monorepo installs and workspace protocol resolution need a full tree checkout. Essential mirroring is env/lockfiles + junctions, not sparse-checkout.

---

## Canvas sharing (review)

For multi-agent review of audit/report artifacts, see [Cursor canvas sharing](https://cursor.com/docs/agent/tools/canvas#sharing-canvases). Orthogonal to worktrees but useful when publishing findings to teammates.

---

## Daily workflow checklist

1. **Once:** `.\scripts\init-worktrees.ps1` (+ set `$env:WORKTREES_ROOT` to `D:\Github_Projects\worktrees\Monorepo_ModMe`)
2. **Per task:** `.\scripts\new-agent-worktree.ps1 -Name "<task>" -Owner <ide>`
3. **Cursor:** open `D:\Github_Projects\workspace\Monorepo_ModMe.code-workspace`, then Agents Window or `/worktree`
4. **Other IDEs:** File → Open Folder → worktree path under the agent root
5. **Verify:** `yarn worktree:doctor`, load ports, run targeted lint / tests
6. **Finish:** `.\scripts\vibe-session-finish.ps1` → PR to `dev` → `remove-agent-worktree.ps1 -Yes`

---

## Related docs

- [`AGENTS.md`](../AGENTS.md) — agent quick-start
- [`docs/agent-tech-guide.md`](./agent-tech-guide.md) — section 11
- [`.cursor/rules/multi-agent-worktrees.mdc`](../.cursor/rules/multi-agent-worktrees.mdc) — always-on rule
- [`docs/debug-launch-guide.md`](./debug-launch-guide.md) — main-checkout launch.json
