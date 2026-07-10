# Contribution Guide (ModMe dual-monorepo)

## Where to work

- **Never** commit feature work from the main `Monorepo_ModMe` checkout.
- Use an isolated worktree: `.\scripts\new-agent-worktree.ps1 -Name "<task>" -Owner cursor`
- Open PRs targeting **`dev`**, not `main`.

See [docs/multi-agent-worktrees.md](../../docs/multi-agent-worktrees.md).

## Package managers (do not mix)

| Path | Manager |
|------|---------|
| Repo root | Yarn 3.3 (orchestration) |
| `next-forge/` | Bun |
| `GenerativeUI_monorepo/` | Yarn 3.3 |

## Verification before PR

```powershell
yarn worktree:doctor          # pre-flight in worktree
yarn verify:forge             # when next-forge paths changed
yarn verify:generative        # when GenerativeUI paths changed
yarn pre-commit:check         # hook parity
```

## Session finish (agents)

```powershell
.\scripts\agent-session-finish.ps1 -VerifyStack -Yes -CommitMessage "feat: ..." -Push -CreatePr
yarn beads:push               # if beads issue linked
```

## Issue labels

Use stack labels (`stack:forge`, `stack:generative`, `stack:root`, `stack:orchestration`). See [LABELS.md](./LABELS.md).

## PR body fields

- **Stack:** forge | generative | root | orchestration
- **Beads:** modme-xxxx (if multi-session)
- **Agent citizen:** (from polis router)
- **Verify:** commands run locally

## Git hooks

Install once: `yarn hooks:install`

Hooks enforce: main/master guard, path-filtered verify, conventional commit warnings.
