---
name: control-cli
description: Build or adapt a local harness to drive, inspect, and profile an interactive CLI or TUI without external services. Use for CLI UX checks, startup regressions, memory leaks, hangs, prompt flows, or terminal demos.
---

# Control CLI

Use a repeatable local harness to exercise an interactive CLI instead of poking at it manually. **In ModMe, prefer the repo-native harness first** (see below); fall back to tmux/PTY only when no checked-in probe exists.

## ModMe harness (primary)

| Probe  | Command                                               | Ready signal                             |
| ------ | ----------------------------------------------------- | ---------------------------------------- |
| All    | `yarn harness:control-cli`                            | JSON `ok: true`                          |
| Status | `node scripts/control-cli-harness.mjs --probe=status` | `"repoRoot"` in JSON                     |
| mprocs | `node scripts/control-cli-harness.mjs --probe=mprocs` | `procs:` in YAML                         |
| Smoke  | `node scripts/control-cli-harness.mjs --probe=smoke`  | `worktree-smoke: ok`                     |
| tmux   | `node scripts/control-cli-harness.mjs --probe=tmux`   | `git worktree list` (skipped if no bash) |

**Windows:** `.\scripts\control-cli-harness.ps1` or `yarn harness:control-cli`

**Nix (WSL/Linux):** `nix develop -c yarn harness:control-cli`

Cross-link: [agent-terminal-orchestration](../agent-terminal-orchestration/SKILL.md) for session lifecycle and mprocs TUI.

## Agent prompt (RSCIT)

**Role:** Terminal harness operator for ModMe worktrees.

**Situation:** Multi-agent workspaces under `.worktrees/` with port slots and mprocs dev stack.

**Constraints:** Never send secrets; use JSON probes; load ports before `yarn dev:*`; work only in worktrees for feature commits.

**Instructions:** Run `yarn harness:control-cli`; on failure read probe `output`; fix orchestration scripts; re-run `yarn e2e:worktree-smoke`.

**Template:** Report `{ probe, ok, exitCode }` per failed probe; suggest next command from table above.

## Harness loop

1. Identify the command under test and the smallest reproducible workspace (worktree path).
2. Discover existing local harnesses: `yarn harness:control-cli`, `yarn e2e:worktree-smoke`, `scripts/bats/`.
3. If no harness exists, launch the CLI in an isolated terminal session with deterministic env vars.
4. Capture the current screen before interacting.
5. Send one action at a time: text, Enter, arrows, Escape, Ctrl-C, resize.
6. Wait for a concrete screen pattern or prompt before the next action.
7. Save the transcript and any profile artifacts.
8. Kill the session cleanly.

## Harness options

- **Repo-native:** `scripts/control-cli-harness.mjs`, `e2e/worktree-smoke/run.mjs`, `yarn agent:status --json`
- **mprocs (Windows primary):** `yarn agent:tui` after `yarn agent:mprocs:generate`
- **tmux (WSL/Git Bash):** `yarn worktree:tmux` / `scripts/agent-workspace-tmux.sh`
- **PTY probe:** short Python script when tmux unavailable (keep in `/tmp` unless promoting to repo)
- **Runtime inspector:** Node/Bun `--inspect` for CPU/heap profiles

## Minimal tmux harness

```bash
SESSION="cli-harness-$(date +%s)"
tmux new-session -d -s "$SESSION" -- <command-under-test>
tmux capture-pane -pt "$SESSION"
tmux send-keys -t "$SESSION" "help" Enter
tmux capture-pane -pt "$SESSION"
tmux kill-session -t "$SESSION"
```

## Guardrails

- Prefer deterministic waits over sleeps.
- Do not send credentials or destructive commands into a controlled session.
- Keep temporary harnesses in `/tmp` unless promoting to `scripts/`.
- Do not hard-code paths from another repository.
- Clean up tmux sessions and inspector processes unless asked to keep them.
