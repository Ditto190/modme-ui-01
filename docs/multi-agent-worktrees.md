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
4. Copy `.env` files from `ROOT_WORKTREE_PATH` (main checkout)
5. `poetry install` in `apps/agent-server/`
6. Optional `lean-ctx doctor` (non-fatal)
7. Git pre-commit hook install (`scripts/install-git-hooks.ps1`)

Debug setup failures: **Output → Worktrees Setup**.

### End of session

When finishing a prototype session:

```powershell
yarn check:forge                    # fast next-forge lint during iteration
yarn verify:forge                   # full CI parity before opening PR
.\scripts\vibe-session-finish.ps1   # group → pre-commit → commit → push → PR to dev
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

Example (slot 3): dashboard `3031`, agent server `8030`.

### Loading ports before dev

**PowerShell:**

```powershell
Get-Content .worktree-ports.env | ForEach-Object {
  if ($_ -match '^([A-Z_]+)=(.+)$') { Set-Item -Path "env:$($Matches[1])" -Value $Matches[2] }
}

# Then start services with worktree ports, e.g.:
$env:PORT = $env:WEB_DASHBOARD_PORT
cd GenerativeUI_monorepo/apps/web-dashboard
yarn dev
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
| [`worktree-copy-env.ps1`](../scripts/worktree-copy-env.ps1) | Copy `.env` by name from main checkout |

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

---

## IDE settings

[`.vscode/settings.json`](../.vscode/settings.json):

```json
{
  "cursor.worktreeMaxCount": 25,
  "cursor.worktreeCleanupIntervalHours": 6
}
```

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
5. **Verify:** load ports, run targeted `yarn lint` / tests
6. **Finish:** commit → PR to `dev` → `remove-agent-worktree.ps1`

---

## Related docs

- [`AGENTS.md`](../AGENTS.md) — agent quick-start
- [`docs/agent-tech-guide.md`](./agent-tech-guide.md) — section 11
- [`.cursor/rules/multi-agent-worktrees.mdc`](../.cursor/rules/multi-agent-worktrees.mdc) — always-on rule
- [`docs/debug-launch-guide.md`](./debug-launch-guide.md) — main-checkout launch.json
