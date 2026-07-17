---
name: modme-worktree-orchestration
description: 'ModMe multi-agent worktree bootstrap, port isolation, session finish, and verify matrix. Use when creating worktrees, bootstrapping .worktrees/dev, running yarn worktree:doctor, workspace:bootstrap, vibe-session-finish, or verify:forge/generative from an agent checkout.'
---

# ModMe Worktree Orchestration

## When to Use

- User asks to create, bootstrap, or validate a Git worktree
- Agent starts feature work and must not use the main checkout
- Session end: commit, push, PR to `dev`
- Pre-flight before `yarn dev:*` or `yarn verify:*`

## Checkout policy

**Never** implement features in `Monorepo_ModMe/` (main checkout). Use `.worktrees/dev` or `.worktrees/dev-agent-<owner>-<task>/`.

```powershell
yarn worktree:ensure   # exits 1 on main checkout
```

## Bootstrap

| Command | Scope |
|---------|-------|
| `yarn workspace:bootstrap` | Full install (`.worktrees/dev` first time) |
| `yarn workspace:bootstrap:shared` | Junction shared `node_modules` from dev/main + hooks |
| `yarn workspace:bootstrap:lite` | Ports + env only |
| `.\scripts\init-worktrees.ps1` | Creates `.worktrees/dev` + bootstrap (full or shared) |
| `.\scripts\new-agent-worktree.ps1 -Name task -Owner cursor` | Agent worktree + **shared-deps** bootstrap (default) |
| `yarn worktree:relink-deps` | Remove local deps + junction-link all agent worktrees to `.worktrees/dev` |
| `yarn preflight:worktree` | Contract tests + worktree smoke |

Cursor Agents Window uses [`.cursor/setup-worktree-windows.ps1`](../../../.cursor/setup-worktree-windows.ps1) → `Invoke-WorktreeBootstrap -SharedDeps` (not full install per agent).

Migration for bloated worktrees: `yarn worktree:relink-deps`. Preflight: `yarn preflight:worktree`.

Set `ROOT_WORKTREE_PATH` to the main checkout when bootstrapping from a script outside Cursor:

```powershell
$env:ROOT_WORKTREE_PATH = "C:\Users\dylan\Monorepo_ModMe"
cd C:\Users\dylan\Monorepo_ModMe\.worktrees\dev
yarn workspace:bootstrap
```

## Ports

```powershell
. .\scripts\load-worktree-ports.ps1   # or: yarn worktree:ports
yarn dev:forge:core
```

## Verify matrix (from worktree root)

```powershell
yarn worktree:doctor
yarn lint:harness
yarn pre-commit:check --full
yarn verify:forge
yarn verify:generative
# or: yarn verify:all
```

## Session finish

```powershell
yarn agent:session:start
yarn agent:status
yarn worktree:session:end -VerifyStack -Yes -CommitMessage "feat(scope): summary" -Push -CreatePr
# After merge — remove agent worktree folder:
yarn worktree:session:end -RemoveWorktree -Yes
```

`worktree-session-end.ps1` wraps `agent-session-finish`, `vibe-session-finish`, and optional `remove-agent-worktree.ps1`.

## Shared dependencies (disk)

Agent worktrees default to **shared-deps** mode:

- Windows junctions to `.worktrees/dev` or main checkout when lockfiles match
- Yarn `nmMode: hardlinks-global` (root + GenerativeUI)
- Bun global cache for next-forge fallback installs
- Use `-FullBootstrap` only when lockfiles diverge or junctions fail

## Gotchas

- **Package managers:** root = Yarn 3; `next-forge/` = Bun only
- **Env copy:** secrets copied by name from main checkout; never commit `.env`
- **PR target:** `dev`, not `main`
- **Lite agent worktrees:** use `yarn workspace:bootstrap:shared` if junctions were skipped
- **Never remove** `.worktrees/dev` with `-RemoveWorktree` (script refuses)

## References

- [`docs/multi-agent-worktrees.md`](../../../docs/multi-agent-worktrees.md)
- [`scripts/lib/worktree-bootstrap.ps1`](../../../scripts/lib/worktree-bootstrap.ps1)
- [`collections/multi-agent-worktrees.collection.yml`](../../../collections/multi-agent-worktrees.collection.yml)
