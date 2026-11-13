---
name: continual-learning
description: Capture durable agent memory without spawning subagents — use session envelopes, beads-hooks, inbox, lean-ctx knowledge, and optional dag-task-runner ranks.
disable-model-invocation: false
---

# Continual Learning (no subagents)

Keep durable preferences/facts current **without** `Task` / `agents-memory-updater` / any memory-mining subagent.

Token rule: **parent agent only**. Spawning a transcript-mining subagent is forbidden — it was removed from stop-hooks for cost reasons and must not return.

## Forbidden

- `Task` with `subagent_type: agents-memory-updater`
- Any Cursor SDK / Task fan-out whose only job is “mine transcripts → rewrite AGENTS.md”
- Re-enabling continual-learning **stop** hooks that steal focus or burn tokens on every turn

## Canonical capture paths (use these)

| Layer | Mechanism | When |
| ----- | --------- | ---- |
| Session envelope | `yarn agent:session:start` / `.\scripts\agent-session-start.ps1` → finish via `agent-session-finish.ps1` | Start/end of real work |
| Observability | [`docs/observability/README.md`](../../../docs/observability/README.md) — lean-ctx journal/tee/archive + `yarn telemetry:sync` | Correlate sessions; do not dump into AGENTS.md |
| Beads lifecycle | [`scripts/lib/beads-hooks.mjs`](../../../scripts/lib/beads-hooks.mjs) + `scripts/beads-cli.mjs` | Multi-session work, pipeline runs |
| Inbox protocol | `GenerativeUI_monorepo/docs/inbox/` + Clipper / Unique note pack ([`docs/obsidian/`](../../../docs/obsidian/)) | Decisions, research, architecture notes |
| lean-ctx memory | `ctx_session` / `ctx_knowledge` (remember/wakeup) | Non-obvious facts for *this* session |
| Learning UI style | `scripts/cursor-ai/fix-learning-output-style-hook.ps1` → plugin `session-start` via `run-hook.cmd` | Teaching mode context only — not AGENTS.md mining |

## When the user asks to “run continual-learning”

1. **Do not** launch `agents-memory-updater`.
2. Prefer one of:
   - Point them at the capture path above (inbox note, bead, session finish, `ctx_knowledge remember`).
   - Parent-only AGENTS.md edit: at most 1–3 bullets under **Learned User Preferences** / **Learned Workspace Facts**, only if the correction is **recurring** and **durable**.
3. Optional parallelism for *research* (not AGENTS writes): use project **`dag-task-runner`** ([`.cursor/skills/dag-task-runner`](../dag-task-runner/SKILL.md) or worktree copy) so ranks fan out; **one** final parent rank may propose AGENTS bullets — siblings must not race-write `AGENTS.md`.
4. Incremental transcript index (optional, parent or local script only):
   - Index: `.cursor/hooks/state/continual-learning-index.json`
   - Only skim transcripts newer than indexed mtime; refresh mtimes; drop deleted entries.
   - Default outcome if nothing durable: reply exactly `No high-signal memory updates.`

## AGENTS.md guardrails

- Update only high-signal recurring user corrections and durable workspace facts.
- Exclude one-offs, secrets, tokens, `.env` values, PR numbers as “facts”.
- Do not rewrite unrelated sections.
- Deduplicate against existing bullets.

## Quick commands

```powershell
yarn agent:session:start
yarn agent:session:finish   # or .\scripts\agent-session-finish.ps1
yarn telemetry:sync --dry-run   # observability collect path
node scripts/beads-cli.mjs session-start --title "…"
# Learning-output-style Windows hook (after plugin cache refresh):
.\scripts\cursor-ai\fix-learning-output-style-hook.ps1
```

## Related

- Observability stack: `docs/observability/README.md`
- Observability agent lanes: `docs/evaluation/OBSERVABILITY-AGENTS.md` (beads-hooks metrics)
- KM + beads: `docs/KNOWLEDGE_MANAGEMENT.md`, `docs/beads-workflow.md`
- Inbox / Obsidian pack: `docs/obsidian/README.md`
- DAG runner: `.cursor/skills/dag-task-runner/SKILL.md`
