# C4 Component — worktree orchestration

## Responsibility

Isolated Git worktrees with port offsets for parallel agents; doctor + session envelopes.

## Location

- Scripts: `scripts/new-agent-worktree.ps1`, `scripts/worktree-doctor.ps1`, `scripts/load-worktree-ports.ps1`
- Docs: `docs/multi-agent-worktrees.md`
- Envelopes: `logs/agent-orchestrator/sessions/`

## Evidence

- `.cursor/rules/multi-agent-worktrees.mdc`
- `yarn agent:status`, `yarn e2e:worktree-smoke`
