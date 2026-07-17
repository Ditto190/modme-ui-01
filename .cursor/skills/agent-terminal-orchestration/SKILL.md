---
name: agent-terminal-orchestration
description: Session envelopes, mprocs TUI, agent status/audit, task registry, and git hook QA gates for ModMe worktrees. Use when starting or finishing agent sessions, launching dev stacks, or debugging worktree orchestration.
---

# Agent Terminal Orchestration

## When to use

- Starting work in a **worktree** (after `new-agent-worktree.ps1` or Cursor setup)
- Launching **multi-process dev** (forge + generative + agent-server)
- **Ending a session** with beads + commit/PR workflow
- **CI-style verify** before push (`-VerifyStack`, pre-push hook)
- **Probing orchestration** with `yarn harness:control-cli`

## Session lifecycle

```powershell
# Start (or rely on Cursor setup-worktree-windows.ps1)
yarn agent:session:start --% -TaskTitle "my task" -ClaimPaths "next-forge/apps/app"

. .\scripts\load-worktree-ports.ps1
yarn harness:control-cli    # deterministic probes (JSON default)
yarn agent:tui
yarn agent:status --json

# Finish (ephemeral worktree — push then remove)
.\scripts\agent-session-finish.ps1 -VerifyStack -Yes -CommitMessage "feat(scope): summary" -Push -CreatePr -RemoveWorktree -DeleteBranch
```

## Key commands

| Command                                   | Purpose                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `yarn harness:control-cli`                | Orchestration probe harness (status, mprocs, smoke, tmux)                  |
| `yarn agent:tui`                          | mprocs dev stack (run `yarn agent:mprocs:generate` first if ports changed) |
| `yarn agent:status`                       | Worktree + ports + doctor (JSON default)                                   |
| `yarn agent:status --human`               | Human-readable status                                                      |
| `yarn agent:audit`                        | agenttrace + status → inbox report                                         |
| `yarn hooks:install`                      | pre-commit + pre-push + commit-msg                                         |
| `yarn worktree:doctor`                    | Pre-flight (also embedded in agent:status)                                 |
| `nix develop -c yarn harness:control-cli` | Reproducible toolchain smoke (WSL/Linux)                                   |

## Rules

1. **Never commit on main** — pre-commit blocks; use worktrees under `.worktrees/`.
2. **Load ports** before `yarn dev:*` in worktrees: `. .\scripts\load-worktree-ports.ps1`.
3. **Regenerate mprocs** after port reallocation: `yarn agent:mprocs:generate`.
4. **VerifyStack** uses same path filters as CI (`next-forge/**`, `GenerativeUI_monorepo/**`).
5. Session envelopes live in `logs/agent-orchestrator/sessions/` (gitignored).
6. **Bootstrap mirror:** `.worktreeinclude` copies runtime files; `.worktreeexclude` keeps dev-branch config (e.g. `.editorconfig`).
7. **Ephemeral sessions:** `-RemoveWorktree -DeleteBranch` after successful `-Push`.

## References

- Canonical doc: [`docs/agent-terminal-orchestration.md`](../../docs/agent-terminal-orchestration.md)
- Control CLI harness: [`.cursor/skills/control-cli/SKILL.md`](../control-cli/SKILL.md)
- Worktrees: [`docs/multi-agent-worktrees.md`](../../docs/multi-agent-worktrees.md)
- Nix devShell: [`docs/nix-devshell.md`](../../docs/nix-devshell.md)
- Beads: [`docs/beads-workflow.md`](../../docs/beads-workflow.md)
- Smart git finish: [`.agents/skills/smart-git-automation/SKILL.md`](../../.agents/skills/smart-git-automation/SKILL.md)

## Optional skills (skills.sh)

- `terminal-control` — richer TTY automation
- `dmux-workflows` — tmux session patterns

Install only when needed: `npx skills find terminal orchestration`

## lean-ctx profiles

Repo `.lean-ctx.toml` defines `[task_profiles.*]`:

- `agent-orchestration` — session start/finish, status commands
- `forge-work` / `generative-work` — stack-scoped context
- `session-audit` — post-session audit runs

Run `yarn lean-ctx:ensure` before long sessions.
