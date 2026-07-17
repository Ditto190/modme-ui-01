# Agent Terminal Orchestration Layer

Canonical guide for **session envelopes**, **mprocs TUI**, **task registry**, **trace QA gates**, and **git hook extensions** in ModMe worktrees.

## Overview

| Layer        | Scripts                                               | Purpose                                                                             |
| ------------ | ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **TUI**      | `yarn agent:tui`, `yarn agent:mprocs:generate`        | Multi-process dev stack via [mprocs](https://github.com/pvolok/mprocs)              |
| **Status**   | `yarn agent:status`                                   | JSON-default worktree + ports + doctor (`--human` for text)                         |
| **Harness**  | `yarn harness:control-cli`                            | Deterministic orchestration probes (control-cli skill)                              |
| **Session**  | `agent-session-start.ps1`, `agent-session-finish.ps1` | Beads link, `AGENT_SESSION_ID`, envelope JSON                                       |
| **Audit**    | `yarn agent:audit`                                    | agenttrace doctor/overview → `docs/inbox-pipeline/reports/agent-sessions-latest.md` |
| **Registry** | `scripts/lib/agent-task-registry.mjs`                 | Duplicate task + path claim detection (`data/agent-registry.json`)                  |
| **Hooks**    | `.githooks/pre-commit`, `pre-push`, `commit-msg`      | main/master guard, path-filtered verify, conventional commit warn                   |

See also: [`docs/multi-agent-worktrees.md`](multi-agent-worktrees.md), [`.cursor/skills/agent-terminal-orchestration/SKILL.md`](../.cursor/skills/agent-terminal-orchestration/SKILL.md).

---

## Quick start (worktree)

```powershell
# After new-agent-worktree.ps1 or Cursor setup-worktree-windows.ps1:
. .\scripts\load-worktree-ports.ps1
yarn agent:session:start -TaskTitle "auth fix" -ClaimPaths "next-forge/apps/app"
yarn harness:control-cli   # probe status + mprocs + smoke
yarn agent:tui          # requires mprocs on PATH
yarn agent:status       # JSON default
yarn agent:status --human  # text table

# End session (ephemeral — remove worktree after push):
.\scripts\agent-session-finish.ps1 -VerifyStack -Yes -CommitMessage "feat: ..." -Push -CreatePr -RemoveWorktree -DeleteBranch
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

| Command                             | Behavior                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `yarn agent:audit`                  | agenttrace doctor + overview + agent-status → markdown report                            |
| `-VerifyStack` on vibe/agent finish | `scripts/lib/run-verify-stack.mjs` → `verify:forge` / `verify:generative` by path filter |
| `pre-push` hook                     | `scripts/pre-push-checks.mjs` — same path logic as CI                                    |

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

| Hook           | Behavior                                                      |
| -------------- | ------------------------------------------------------------- |
| **pre-commit** | Block commits on `main`/`master`; run `pre-commit-checks.mjs` |
| **pre-push**   | Path-filtered `verify:forge` / `verify:generative`            |
| **commit-msg** | Warn-only conventional commit regex                           |

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

CI job: `.github/workflows/ci.yml` → `worktree-smoke` + `nix-orchestration-smoke` (continue-on-error, paths-filtered).

---

## Control-cli harness

`scripts/control-cli-harness.mjs` runs deterministic probes (JSON default):

```powershell
yarn harness:control-cli
node scripts/control-cli-harness.mjs --probe=status
.\scripts\control-cli-harness.ps1 -Human
```

Probes: `agent-status --json`, mprocs YAML generation, `e2e/worktree-smoke`, optional tmux status, path profile bootstrap (`paths`).

### Bootstrap path profiles

`scripts/validate-path-profiles.mjs` resolves and confines repo paths (main checkout vs agent worktree), runs a remediation decision tree, and caches the resolved profile for agents.

Config: [`config/control-cli/path-profiles.json`](../config/control-cli/path-profiles.json)

```powershell
yarn validate:path-profiles
yarn harness:paths
node scripts/validate-path-profiles.mjs --human
node scripts/control-cli-harness.mjs --probe=paths
.\scripts\validate-path-profiles.ps1 -Human
```

Cache default: `.cache/control-cli/resolved-path-profile.json` (skip with `--no-write-cache`). Exit `1` on error-severity findings; `--strict` also fails on warnings.

`agent-status.mjs` defaults to JSON; use `--human` for text. Structured errors go to stderr.

Nix: `nix develop -c yarn harness:control-cli` (see [`docs/nix-devshell.md`](nix-devshell.md)).

---

## Root builders (Rolldown analyse)

Rolldown is registered in `scripts/builders.manifest.json` as a **bundler** (not a package manager). Yarn/Bun remain installs; Turborepo stays in next-forge (ADR-0011 / ADR-0013).

```powershell
node scripts/builders-orchestrator.mjs ensure --builder rolldown
node scripts/builders-orchestrator.mjs build --builder rolldown
# emits .cache/builders/rolldown/{agent-status,control-cli-harness}.mjs + analyze-data.json
npx vitest run --config vitest.config.mjs --project orchestration scripts/__tests__/rolldown-builder.test.mjs
```

### Entire + Dolt agent data plane (ADR-0013)

```powershell
yarn entire:install          # Scoop/Go + enable Cursor (local-only)
yarn dolt:up                 # shared sql-server :3307
yarn dolt:catalog:init
yarn km:status               # Entire + Dolt + Beads + inbox
```

Session start runs `catalog-cms-eval` builders preflight. See [`docs/KNOWLEDGE_QUICKSTART.md`](KNOWLEDGE_QUICKSTART.md).

---

## Yarn scripts reference

| Script                       | Description                                                  |
| ---------------------------- | ------------------------------------------------------------ |
| `yarn harness:control-cli`   | Orchestration probe harness                                  |
| `yarn validate:path-profiles` | Bootstrap path profile gate (JSON default)                 |
| `yarn harness:paths`         | Alias for `validate:path-profiles`                           |
| `yarn agent:tui`             | Generate mprocs.yaml + launch mprocs                         |
| `yarn agent:mprocs:generate` | Regenerate mprocs.yaml only                                  |
| `yarn agent:status`          | Worktree + ports + doctor (JSON default; `--human` for text) |
| `yarn agent:audit`           | Session audit markdown report                                |
| `yarn agent:session:start`   | PowerShell session start                                     |
| `yarn agent:session:finish`  | PowerShell session finish + vibe finish                      |
| `yarn entire:status`         | Entire CLI status                                            |
| `yarn dolt:status`           | Dolt + sql-server + catalog                                  |
| `yarn km:status`             | Aggregate agent/KM plane health                              |
