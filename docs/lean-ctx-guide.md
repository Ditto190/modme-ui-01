# Lean-CTX — Agent Playbook (ModMe)

Canonical guide for **compressing tokens**, **remembering project facts**, and **learning across sessions** in this monorepo. Works with Cursor MCP, shell hooks, and optional Cursor project hooks.

> **Rule of thumb:** MCP for reads/memory/graph; `lean-ctx -c` for shell; native Edit for writes.
>
> **ModMe policy:** Native `Read`, `Grep`, and `Glob` are **forbidden** for repo files when lean-ctx MCP is connected. Always use `ctx_read(path, mode)` with an explicit mode. See [read modes](https://leanctx.com/docs/concepts/read-modes/).

---

## 1. CLI vs MCP (why `lean-ctx workflow` failed)

`ctx_graph`, `ctx_workflow`, `ctx_knowledge`, and `ctx_session` are **MCP tools** (69 tools in the lean-ctx MCP server). They are **not** CLI subcommands.

| You tried                                  | Use instead                                     |
| ------------------------------------------ | ----------------------------------------------- |
| `lean-ctx workflow ctx_graph action=build` | MCP: `ctx_graph({ "action": "build" })`         |
| `lean-ctx workflow …`                      | MCP: `ctx_workflow({ "action": "status" })`     |
| Read a file in chat                        | MCP: `ctx_read({ "path": "…", "mode": "map" })` |
| `git status` in terminal                   | CLI: `lean-ctx -c "git status"`                 |

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

| Layer                  | MCP tool        | Persists                  | Best for                                                 |
| ---------------------- | --------------- | ------------------------- | -------------------------------------------------------- |
| **Project facts**      | `ctx_knowledge` | Cross-session, searchable | Ports, Supabase ref, “yarn only at root”, ADR status     |
| **Session continuity** | `ctx_session`   | This task / thread        | Current goal, open decisions, findings (~400 tok `load`) |
| **Agent diary**        | `ctx_agent`     | Multi-agent / handoffs    | discovery, decision, blocker, progress, insight          |

### A2A registry + beads BFS (ModMe)

Local multi-agent (buddy mode, no Remote Bus):

```powershell
yarn agent:catalog:seed              # data/lean-ctx-agent-catalog.json
yarn agent:session:start -AgentRole dev -BootstrapIntelligence
yarn beads:bfs:dry                   # BFS ready-queue dispatch plan
node scripts/lean-ctx-agent-catalog.mjs resolve --intent "inbox intake"
```

- Orchestration rule: [`.cursor/rules/lean-ctx-orchestration.mdc`](../.cursor/rules/lean-ctx-orchestration.mdc)
- Intelligence routing: [`docs/lean-ctx/intelligence-routing.md`](./lean-ctx/intelligence-routing.md)
- MCP gateway: [`docs/lean-ctx/mcp-tool-catalog.md`](./lean-ctx/mcp-tool-catalog.md)

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
START  → yarn agent:session:start (worktree) + ctx_session load + ctx_knowledge wakeup + ctx_overview OR ctx_compose(task)
LOCATE → ctx_search / ctx_semantic_search / ctx_graph context
READ   → ctx_read (mode by goal — see table below; task profiles in .lean-ctx.toml)
EDIT   → native StrReplace/Write (or ctx_edit fallback)
VERIFY → ctx_read diff + lean-ctx -c "yarn check:forge" (or -VerifyStack on session finish)
RECORD → ctx_knowledge remember + ctx_session finding/decision + ctx_agent diary
CHECK  → ctx_compress (long chats; auto checkpoint ~every 15 MCP reads)
END    → yarn agent:session:finish + ctx_session save + ctx_knowledge consolidate + yarn agent:audit
```

### Read modes (`ctx_read`)

| Goal              | Mode            | Typical savings |
| ----------------- | --------------- | --------------- |
| Orient / big file | `map`           | ~95%            |
| API surface only  | `signatures`    | ~80%            |
| Before editing    | `full`          | baseline        |
| After edit        | `diff`          | minimal tokens  |
| One region        | `lines:120-180` | targeted        |

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

## 3b. Multi-agent orchestration (A2A + beads BFS)

Local A2A registry (no Remote Agent Bus). Rule file: `.cursor/rules/lean-ctx-orchestration.mdc`.

### Session start (catalog + optional bootstrap)

```powershell
yarn agent:session:start -TaskTitle "..." -AgentRole dev -BootstrapIntelligence
# catalog: node scripts/lean-ctx-agent-catalog.mjs register --role dev
```

Session envelope includes `catalog_agent` snapshot under `trace.lean_ctx`.

### Beads BFS dispatch

```powershell
yarn beads:bfs:dry    # inspect dependency layers + duplicate detection
yarn beads:bfs        # emit dispatch plan JSON
```

Layers map issues → `suggested_role`, `suggested_collection`, `claim_paths[]`.

### Agent catalog

| Command | Purpose |
| `yarn agent:catalog:seed` | Merge collections → `data/lean-ctx-agent-catalog.json` |
| `yarn agent:catalog:validate` | Schema + agent id checks |
| `yarn agent:catalog:resolve -- --intent="fix auth"` | Intent → role + intelligence tools |

Seed: `scripts/collections/lean-ctx-agent-catalog.seed.json`  
Collection: `scripts/collections/modme-lean-ctx-advanced.collection.json`

### Intelligence routing

Decision tree: [docs/lean-ctx/intelligence-routing.md](docs/lean-ctx/intelligence-routing.md)  
MCP gateway map: [docs/lean-ctx/mcp-tool-catalog.md](docs/lean-ctx/mcp-tool-catalog.md)

```powershell
node scripts/lean-ctx-tool-gateway.mjs find "library docs"
.\scripts\lean-ctx-session-bootstrap.ps1   # graph + index + wakeup hints
yarn lean-ctx:index                        # universal intake corpus
yarn lean-ctx:prove-it                     # savings + scorecard
```

### Task profiles

Copy `data/lean-ctx-task-profiles.toml.example` → `data/lean-ctx-task-profiles.toml`, then:

```powershell
$env:LEAN_CTX_PROFILE = "orchestration"   # or inbox-intake | forge-dev
. .\scripts\load-lean-ctx-env.ps1
```

### Multi-repo workspace

Open **parent** `Monorepo_ModMe` as Cursor workspace. `allow_auto_reroot = true` detects `next-forge/`, `GenerativeUI_monorepo/`, `src/`, `agent/`. Optional `extra_roots = ["../Monorepo_ModMe-dev/dev"]` for persistent dev worktree (skipped when path missing).

**Config hierarchy (project-first):**

| Layer  | Path                                                                | Role                                                |
| ------ | ------------------------------------------------------------------- | --------------------------------------------------- |
| Env    | `LEAN_CTX_*` via `scripts/load-lean-ctx-env.ps1`                    | Data dirs, trust, task profiles                     |
| Root   | `.lean-ctx.toml`                                                    | **ModMe source of truth** (full multi-agent config) |
| Child  | `next-forge/.lean-ctx.toml`, `GenerativeUI_monorepo/.lean-ctx.toml` | Stack-specific ignores only                         |
| Global | `~/.config/lean-ctx/config.toml`                                    | Minimal baseline — do not duplicate ModMe keys      |

**Workspace trust (lean-ctx 3.8+):** Security-sensitive project overrides (`custom_aliases`, `proxy.*_upstream`, `rules_scope`, `rules_injection`) are withheld until the workspace is trusted. One-time per clone:

```powershell
yarn lean-ctx:trust          # or: lean-ctx trust (use 3.8+ binary from ~/.local/bin)
yarn lean-ctx:ensure         # loads LEAN_CTX_TRUST_WORKSPACE=1 + project data dirs
```

Re-run `yarn lean-ctx:trust` after editing `.lean-ctx.toml` (trust is pinned to file hash).

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

## 4b. Config ensure workflow (smart-git Step 0)

One command to detect misconfiguration and auto-apply safe ModMe defaults:

```powershell
yarn lean-ctx:ensure              # detect + auto-apply safe defaults
yarn lean-ctx:ensure:check        # read-only pre-flight
yarn lean-ctx:schema:sync         # refresh docs/lean-ctx/config-schema.json
yarn lean-ctx:doctor
```

| Path                                       | Role                                         |
| ------------------------------------------ | -------------------------------------------- |
| `~/.config/lean-ctx/config.toml`           | Global config (XDG) — lowest priority        |
| `.lean-ctx.toml`                           | **Project overrides (wins over global)**     |
| `.lean-ctx.toml.example`                   | Tracked template (bootstrap only if missing) |
| `docs/lean-ctx/config-schema.json`         | Reference snapshot — not read at runtime     |
| `docs/lean-ctx/data-dictionary.md`         | ModMe multi-agent key reference              |
| `docs/lean-ctx/configuration-reference.md` | Full upstream config page snapshot           |

**Project data dirs** (via `scripts/load-lean-ctx-env.ps1`, auto-run by `yarn lean-ctx:ensure`):

| Path                     | Env var              | Contents                         |
| ------------------------ | -------------------- | -------------------------------- |
| `data/lean-ctx/`         | `LEAN_CTX_DATA_DIR`  | Archive, knowledge, sessions     |
| `data/lean-ctx/archive/` | (under DATA_DIR)     | Tool Result Archive (ctx_expand) |
| `logs/lean-ctx/`         | `LEAN_CTX_STATE_DIR` | Journal, tee, debug logs         |
| `data/lean-ctx/cache/`   | `LEAN_CTX_CACHE_DIR` | Semantic cache                   |

**Priority:** env vars → `.lean-ctx.toml` → global config. The ensure script **never overwrites** an existing `.lean-ctx.toml`.

Integrated into [`scripts/vibe-session-finish.ps1`](../scripts/vibe-session-finish.ps1) as advisory pre-flight (`-CheckOnly` default; `-ApplyLeanCtx` to auto-apply).

Full workflow: [`.agents/skills/smart-git-automation/references/lean-ctx-config-workflow.md`](../.agents/skills/smart-git-automation/references/lean-ctx-config-workflow.md)

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

| Key                | Value (example)                                                             |
| ------------------ | --------------------------------------------------------------------------- |
| `worktree_policy`  | Feature work in `../Monorepo_ModMe-dev/dev-agent-*`, not main checkout      |
| `package_managers` | Root Yarn 3; `next-forge/` Bun; never cross-install                         |
| `forge_ports`      | app 3100, web 3101, api 3102 (main); worktrees use `.worktree-ports.env`    |
| `supabase_adr`     | ADR-0002 accepted; ADR-0001 superseded; cloud project modme-next-forge      |
| `session_finish`   | `.\scripts\vibe-session-finish.ps1 -Yes -CommitMessage "…" -Push -CreatePr` |
| `intake_cwd`       | `yarn intake` only from repo root with Supabase env in `.env`               |

Project lean-ctx defaults in `.lean-ctx.toml` (see `docs/lean-ctx/data-dictionary.md`):

- **Compression:** `compression_level=max`, `cache_policy=aggressive`, `memory_cleanup=shared`
- **Archive:** enabled, 7-day retention, stored under `data/lean-ctx/archive/`
- **Loop detection:** fingerprint throttling + cross-tool search cap (`search_group_limit=10`)
- **Adaptive retrieval:** `structure_first`, `dense_enabled`, `reference_results`, `content_defined_chunking`
- **Multi-agent:** `buddy_enabled`, `agent_token_budget=500000`, `rules_scope=both`
- **Pipe guard:** automatic (piped stdout bypasses shell hook compression)

---

## 7. Cursor hooks (opt-in)

**Project policy:** `.cursor/hooks.json` is **empty by default**. Previous hooks with `failClosed: true` stole focus and blocked agents. See `.cursor/hooks/README.md`.

**Safe pattern:** advisory hooks only — always `exit 0`, no `failClosed`, timeout ≤ 5s.

Suggested hooks (enable manually):

| Event           | Purpose                                        | Script                               |
| --------------- | ---------------------------------------------- | ------------------------------------ |
| `sessionStart`  | lean-ctx config check (advisory, `-CheckOnly`) | `scripts/ensure-lean-ctx-config.ps1` |
| `afterFileEdit` | Remind verify command for next-forge TS        | `lean-ctx-post-edit.ps1`             |
| `stop`          | Append session marker for memory pipelines     | `lean-ctx-stop-marker.ps1`           |

Do **not** re-enable stop hooks that rewrite skills or open browsers without explicit opt-in.

### Antigravity / Copilot tool hooks

This repo also ships [`.github/hooks/hooks.json`](../.github/hooks/hooks.json) with lean-ctx `hook rewrite`, `hook redirect`, `hook observe` on pre/post tool use — separate from Cursor project hooks.

---

## 8. Diagnostics

```powershell
yarn lean-ctx:ensure          # detect + safe auto-apply ModMe defaults
yarn lean-ctx:ensure -- -CheckOnly
yarn lean-ctx:doctor
yarn lean-ctx:schema:sync
lean-ctx gain
lean-ctx benchmark
lean-ctx status
```

If MCP tools return `"Not connected"`: restart Cursor MCP / run `lean-ctx onboard`.

**Config paths:** global `~/.config/lean-ctx/config.toml` (XDG; legacy `~/.lean-ctx/` is deprecated); project `<repo>/.lean-ctx.toml`; schema reference `docs/lean-ctx/config-schema.json` (not read at runtime).

Ensure script: [`scripts/ensure-lean-ctx-config.ps1`](../scripts/ensure-lean-ctx-config.ps1) — backs up `.bak` before writes; use `-Force` only to overwrite customized keys.

---

## 9. Integration with ModMe docs

| Artifact                                  | Role                                       |
| ----------------------------------------- | ------------------------------------------ |
| `AGENTS.md`                               | Human + agent policy (Learned Preferences) |
| `docs/multi-agent-worktrees.md`           | Worktree CWD matrix                        |
| Inbox `GenerativeUI_monorepo/docs/inbox/` | Design decisions → Supabase pipeline       |
| ADRs `next-forge/docs/adr/`               | Formal architecture decisions              |

After significant decisions: `ctx_knowledge remember` + inbox note + ADR when appropriate.

---

## References

- [lean-ctx GitHub](https://github.com/yvgude/lean-ctx)
- [leanctx.com](https://leanctx.com)
- Repo rule: `.cursor/rules/lean-ctx.mdc`
- Agent tech guide: [docs/agent-tech-guide.md](./agent-tech-guide.md) §2

**Last updated:** 2026-06-28
