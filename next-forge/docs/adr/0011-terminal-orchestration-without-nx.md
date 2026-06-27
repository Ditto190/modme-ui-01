# ADR-0011: Agent terminal orchestration without Nx

**Status**: Accepted  
**Date**: 2026-06-27  
**Supersedes**: N/A (rejects Nx as root meta-orchestrator for ModMe)

## Context

ModMe is a **dual monorepo** workspace:

- `next-forge/` — Turborepo + Bun (`@repo/*`)
- `GenerativeUI_monorepo/` — Yarn 3.3 Turborepo (legacy agent stack)

Parallel AI agents already use **Git worktrees** for isolation (`docs/multi-agent-worktrees.md`). A proposal emerged to add **Nx** as a unified root orchestrator for multi-agent collaboration, smart-git, beads, tracing, and E2E.

Constraints:

- Must not merge workspace lockfiles or `workspace:*` across the two monorepos
- Windows-friendly terminal tooling (primary dev OS)
- Existing Turbo/Bun/Yarn scripts remain source of truth per stack
- Agents need durable task memory (beads), session correlation, and QA gates before PR

## Decision Drivers

* **Preserve monorepo boundaries** — forbidden cross-imports and lockfile merges
* **Multi-agent isolation** — worktrees, port slots, branch naming already solved
* **Observability** — session envelopes, agenttrace, session-logger, lean-ctx diary
* **Low migration cost** — no Nx install, no graph migration, no duplicate task runners
* **Human terminal UX** — live logs, restart, keybindings on Windows

## Considered Options

### Option 1: Nx root workspace

Unified `nx.json` at repo root; projects for next-forge, GenerativeUI, scripts; `nx run-many` for verify/dev.

**Pros**:

- Single task graph and dependency visualization
- Familiar to teams using Nx elsewhere
- Built-in affected commands

**Cons**:

- Third orchestration layer on top of two existing Turborepos
- High setup cost; risk of fighting Bun vs Yarn boundaries
- Does not replace worktree isolation (still required for parallel agents)
- Windows + nested monorepo edge cases

### Option 2: Terminal / TUI control plane (chosen)

Keep Turbo/Bun/Yarn inside each monorepo. Add a **repo-root orchestration layer**:

- **mprocs** TUI generated from `launch-manifest.json` + `.worktree-ports.env`
- **Session envelopes** (`agent-session-start.ps1` / `agent-session-finish.ps1`)
- **Beads** (`modme` prefix) for durable task memory
- **Task registry** (`data/agent-registry.json`) for duplicate/path claims
- **Path-filtered verify** on pre-push and `-VerifyStack` session finish
- **agenttrace** audit via `yarn agent:audit`

**Pros**:

- Zero change to inner monorepo task runners
- mprocs works on Windows without WSL
- Composes with existing worktree, smart-git, and hooks scripts
- Incremental adoption (`yarn agent:status`, `yarn e2e:worktree-smoke`)

**Cons**:

- mprocs is a separate binary (`cargo install mprocs` or release binary)
- No unified Nx-style project graph at root
- Pre-push verify can be slow on large forge/generative diffs

### Option 3: tmux-only orchestration

Extend `agent-workspace-tmux.sh` as sole control plane.

**Pros**: Familiar on Linux/macOS  
**Cons**: Poor Windows native story; superseded by mprocs as primary, tmux kept as optional (`yarn worktree:tmux`)

## Decision

We will **not adopt Nx** at the ModMe root. We will implement **Option 2: Agent Terminal Orchestration Layer** documented in `docs/agent-terminal-orchestration.md`.

## Rationale

Worktrees already provide **isolation**; beads and session envelopes provide **memory**; mprocs provides **human visibility**. Nx would add a parallel task graph without removing the need for worktrees or beads, while risking boundary violations between Bun and Yarn stacks.

## Consequences

### Positive

- `yarn agent:tui`, `yarn agent:status`, `yarn agent:session:*` available at root
- Session JSON under `logs/agent-orchestrator/sessions/`
- CI `worktree-smoke` job (paths-filtered, `continue-on-error: true`)
- lean-ctx task profiles: `agent-orchestration`, `forge-work`, `generative-work`, `session-audit`
- Git hooks: block commits on `main`/`master` in worktrees; path-filtered pre-push verify

### Negative

- Operators must install **mprocs** separately for TUI
- Two mental models: Turbo inside monorepos + root `yarn agent:*`
- Task registry is JSON file, not beads-native (by design for path claims)

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| mprocs missing on PATH | `agent:mprocs:generate` works without it; docs state install path |
| Slow pre-push verify | Path-filter mirrors CI; `--no-verify` only when intentional |
| beads/dolt commit noise | smart-git excludes `.beads/embeddeddolt` from default staging |
| Agent skips worktree guard | `ensure-worktree.ps1`, pre-commit main-branch block |

## Implementation

| Artifact | Path |
|----------|------|
| Canonical guide | `docs/agent-terminal-orchestration.md` |
| Cursor skill | `.cursor/skills/agent-terminal-orchestration/SKILL.md` |
| mprocs generator | `scripts/generate-mprocs-config.mjs` |
| Session scripts | `scripts/agent-session-start.ps1`, `agent-session-finish.ps1` |
| E2E smoke | `yarn e2e:worktree-smoke` → `e2e/worktree-smoke/run.mjs` |
| Cursor commands | `.cursor/commands/beads.md`, `architecture-decision-records.md` |

Key commands:

```powershell
yarn agent:session:start
yarn agent:tui
yarn agent:status
yarn e2e:worktree-smoke
.\scripts\agent-session-finish.ps1 -VerifyStack
```

## Related Decisions

- **ADR-0009**: Inbox data contract — orthogonal; intake scripts respect root env loading
- **ADR-0010**: Dual-store knowledge intake — GreptimeDB + Supabase; orchestration does not change stores
- **Worktrees doc**: `docs/multi-agent-worktrees.md` — isolation layer beneath orchestration

## References

- Plan (do not edit): `.cursor/plans/agent_terminal_orchestration_fff9aa5f.plan.md`
- [`docs/agent-terminal-orchestration.md`](../../../docs/agent-terminal-orchestration.md)
- [`docs/beads-workflow.md`](../../../docs/beads-workflow.md)
- [mprocs](https://github.com/pvolok/mprocs)
