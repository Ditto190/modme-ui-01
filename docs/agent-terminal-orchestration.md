# Agent Terminal Orchestration Layer

Canonical guide for **session envelopes**, **mprocs TUI**, **task registry**, **trace QA gates**, and **git hook extensions** in ModMe worktrees.

## Overview

| Layer | Scripts | Purpose |
|-------|---------|---------|
| **TUI** | `yarn agent:tui`, `yarn agent:mprocs:generate` | Multi-process dev stack via [mprocs](https://github.com/pvolok/mprocs) |
| **Status** | `yarn agent:status` | JSON/text worktree + ports + doctor summary |
| **Session** | `agent-session-start.ps1`, `agent-session-finish.ps1` | Beads link, `AGENT_SESSION_ID`, envelope JSON |
| **Audit** | `yarn agent:audit` | agenttrace doctor/overview → `docs/inbox-pipeline/reports/agent-sessions-latest.md` |
| **Registry** | `scripts/lib/agent-task-registry.mjs` | Duplicate task + path claim detection (`data/agent-registry.json`) |
| **Hooks** | `.githooks/pre-commit`, `pre-push`, `commit-msg` | main/master guard, path-filtered verify, conventional commit warn |

See also: [`docs/multi-agent-worktrees.md`](multi-agent-worktrees.md), [`.cursor/skills/agent-terminal-orchestration/SKILL.md`](../.cursor/skills/agent-terminal-orchestration/SKILL.md).

---

## Quick start (worktree)

```powershell
# After new-agent-worktree.ps1 or Cursor setup-worktree-windows.ps1:
. .\scripts\load-worktree-ports.ps1
yarn agent:session:start -TaskTitle "auth fix" -ClaimPaths "next-forge/apps/app"
yarn agent:tui          # requires mprocs on PATH
yarn agent:status       # human-readable
yarn agent:status --json  # CI/agents

# End session:
.\scripts\agent-session-finish.ps1 -VerifyStack -Yes -CommitMessage "feat: ..." -Push -CreatePr
```

Cursor worktree bootstrap calls `agent-session-start.ps1` automatically and prints `yarn agent:tui`.

---

## mprocs TUI

`scripts/generate-mprocs-config.mjs` reads:

- `scripts/launch-manifest.json` — base ports
- `.worktree-ports.env` — slot offsets (worktrees)

Output: `mprocs.yaml` (gitignored; regenerate per checkout).

```powershell
yarn agent:mprocs:generate
yarn agent:tui   # generate + mprocs -c mprocs.yaml
```

Default procs: `forge-core`, `generative-stack`, `agent-server`, `forge-docs`, `worktree-doctor`, `agent-status`.

Install mprocs: `cargo install mprocs` or see upstream releases.

---

## Session envelope

Each session writes:

```
logs/agent-orchestrator/sessions/<uuid>.json
```

Fields: `session_id`, `started_at`, `repo_root`, `branch`, `task_title`, `paths`, `beads_issue`, `status`.

Environment: `$env:AGENT_SESSION_ID` set on start.

**agent-session-start.ps1**

- `npx @beads/bd ready` (non-fatal)
- Optional `-TaskTitle`, `-BeadsIssueId`, `-ClaimPaths`, `-SkipBeads`
- Task registry duplicate/path conflict check
- `lean-ctx agent diary` (non-fatal)

**agent-session-finish.ps1**

- Updates envelope `status: finished`
- `agenttrace --latest` (non-fatal)
- Beads `done` update
- `yarn agent:audit` report
- Wraps `vibe-session-finish.ps1` (pass-through flags including `-VerifyStack`)

---

## Task registry

JSON store: `data/agent-registry.json` (gitignored).

Functions in `scripts/lib/agent-task-registry.mjs`:

- `findSimilarTasks(title)` — Jaccard word similarity ≥ 0.65
- `findPathConflicts(paths)` — prefix overlap on active tasks
- `registerTask`, `updateTask`

CLI check: `scripts/lib/agent-task-registry-check.mjs` (used by session start).

---

## Trace & QA gates

| Command | Behavior |
|---------|----------|
| `yarn agent:audit` | agenttrace doctor + overview + agent-status → markdown report |
| `-VerifyStack` on vibe/agent finish | `scripts/lib/run-verify-stack.mjs` → `verify:forge` / `verify:generative` by path filter |
| `pre-push` hook | `scripts/pre-push-checks.mjs` — same path logic as CI |

Errors append to `logs/agent-orchestrator/errors.jsonl`.

Path filters mirror `.github/workflows/ci.yml` (`scripts/lib/path-filter.mjs`):

- `next-forge/**` → forge
- `GenerativeUI_monorepo/**` → generative

---

## Git hooks

Install all hooks:

```powershell
yarn hooks:install
```

| Hook | Behavior |
|------|----------|
| **pre-commit** | Block commits on `main`/`master`; run `pre-commit-checks.mjs` |
| **pre-push** | Path-filtered `verify:forge` / `verify:generative` |
| **commit-msg** | Warn-only conventional commit regex |

---

## lean-ctx task profiles

Documented in repo `.lean-ctx.toml` under `[task_profiles.*]`:

- `agent-orchestration` — terse, max compression
- `forge-work` — ignore GenerativeUI paths
- `generative-work` — ignore next-forge paths
- `session-audit` — tee always (audit sessions)

Ensure global preset: `yarn lean-ctx:ensure`

---

## Beads + E2E

Starter issues (orchestration + e2e): `yarn beads:init`

E2E smoke doc: [`e2e/worktree-smoke/README.md`](../e2e/worktree-smoke/README.md)

CI job: `.github/workflows/ci.yml` → `worktree-smoke` (continue-on-error, paths-filtered on `scripts/` + `e2e/`).

---

## Yarn scripts reference

| Script | Description |
|--------|-------------|
| `yarn agent:tui` | Generate mprocs.yaml + launch mprocs |
| `yarn agent:mprocs:generate` | Regenerate mprocs.yaml only |
| `yarn agent:status` | Worktree + ports + doctor |
| `yarn agent:audit` | Session audit markdown report |
| `yarn agent:session:start` | PowerShell session start |
| `yarn agent:session:finish` | PowerShell session finish + vibe finish |
