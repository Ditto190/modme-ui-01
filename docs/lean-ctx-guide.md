# Lean-CTX — Agent Playbook (ModMe)

Canonical guide for **compressing tokens**, **remembering project facts**, and **learning across sessions** in this monorepo. Works with Cursor MCP, shell hooks, and optional Cursor project hooks.

> **Rule of thumb:** MCP for reads/memory/graph; `lean-ctx -c` for shell; native Edit for writes.

---

## 1. CLI vs MCP (why `lean-ctx workflow` failed)

`ctx_graph`, `ctx_workflow`, `ctx_knowledge`, and `ctx_session` are **MCP tools** (69 tools in the lean-ctx MCP server). They are **not** CLI subcommands.

| You tried | Use instead |
|-----------|-------------|
| `lean-ctx workflow ctx_graph action=build` | MCP: `ctx_graph({ "action": "build" })` |
| `lean-ctx workflow …` | MCP: `ctx_workflow({ "action": "status" })` |
| Read a file in chat | MCP: `ctx_read({ "path": "…", "mode": "map" })` |
| `git status` in terminal | CLI: `lean-ctx -c "git status"` |

**CLI everyday commands:**

```powershell
lean-ctx doctor              # wiring check
lean-ctx gain                # tokens saved
lean-ctx discover            # commands still bypassing compression
lean-ctx init --global       # compress yarn/git/bun/npm globally (recommended)
lean-ctx -c "yarn verify:forge"
lean-ctx read path/to/file --mode signatures
lean-ctx cheatsheet          # agent workflow summary
lean-ctx help all            # full CLI reference
```

**Bypass when debugging:** `$env:LEAN_CTX_RAW = "1"` or `$env:LEAN_CTX_DISABLED = "1"`.

---

## 2. Three-layer memory model

Use the right layer for each kind of “remember this”:

| Layer | MCP tool | Persists | Best for |
|-------|----------|----------|----------|
| **Project facts** | `ctx_knowledge` | Cross-session, searchable | Ports, Supabase ref, “yarn only at root”, ADR status |
| **Session continuity** | `ctx_session` | This task / thread | Current goal, open decisions, findings (~400 tok `load`) |
| **Agent diary** | `ctx_agent` | Multi-agent / handoffs | discovery, decision, blocker, progress, insight |

### Project facts (`ctx_knowledge`)

```json
{ "action": "remember", "key": "supabase_project", "value": "modme-next-forge ref aevemmmmouxqlfyxthzf", "category": "deployment", "confidence": 0.95 }
{ "action": "recall", "query": "supabase cloud setup", "mode": "hybrid" }
{ "action": "wakeup" }
{ "action": "consolidate" }
{ "action": "timeline" }
{ "action": "search", "query": "worktree ports" }
```

Categories: `architecture`, `api`, `testing`, `deployment`, `conventions`, `dependencies`.

**ModMe convention:** High-confidence facts also belong in `AGENTS.md` → “Learned User Preferences / Workspace Facts” (human-readable). Use `ctx_knowledge` for agent recall; use AGENTS.md for repo policy.

### Session continuity (`ctx_session`)

```json
{ "action": "load" }
{ "action": "task", "value": "Wire worktree doctor + session finish flags" }
{ "action": "finding", "value": "yarn fails in worktree without yarn.lock copy" }
{ "action": "decision", "value": "Prefer cloud Supabase over local Docker" }
{ "action": "save" }
```

Use at **session start** (`load` + `ctx_knowledge` `wakeup`) and **session end** (`save` + optional `consolidate`).

### Agent diary (`ctx_agent`)

For parallel worktrees / subagents:

```json
{ "action": "register", "agent_type": "cursor", "role": "dev" }
{ "action": "diary", "category": "decision", "message": "ADR-0002 supersedes ADR-0001" }
{ "action": "handoff", "to_agent": "…", "message": "…" }
{ "action": "sync" }
```

Categories: `discovery` | `decision` | `blocker` | `progress` | `insight`.

---

## 3. Token compression workflow (per task)

```
START  → ctx_session load + ctx_knowledge wakeup + ctx_overview OR ctx_compose(task)
LOCATE → ctx_search / ctx_semantic_search / ctx_graph context
READ   → ctx_read (mode by goal — see table below)
EDIT   → native StrReplace/Write (or ctx_edit fallback)
VERIFY → ctx_read diff + lean-ctx -c "yarn check:forge" (or verify:forge before PR)
RECORD → ctx_knowledge remember + ctx_session finding/decision + ctx_agent diary
CHECK  → ctx_compress (long chats; auto checkpoint ~every 15 MCP reads)
END    → ctx_session save + ctx_knowledge consolidate
```

### Read modes (`ctx_read`)

| Goal | Mode | Typical savings |
|------|------|-----------------|
| Orient / big file | `map` | ~95% |
| API surface only | `signatures` | ~80% |
| Before editing | `full` | baseline |
| After edit | `diff` | minimal tokens |
| One region | `lines:120-180` | targeted |

**Replace search chains:** `ctx_compose({ "task": "where is catalogue route handler" })` — one call instead of grep → read → outline → read.

### Code graph (`ctx_graph`)

Run once per worktree or after large refactors:

```json
{ "action": "build", "project_root": "." }
{ "action": "status" }
{ "action": "context", "path": "next-forge/apps/api" }
{ "action": "impact", "path": "packages/supabase/server.ts" }
{ "action": "diagram", "kind": "deps", "depth": 2 }
```

### Workflow rails (`ctx_workflow`)

For structured plan → code → test loops:

```json
{ "action": "start" }
{ "action": "status" }
{ "action": "transition", "to": "implement" }
{ "action": "evidence_add", "key": "verify", "value": "yarn verify:forge passed" }
{ "action": "complete" }
```

---

## 4. Shell compression (`lean-ctx discover`)

Your `lean-ctx discover` output showed **~19k tokens/month** still uncaptured (mostly `yarn`, `bun`, `git`, `npm`).

**Fix (one-time, recommended):**

```powershell
lean-ctx init --global
lean-ctx discover    # re-check; uncaptured count should drop
```

**ModMe commands to always wrap:**

```powershell
lean-ctx -c "git status"
lean-ctx -c "git diff --stat"
lean-ctx -c "yarn worktree:doctor"
lean-ctx -c "yarn verify:forge"
cd next-forge; lean-ctx -c "npx bun run check"
```

Agents in Cursor should prefer MCP `ctx_shell` (same compression) over raw Shell when lean-ctx is allowlisted.

---

## 5. Tool profiles (MCP surface area)

Too many MCP tools inflate the system prompt. lean-ctx supports profiles:

```powershell
lean-ctx tools standard   # default balance
lean-ctx tools minimal    # reads + search + shell only
lean-ctx tools power      # full 69-tool set
```

Use **minimal** for narrow tasks; **power** when you need `ctx_knowledge`, `ctx_graph`, `ctx_workflow`.

---

## 6. ModMe-specific facts to remember

Seed these via `ctx_knowledge` `remember` (or confirm with `recall`):

| Key | Value (example) |
|-----|-----------------|
| `worktree_policy` | Feature work in `../Monorepo_ModMe-dev/dev-agent-*`, not main checkout |
| `package_managers` | Root Yarn 3; `next-forge/` Bun; never cross-install |
| `forge_ports` | app 3100, web 3101, api 3102 (main); worktrees use `.worktree-ports.env` |
| `supabase_adr` | ADR-0002 accepted; ADR-0001 superseded; cloud project modme-next-forge |
| `session_finish` | `.\scripts\vibe-session-finish.ps1 -Yes -CommitMessage "…" -Push -CreatePr` |
| `intake_cwd` | `yarn intake` only from repo root with Supabase env in `.env` |

---

## 7. Cursor hooks (two-layer stack)

### Global (`~/.cursor/hooks.json`)

Always-on **compression telemetry** — lean-ctx `hook observe` on session/tool events; `hook rewrite` (Shell) and `hook redirect` (Read|Grep). Never blocks agents (`failClosed: false`, `timeoutSec: 5`).

### Project (`.cursor/hooks.json`)

**Advisory session observability** — replaces teaching/learning SessionStart injection:

| Event | Purpose | Script |
|-------|---------|--------|
| `sessionStart` | session-logger start + `ctx_session load` hint | `session-bootstrap.ps1` |
| `afterFileEdit` | next-forge verify hint | `lean-ctx-post-edit.ps1` |
| `stop` / `sessionEnd` | session-logger end + marker + offline docs stub | `session-capture.ps1` |

All scripts use `-WindowStyle Hidden` PowerShell wrappers. See [`.cursor/hooks/README.md`](../.cursor/hooks/README.md).

**Teaching replacement (MCP, not hooks):**

| Cheat sheet phase | Action |
|-------------------|--------|
| BEFORE START | `ctx_session load` + `ctx_knowledge wakeup` + `ctx_agent register` |
| WHILE CODING | Global observe/redirect/rewrite (automatic) |
| AFTER CODING | `ctx_session finding` / `decision` on meaningful changes; `save` + `consolidate` at stop |
| MULTI-AGENT | `ctx_agent post` / `read` / `sync` in worktrees |

Offline: `yarn eval:collect` themes from `logs/copilot/`; `yarn session:docs` inbox/CHANGELOG preview.

### Config sync (power + max)

```powershell
.\scripts\lean-ctx\sync-config.ps1 -InitGlobal
```

Sets `tool_profile = "power"` and `[proxy] compression_level = "max"` in `~/.config/lean-ctx/config.toml`.

### Antigravity / Copilot tool hooks

[`.github/hooks/hooks.json`](../.github/hooks/hooks.json) — lean-ctx rewrite/redirect/observe for Copilot (separate from Cursor project hooks).

---

## 8. Diagnostics

```powershell
lean-ctx doctor
lean-ctx gain
lean-ctx benchmark
lean-ctx status
```

If MCP tools return `"Not connected"`: restart Cursor MCP / run `lean-ctx onboard`.

Config: `~/.config/lean-ctx/config.toml` (`compression_level`, `extra_ignore_patterns`, shell allowlist).

---

## 9. Integration with ModMe docs

| Artifact | Role |
|----------|------|
| `AGENTS.md` | Human + agent policy (Learned Preferences) |
| `docs/multi-agent-worktrees.md` | Worktree CWD matrix |
| Inbox `GenerativeUI_monorepo/docs/inbox/` | Design decisions → Supabase pipeline |
| ADRs `next-forge/docs/adr/` | Formal architecture decisions |

After significant decisions: `ctx_knowledge remember` + inbox note + ADR when appropriate.

---

## References

- [lean-ctx GitHub](https://github.com/yvgude/lean-ctx)
- [leanctx.com](https://leanctx.com)
- Repo rule: `.cursor/rules/lean-ctx.mdc`
- Agent tech guide: [docs/agent-tech-guide.md](./agent-tech-guide.md) §2

**Last updated:** 2026-06-21
