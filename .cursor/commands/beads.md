---
description: Beads issue tracking — session start, ready work, create/close issues, sync to git
argument-hint: [ready|create|show|close|sync|session]
---

# Beads — persistent task memory (ModMe)

Git-backed issue tracker for **multi-session** agent work. Prefix: **`modme`**.  
Canonical guide: [`docs/beads-workflow.md`](../../docs/beads-workflow.md)

**Run all commands from monorepo root** (`Monorepo_ModMe/`), not `next-forge/` or `.beads/`.

Optional argument `$ARGUMENTS`: subcommand — `ready` (default), `create`, `show`, `close`, `sync`, `session`.

---

## bd vs chat todos

| Use **beads** | Use **chat todos** |
|---------------|-------------------|
| Multi-session / multi-day work | Single-session linear tasks |
| Dependencies or blockers | Immediate checklist |
| Survives context compaction | Conversation-scoped |
| Team sync via `yarn beads:push` | No persistence needed |

**Test:** "Will I need this context in 2 weeks?" → **yes** = beads.

---

## Subcommand: `session` (orchestration)

Full worktree session loop (beads + envelopes):

```powershell
# Start (worktree; auto on Cursor setup-worktree-windows.ps1)
yarn agent:session:start --% -TaskTitle "<task>" -ClaimPaths "next-forge/apps/app"
yarn beads:ready

# Finish
.\scripts\agent-session-finish.ps1 -VerifyStack -Yes -CommitMessage "feat: ..." -Push -CreatePr
yarn beads:push
```

Envelopes: `logs/agent-orchestrator/sessions/<uuid>.json`  
Guide: [`docs/agent-terminal-orchestration.md`](../../docs/agent-terminal-orchestration.md)

---

## Subcommand: `ready` (default)

Find unblocked work and summarize for the user.

1. If `.beads/` missing → run `yarn beads:init` (idempotent) or instruct user.
2. Run `npx @beads/bd ready` (or `yarn beads:ready`).
3. For each issue, show **id**, **title**, **priority**, **status**.
4. Recommend `bd show <id>` before starting; link to orchestration if in a worktree.

---

## Subcommand: `create`

Create a new issue from remaining `$ARGUMENTS` text (title).

```powershell
npx @beads/bd create "<title>" --priority 2
```

If no title in args, ask the user. After create:

- `bd show <id>` for full context
- `bd update <id> --status in_progress` when work starts
- Add notes with `bd update <id> --notes "..."` as you work (critical for compaction survival)

---

## Subcommand: `show`

```powershell
npx @beads/bd show <issue-id>
```

Issue IDs use hash suffixes (e.g. `modme-aqu`), not sequential numbers.

---

## Subcommand: `close`

```powershell
npx @beads/bd close <issue-id> --reason "<reason>"
yarn beads:push
```

Before close on feature work: run quality gates (`yarn pre-commit:check`, stack verify if paths changed).

---

## Subcommand: `sync`

```powershell
yarn beads:pull
yarn beads:push
```

Always push at session end when issues were created, updated, or closed.

---

## Initialize (once per clone)

```powershell
yarn beads:init
```

Uses `npx @beads/bd` — no global `bd` required. Skips if issues already exist.

---

## Agent protocol (every session)

1. `bd ready` — pick or confirm work
2. `bd show <id>` — load context
3. `bd update <id> --status in_progress`
4. Work in a **worktree** (not main checkout) for feature changes
5. Append notes as discoveries land
6. `bd close <id> --reason "..."` when done
7. `bd sync` / `yarn beads:push`

---

## Output format

After running, respond with:

1. **Action** — what subcommand ran
2. **Issues** — table or list (id, title, status)
3. **Next step** — one concrete command (show, update, agent:session:start, or close)
4. **Orchestration** — remind worktree + `yarn agent:session:*` if multi-agent session

Do not commit secrets. Do not re-init if `.beads/` already exists unless user asks.
