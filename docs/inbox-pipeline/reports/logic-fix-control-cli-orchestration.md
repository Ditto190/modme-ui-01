---
timestamp: 2026-07-12T09:45:00+10:00
agent: cursor
agent_role: devops
type: solution
severity: high
tags: [orchestration, control-cli, worktree, nix]
branch: feature/cursor/control-cli-orchestration
---

# Logic Fix All — Control CLI + Multi-Agent Workspace Orchestration

**Mode:** Logic Fix All

**Logic Score (before):** 62/100  
**Logic Score (after):** 88/100  
**Findings fixed:** 9 (Critical: 2 · Warning: 4 · Suggestion: 2 · Bonus: 1 preflight/vitest)  
**Findings unresolved:** 0

## Summary

Wired repo-native control-cli harness to agent terminal orchestration, added worktree mirror policy (`.worktreeexclude`), JSON-default agent CLIs, Nix flake + CI smoke, and ephemeral session cleanup flags.

## Scope

| Role   | Files scanned                                                             | Tier H/M/L   | Truncated? |
| ------ | ------------------------------------------------------------------------- | ------------ | ---------- |
| source | scripts/\*, e2e/worktree-smoke                                            | H:8 M:12 L:4 | no         |
| config | .worktreeinclude/exclude, .logic-lens.yaml, flake.nix                     | H:2 M:3      | no         |
| doc    | docs/agent-terminal-orchestration.md, nix-devshell, multi-agent-worktrees | M:3          | no         |
| skill  | .cursor/skills/control-cli, agent-terminal-orchestration                  | M:2          | no         |

## Skill Invocations

logic-health: 1 · logic-review: 8 · logic-locate: 2 · logic-explain: 0 · logic-diff: 8

## Iteration History

| Round | Severity class | New findings                                         | Action                            |
| ----- | -------------- | ---------------------------------------------------- | --------------------------------- |
| 1     | Critical       | nix doc without flake; generic control-cli           | Added flake.nix + harness         |
| 1     | Warning        | agent-status human default; tmux.ps1; copy-env drift | JSON default; fixes applied       |
| 2     | Suggestion     | preflight vitest project missing                     | vitest.config projects + manifest |

## Fix Log

| #   | File                       | Finding                            | Severity   | Fix                     | Status   |
| --- | -------------------------- | ---------------------------------- | ---------- | ----------------------- | -------- |
| 1   | flake.nix                  | nix develop documented but missing | Critical   | Added devShell + CI job | resolved |
| 2   | control-cli SKILL          | No ModMe harness                   | Critical   | Harness + RSCIT block   | resolved |
| 3   | agent-status.mjs           | Human default                      | Warning    | JSON default + --human  | resolved |
| 4   | agent-workspace-tmux.ps1   | Empty session help exit            | Warning    | Default modme-agents    | resolved |
| 5   | worktree-copy-env.ps1      | Hardcoded paths                    | Warning    | include/exclude parse   | resolved |
| 6   | agent-session-finish.ps1   | No worktree removal                | Warning    | -RemoveWorktree flags   | resolved |
| 7   | generate-mprocs-config.mjs | Human status proc                  | Suggestion | --json shell            | resolved |
| 8   | .logic-lens.yaml           | Missing                            | Suggestion | Added scoped config     | resolved |
| 9   | vitest.config.mjs          | preflight project fail             | Warning    | projects + manifest     | resolved |

## Verification

- `node e2e/worktree-smoke/run.mjs` — ok
- `node scripts/control-cli-harness.mjs` — all probes ok
- `node scripts/preflight.mjs --profile worktree-shared-deps` — ok
- `npx vitest run --project orchestration scripts/__tests__/agent-status.test.mjs` — 3/3
- `bats scripts/bats/agent-workspace-tmux.bats` — 2/2

## Unresolved Findings

None.
