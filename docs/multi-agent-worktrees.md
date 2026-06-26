# Multi-Agent Worktrees — Monorepo_ModMe

Canonical guide for running **multiple agents and IDEs in parallel** without fighting over a single checkout, Git state, or dev-server ports.

## Problem

A single checkout shared by Cursor Agents, Copilot, Claude Code, and Antigravity causes:

- File watcher and index churn (IDE slowdown)
- Git state conflicts and accidental cross-agent edits
- Port collisions (`3000`, `3001`, `8000` from [`scripts/launch-manifest.json`](../scripts/launch-manifest.json))
- Inconsistent bootstrap (`yarn install`, poetry venv)

Worktrees give each agent its own folder, branch, `node_modules`, poetry venv, and port slot.

## Architecture

Two complementary layers share naming, branches, and port logic:

| Layer | Mechanism | Who uses it |
|-------|-----------|-------------|
| **Cursor auto-bootstrap** | [`.cursor/worktrees.json`](../.cursor/worktrees.json) + setup scripts | Cursor Agents Window, Editor `/worktree`, `/best-of-n`, CLI worktrees |
| **Explicit Git worktrees** | `scripts/init-worktrees.ps1`, `new-agent-worktree.ps1` | Copilot, Claude Code, Antigravity, humans opening folders manually |

### Directory layout

```
Monorepo_ModMe/                    ← main (review/merge only)
Monorepo_ModMe-dev/
  dev/                             ← persistent `dev` branch checkout
  dev-agent-cursor-<task>/
  dev-agent-copilot-<task>/
  dev-agent-claude-<task>/
  dev-agent-antigravity-<task>/
  dev-agent-human-<task>/
```

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

Creates `../Monorepo_ModMe-dev/dev` on the `dev` branch. Optionally add staging:

```powershell
.\scripts\init-worktrees.ps1 -IncludeStaging
```

---

## Per-agent workflows

### Cursor Agents Window

1. Start an agent from the Agents Window.
2. Cursor creates a worktree and runs [`.cursor/setup-worktree-windows.ps1`](../.cursor/setup-worktree-windows.ps1) (or Unix equivalent).
3. Review changes in the worktree diff UI; commit/PR from the worktree.

Setup steps (automatic):

1. Port allocation → `.worktree-ports.env`
2. `corepack enable`
3. `yarn install` in `GenerativeUI_monorepo/`
4. `npx bun install` in `next-forge/`
5. Copy `.env` files and lspmux editor settings from `ROOT_WORKTREE_PATH` (main checkout)
6. `poetry install` in `apps/agent-server/`
7. Optional `lean-ctx doctor` (non-fatal)
8. Git pre-commit hook install (`scripts/install-git-hooks.ps1`)

Debug setup failures: **Output → Worktrees Setup**.

### End of session

When finishing a prototype session:

```powershell
yarn worktree:doctor              # optional pre-flight in worktree
yarn check:forge                  # fast next-forge lint during iteration
yarn verify:forge                 # full CI parity before opening PR
.\scripts\vibe-session-finish.ps1 # prefer direct script in worktrees
# Agents (non-interactive):
.\scripts\vibe-session-finish.ps1 -Yes -CommitMessage "feat(scope): summary" -Push -CreatePr
# Preview: .\scripts\vibe-session-finish.ps1 -DryRun -SkipPull
```

See [`.agents/skills/smart-git-automation/SKILL.md`](../.agents/skills/smart-git-automation/SKILL.md). Branch creation stays on `new-agent-worktree.ps1` / `/worktree` — smart-git is for commit/PR only.

### Cursor Editor commands

| Command | Purpose |
|---------|---------|
| `/worktree <task>` | Create worktree for a task |
| `/best-of-n` | Parallel attempts in isolated worktrees |
| `/apply-worktree` | Apply worktree changes to main |
| `/delete-worktree` | Remove a Cursor-managed worktree |

### VS Code Copilot

```powershell
.\scripts\new-agent-worktree.ps1 -Name "auth-fix" -Owner copilot
```

Open `../Monorepo_ModMe-dev/dev-agent-copilot-auth-fix` in VS Code.

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

| Variable | Base (main) | Offset |
|----------|-------------|--------|
| `VIBE_WEB_PORT` | 3000 | + slot × 10 |
| `WEB_DASHBOARD_PORT` | 3001 | + slot × 10 |
| `AGENT_SERVER_PORT` | 8000 | + slot × 10 |
| `EXAMPLE_NEXT_PORT` | 3002 | + slot × 10 |
| `EXAMPLE_REACT_PORT` | 3003 | + slot × 10 |
| `LSPMUX_CONNECT` | `127.0.0.1:27631` | fixed (host lspmux daemon) |

Example (slot 3): dashboard `3031`, agent server `8030`.

`LSPMUX_CONNECT` points every worktree at the **same machine-local lspmux daemon**. Language-server instances are still **per worktree path** (see [LSP multiplexing](#lsp-multiplexing-lspmux) below).

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

| Script | Purpose |
|--------|---------|
| [`init-worktrees.ps1`](../scripts/init-worktrees.ps1) | One-time dev worktree root |
| [`new-agent-worktree.ps1`](../scripts/new-agent-worktree.ps1) | Create agent worktree + branch + ports + env |
| [`list-worktrees.ps1`](../scripts/list-worktrees.ps1) | List worktrees with assigned ports |
| [`remove-agent-worktree.ps1`](../scripts/remove-agent-worktree.ps1) | Safe removal; optional `-DeleteBranch` |
| [`worktree-allocate-ports.ps1`](../scripts/worktree-allocate-ports.ps1) | Regenerate `.worktree-ports.env` |
| [`worktree-copy-env.ps1`](../scripts/worktree-copy-env.ps1) | Copy `.env` by name from main checkout; merge lspmux editor settings |
| [`ensure-worktree.ps1`](../scripts/ensure-worktree.ps1) | Fail (or warn with `-WarnOnly`) if cwd is main checkout |
| [`migrate-main-to-worktree.ps1`](../scripts/migrate-main-to-worktree.ps1) | Stash main-checkout changes → new worktree → stash pop |
| [`worktree-doctor.ps1`](../scripts/worktree-doctor.ps1) | Pre-flight: checkout, yarn.lock, ports, gh, Supabase env (`-Fix`, `-Json`) |
| [`load-worktree-ports.ps1`](../scripts/load-worktree-ports.ps1) | Dot-source `.worktree-ports.env` into current pwsh session |
| [`agent-workspace-tmux.sh`](../scripts/agent-workspace-tmux.sh) | WSL/Linux tmux dashboard: `status`, `layout`, `attach` |
| [`vibe-session-finish.ps1`](../scripts/vibe-session-finish.ps1) | Session end: sync, group, pre-commit, commit, push, PR to `dev` |

List all worktrees:

```powershell
.\scripts\list-worktrees.ps1
```

Remove when merged:

```powershell
.\scripts\remove-agent-worktree.ps1 -Path "C:\Users\...\Monorepo_ModMe-dev\dev-agent-cursor-auth-fix"
# Optional: -DeleteBranch after merge
```

---

## Environment secrets

Copied **by name only** from the main checkout (never committed):

- `.env` (repo root)
- `GenerativeUI_monorepo/apps/agent-server/.env`
- `GenerativeUI_monorepo/apps/web-dashboard/.env.local`

Use `.env.example` for required variable **names**.

---

## Git workflow

Mirror [UniversalWorkbench GIT_WORKFLOW](../GenerativeUI_monorepo/UniversalWorkbench/docs/GIT_WORKFLOW.md):

1. Feature branches: `feature/<owner>/<task>` off `dev`
2. Commit in the worktree
3. Open PR to `dev` (not `main`)
4. After merge: remove worktree with `remove-agent-worktree.ps1`
5. **Never** merge/rebase manually across worktrees

Main checkout is for review, merge, and release — not active feature development.

### Main checkout policy

Agents and humans should **not** implement features in `Monorepo_ModMe/` (the main checkout). Use a worktree under `../Monorepo_ModMe-dev/` instead.

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

cd ..\Monorepo_ModMe-dev\dev-agent-cursor-my-task
yarn vibe:finish
```

The script stashes all changes (including untracked), creates the worktree via `new-agent-worktree.ps1`, then `git stash pop` in the new folder. On failure it attempts to restore the stash on main.

Use `-DryRun` to preview steps without mutating Git.

---

## Working directory matrix (human + agents)

Run commands from the **correct checkout and folder**. Wrong cwd is the most common terminal failure in shared codespaces.

| Goal | Checkout | Directory | Command |
|------|----------|-----------|---------|
| Feature implementation | worktree under `Monorepo_ModMe-dev/` | worktree root | `yarn worktree:ensure` then edit |
| Pre-flight / fix yarn in worktree | worktree | worktree root | `yarn worktree:doctor` / `yarn worktree:doctor:fix` |
| Load dev ports | worktree | worktree root | `. .\scripts\load-worktree-ports.ps1` |
| next-forge dev / verify | worktree | **repo root** | `yarn dev:forge:core`, `yarn verify:forge` |
| next-forge package scripts | worktree | `next-forge/` | `npx bun run …` (Bun, not root yarn) |
| Prisma / database package | worktree | `next-forge/packages/database/` | `npx bun run db:push` (needs `.env` there) |
| Root intake / catalogue | worktree | **repo root** | `yarn intake` (needs root `.env` Supabase vars) |
| Supabase CLI status | worktree | `next-forge/` | `npx bunx supabase status -o env` |
| Session finish (commit/PR) | worktree | worktree root | `.\scripts\vibe-session-finish.ps1` (prefer over `yarn vibe:finish` if yarn.lock missing) |
| Review / merge only | main `Monorepo_ModMe/` | main root | no feature edits |

**Package managers:** root = Yarn 3; `next-forge/` = Bun. Never run `yarn install` inside `next-forge/` or `bun install` at repo root.

---

## Agent-friendly CLI contract

Scripts follow [cli-for-agents](https://github.com/cursor/plugins/tree/main/cli-for-agents) patterns: flags first, layered `--help`, dry-run, machine output where useful.

| Script | Non-interactive flags | Help |
|--------|----------------------|------|
| `ensure-worktree.ps1` | `-WarnOnly` | `-Help` |
| `migrate-main-to-worktree.ps1` | `-DryRun` | `-Help` |
| `worktree-doctor.ps1` | `-Fix`, `-Json`, `-Quiet` | `-Help` |
| `vibe-session-finish.ps1` | `-DryRun`, `-Yes`, `-CommitMessage`, `-Push`, `-CreatePr` | `-Help` |
| `remove-agent-worktree.ps1` | `-Yes`, `-Force` | `-Help` |

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

Windows pwsh: use `worktree-doctor` + `list-worktrees.ps1` instead (tmux optional via WSL).

---

## LSP multiplexing (lspmux)

Worktrees share **one lspmux daemon per machine**, not one language-server process for all folders.

| Layer | Scope | Notes |
|-------|-------|-------|
| **lspmux daemon** | One per machine (login session) | Listens on `127.0.0.1:27631`; started outside worktrees — see [`docs/lspmux-setup.md`](./lspmux-setup.md) |
| **Language-server instance** | One per unique workspace path | Each worktree path gets its own rust-analyzer (or other) instance behind the daemon |
| **Editor clients** | Per IDE window | Cursor + VS Code on the **same checkout** share one instance; different worktrees do **not** |

This is **correct behavior**, not a bug. lspmux keys instances on `(workspaceFolders, environment)`. Worktrees live at different paths and often different branch contents — sharing one LSP instance across them would produce **wrong diagnostics**.

### What worktree bootstrap does

[`scripts/worktree-copy-env.ps1`](../scripts/worktree-copy-env.ps1) (called from `new-agent-worktree.ps1` and Cursor setup):

1. Copies `rust-analyzer.server.path` / `rust-analyzer.server.extraEnv` from the main checkout [`.vscode/settings.json`](../.vscode/settings.json) when present, otherwise applies repo defaults (`lspmux` shim → `rust-analyzer`).
2. Leaves unrelated editor settings untouched.

[`scripts/worktree-allocate-ports.ps1`](../scripts/worktree-allocate-ports.ps1) writes `LSPMUX_CONNECT=127.0.0.1:27631` into `.worktree-ports.env`. Load it with [`. .\scripts/load-worktree-ports.ps1`](../scripts/load-worktree-ports.ps1) so terminals and tools can reach the daemon.

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| No Rust diagnostics in a worktree | Confirm daemon: `.\scripts\lspmux\status.ps1` or `yarn lspmux:status` |
| Stale diagnostics after branch switch or large refactor | `lspmux reload <workspace-path>` for that worktree folder |
| Multiple RA processes on **same** checkout | Check `pass_environment` in lspmux config — see [`docs/lspmux-setup.md`](./lspmux-setup.md) |
| Worktree shows wrong types from another branch | Expected if instances were incorrectly shared — each worktree must keep its own instance; reload after switching worktrees |
| Daemon not running | `yarn lspmux:start` or `.\scripts\lspmux\start-daemon.ps1`; `yarn worktree:doctor` warns when unreachable |

Do **not** expect lspmux to share LSP state across worktrees. For cross-branch semantic search, use the inbox-pipeline / agent tooling instead of IDE LSP.

---

## IDE settings

[`.vscode/settings.json`](../.vscode/settings.json) includes worktree and LSP baseline settings:

```json
{
  "cursor.worktreeMaxCount": 25,
  "cursor.worktreeCleanupIntervalHours": 6,
  "rust-analyzer.server.path": "${env:USERPROFILE}\\.cargo\\bin\\lspmux.exe",
  "rust-analyzer.server.extraEnv": {
    "LSPMUX_SERVER": "${env:USERPROFILE}\\.cargo\\bin\\rust-analyzer.exe"
  }
}
```

New worktrees receive the lspmux-related keys via `worktree-copy-env.ps1`. Install and daemon setup: [`docs/lspmux-setup.md`](./lspmux-setup.md).

Agent terminals should respect `.worktree-ports.env` when starting dev servers.

---

## Cleanup

| Action | When |
|--------|------|
| `remove-agent-worktree.ps1` | Task merged or abandoned |
| `git worktree prune` | Orphaned worktree metadata |
| Cursor auto-cleanup | Every 6 hours; max 25 Cursor-managed worktrees |

**Disk note:** Each worktree has its own `node_modules` and poetry venv (~GB each). Prune stale folders regularly.

---

## Canvas sharing (review)

For multi-agent review of audit/report artifacts, see [Cursor canvas sharing](https://cursor.com/docs/agent/tools/canvas#sharing-canvases). Orthogonal to worktrees but useful when publishing findings to teammates.

---

## Daily workflow checklist

1. **Once:** `.\scripts\init-worktrees.ps1`
2. **Per task:** `.\scripts\new-agent-worktree.ps1 -Name "<task>" -Owner <ide>`
3. **Cursor:** Agents Window or `/worktree`
4. **Other IDEs:** File → Open Folder → worktree path
5. **Verify:** `yarn worktree:doctor`, load ports, run targeted lint / tests
6. **Finish:** `.\scripts\vibe-session-finish.ps1` → PR to `dev` → `remove-agent-worktree.ps1 -Yes`

---

## Related docs

- [`docs/lspmux-setup.md`](./lspmux-setup.md) — shared LSP multiplexer (Cursor + VS Code)
- [`AGENTS.md`](../AGENTS.md) — agent quick-start
- [`docs/agent-tech-guide.md`](./agent-tech-guide.md) — section 11
- [`.cursor/rules/multi-agent-worktrees.mdc`](../.cursor/rules/multi-agent-worktrees.mdc) — always-on rule
- [`docs/debug-launch-guide.md`](./debug-launch-guide.md) — main-checkout launch.json
