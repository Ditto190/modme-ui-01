# lean-ctx Data Dictionary (ModMe)

Condensed reference for multi-agent configuration. Full upstream docs: [configuration-reference.md](./configuration-reference.md) (Firecrawl snapshot of [leanctx.com/docs/configuration](https://leanctx.com/docs/configuration/)). Machine schema: [config-schema.json](./config-schema.json) (`lean-ctx config schema`).

## Priority (project wins)

| Priority | Source       | ModMe path                                                |
| -------- | ------------ | --------------------------------------------------------- |
| 1        | Environment  | `LEAN_CTX_*` via `scripts/load-lean-ctx-env.ps1` + `.env` |
| 2        | Project TOML | `.lean-ctx.toml` (root)                                   |
| 3        | Global TOML  | `~/.config/lean-ctx/config.toml`                          |

**Never duplicate keys in `.lean-ctx.toml`** — TOML last-wins silently. Run `lean-ctx config validate`.

## Project data layout

Set by `scripts/load-lean-ctx-env.ps1` (also run from `yarn lean-ctx:ensure`):

| Env var              | ModMe path             | Contents                                       |
| -------------------- | ---------------------- | ---------------------------------------------- |
| `LEAN_CTX_DATA_DIR`  | `data/lean-ctx/`       | Archive, knowledge, sessions, stats, cli-cache |
| `LEAN_CTX_STATE_DIR` | `logs/lean-ctx/`       | Journal, tee (failures), events, debug logs    |
| `LEAN_CTX_CACHE_DIR` | `data/lean-ctx/cache/` | Semantic cache, models                         |

Archive files: `data/lean-ctx/archive/` (content-addressed SHA-256). Retrieve with `ctx_expand`.

## ModMe-tuned sections

### Root — compression & agents

| Key                        | ModMe value | Purpose                                   |
| -------------------------- | ----------- | ----------------------------------------- |
| `compression_level`        | `max`       | 4-layer terse engine                      |
| `memory_cleanup`           | `shared`    | 30min cache retention for parallel agents |
| `tool_profile`             | `power`     | Full MCP surface (~69 tools)              |
| `agent_token_budget`       | `500000`    | Per-agent cap                             |
| `structure_first`          | `true`      | Bias cold reads toward `map`              |
| `reference_results`        | `true`      | Large outputs → URI refs                  |
| `content_defined_chunking` | `true`      | Stable chunk boundaries                   |
| `buddy_enabled`            | `true`      | Multi-agent coordination                  |

### `[archive]` — Tool Result Archive

| Key               | ModMe  | Default | Env override                 |
| ----------------- | ------ | ------- | ---------------------------- |
| `enabled`         | `true` | `true`  | `LEAN_CTX_ARCHIVE`           |
| `ephemeral`       | `true` | `true`  | `LEAN_CTX_EPHEMERAL`         |
| `threshold_chars` | `800`  | `800`   | `LEAN_CTX_ARCHIVE_THRESHOLD` |
| `max_age_hours`   | `168`  | `48`    | via `max_staleness_days`     |
| `max_disk_mb`     | `1024` | `500`   | via `max_disk_mb`            |

### `[loop_detection]` — fingerprint throttling + cross-tool search

Per-fingerprint sliding window (`window_secs`, default 300s):

| Level   | Trigger                   | Behavior                   |
| ------- | ------------------------- | -------------------------- |
| Normal  | ≤ `normal_threshold` (2)  | No intervention            |
| Reduced | > `normal_threshold`      | Warning in response        |
| Blocked | ≥ `blocked_threshold` (6) | Call blocked with guidance |

**Cross-tool search tracking (v3.1.2):** `ctx_search`, `ctx_shell` (grep/rg), and `ctx_semantic_search` count toward `search_group_limit` (10). Pattern similarity groups near-duplicate queries.

| Key                  | ModMe | Default   |
| -------------------- | ----- | --------- |
| `normal_threshold`   | `2`   | `2`       |
| `reduced_threshold`  | `3`   | `4`       |
| `blocked_threshold`  | `6`   | `0` (off) |
| `window_secs`        | `300` | `300`     |
| `search_group_limit` | `10`  | `10`      |

#### `[loop_detection.tool_total_limits]` (session ceilings)

| Tool                  | ModMe | Default |
| --------------------- | ----- | ------- |
| `ctx_read`            | `150` | `100`   |
| `ctx_search`          | `100` | `80`    |
| `ctx_shell`           | `60`  | `50`    |
| `ctx_semantic_search` | `80`  | `60`    |

### Pipe guard (v2.21.6)

**No config key** — shell hook auto-detects piped stdout (`[Console]::IsOutputRedirected` on PowerShell) and bypasses compression. Prevents corrupting `curl … | sh` pipelines.

### `[autonomy]` — background cognition

| Key                               | ModMe | Notes                         |
| --------------------------------- | ----- | ----------------------------- |
| `consolidate_every_calls`         | `20`  | Knowledge merge cadence       |
| `cognition_loop_max_steps`        | `9`   | Enables observation synthesis |
| `cognition_synthesis_min_cluster` | `3`   | Min facts before summary      |

### `[boundary_policy]` — monorepo

| Key                    | ModMe   | Purpose                  |
| ---------------------- | ------- | ------------------------ |
| `cross_project_search` | `true`  | Dual-monorepo discovery  |
| `cross_project_import` | `false` | No knowledge bleed       |
| `audit_cross_access`   | `true`  | Log cross-boundary reads |

## Key environment variables

| Variable                  | ModMe usage           |
| ------------------------- | --------------------- |
| `LEAN_CTX_DATA_DIR`       | `data/lean-ctx`       |
| `LEAN_CTX_STATE_DIR`      | `logs/lean-ctx`       |
| `LEAN_CTX_CACHE_DIR`      | `data/lean-ctx/cache` |
| `LEAN_CTX_ARCHIVE`        | `true` / `false`      |
| `LEAN_CTX_COMPRESSION`    | `max`                 |
| `LEAN_CTX_MEMORY_CLEANUP` | `shared`              |
| `LEAN_CTX_TOOL_PROFILE`   | `power`               |

## Ensure script contract

`yarn lean-ctx:ensure`:

1. Dotsources `load-lean-ctx-env.ps1`
2. Creates `.lean-ctx.toml` from `.lean-ctx.toml.example` **only if missing**
3. **Never overwrites** existing `.lean-ctx.toml`
4. Global preset keys skipped when already present (unless `-Force`)
5. Syncs `docs/lean-ctx/config-schema.json`

## Observability correlation

lean-ctx state files are collected by `telemetry-cli.mjs` as `lean-ctx-*` source events and promoted to Supabase `telemetry_events`.

### Collect sources

| lean-ctx path                                        | Telemetry source   | Notes                                           |
| ---------------------------------------------------- | ------------------ | ----------------------------------------------- |
| `$LEAN_CTX_STATE_DIR/journal*`                       | `lean-ctx-journal` | Human activity log; journaled per session       |
| `$LEAN_CTX_STATE_DIR/tee/`                           | `lean-ctx-tee`     | Shell hook failure captures (tee_mode=failures) |
| `$LEAN_CTX_STATE_DIR/debug.log`                      | `lean-ctx-debug`   | MCP routing trace (LEAN_CTX_DEBUG_LOG=1 only)   |
| `.cursor/hooks/state/lean-ctx-session-markers.jsonl` | `lean-ctx-marker`  | Session adoption + correlation markers          |
| `$LEAN_CTX_DATA_DIR/archive/`                        | `lean-ctx-archive` | Reference IDs only — no full bodies             |

### Session correlation

`AGENT_SESSION_ID` (set by `agent-session-start.ps1`) is injected into:

- `pipeline_runs.metadata.agent_session_id`
- `lean-ctx-session-markers.jsonl[session_id]`
- All `telemetry_events.session_id` from lean-ctx sources
- Agent span `session_id` attribute (Greptime, when `GREPTIME_OTEL_ENABLED=1`)

### Debug opt-in

```powershell
# Production-safe: disabled by default
# Enable for a session:
.\scripts\agent-session-start.ps1 -DebugTrace
# Or:
$env:OBSERVABILITY_DEBUG = "1"
```

`LEAN_CTX_DEBUG_LOG=1` writes to `$LEAN_CTX_STATE_DIR/debug.log`. Not set by default.

### task_profiles.observability-work

`.lean-ctx.toml` defines `[task_profiles.observability-work]` with focused paths. Activate via:

```powershell
$env:LEAN_CTX_PROFILE = "observability-work"
```

Profiles template: `data/lean-ctx-task-profiles.toml.example` (`orchestration`, `inbox-intake`, `forge-dev`).

## Agent catalog (A2A registry)

| Path | Role |
| `data/lean-ctx-agent-catalog.json` | Runtime catalog (gitignored) |
| `scripts/collections/lean-ctx-agent-catalog.seed.json` | Committed seed |
| `scripts/lean-ctx-agent-catalog.mjs` | seed / register / resolve / validate |

Registry sync: `agents[]` in `data/agent-registry.json` via `syncAgentsFromCatalog`.

```powershell
yarn agent:catalog:seed
yarn agent:catalog:validate
node scripts/lean-ctx-agent-catalog.mjs resolve --intent="review telemetry"
```

## Prove-it metrics

Script: `scripts/lean-ctx-prove-it.ps1` (`yarn lean-ctx:prove-it`)

| Output | Path |
| Signed savings | `metrics/lean-ctx-savings-YYYY-MM.json` |
| Benchmark scorecard | `metrics/lean-ctx-scorecard.json` |

Optional eval vars (`.env.example`): `LEAN_CTX_EVAL_MODEL`, `LEAN_CTX_EVAL_MODEL_URL`, `LEAN_CTX_EVAL_MODEL_KEY`.

## Universal intake (ctx_index)

Script: `scripts/lean-ctx-universal-intake.mjs` (`yarn lean-ctx:index`)

Corpus: inbox docs, handover, `.agents/skills`, `prompts/`, `scripts/collections/`.

Orchestrator flag: `yarn intake:orchestrate -- --lean-ctx-index`

## Beads BFS dispatch

`scripts/beads-bfs-dispatch.mjs` — `yarn beads:bfs` / `yarn beads:bfs:dry`

Output: layered dispatch plan with duplicate detection via `agent-task-registry.mjs`.

## Validation

```powershell
. .\scripts\load-lean-ctx-env.ps1
lean-ctx config validate
yarn lean-ctx:doctor
```

**Last synced:** 2026-06-28 (lean-ctx config schema + Firecrawl configuration page; observability correlation section added)

## Agent catalog (A2A)

| Artifact      | Path                                                   | Role                                  |
| ------------- | ------------------------------------------------------ | ------------------------------------- |
| Seed          | `scripts/collections/lean-ctx-agent-catalog.seed.json` | Committed agent + intent routes       |
| Runtime       | `data/lean-ctx-agent-catalog.json`                     | Generated (`yarn agent:catalog:seed`) |
| CLI           | `scripts/lean-ctx-agent-catalog.mjs`                   | seed, register, resolve, validate     |
| Registry sync | `data/agent-registry.json` → `agents[]`                | Via `syncAgentsFromCatalog`           |

## Task profiles

Copy [`data/lean-ctx-task-profiles.toml.example`](../data/lean-ctx-task-profiles.toml.example) → `data/lean-ctx-task-profiles.toml`. Activate: `$env:LEAN_CTX_PROFILE = "orchestration"`.

## Universal intake

```powershell
yarn lean-ctx:index
yarn intake:orchestrate --mode=full --lean-ctx-index
```

Script: `scripts/lean-ctx-universal-intake.mjs` — `lean-ctx index build` + knowledge export.

## Prove-it quantification

```powershell
yarn lean-ctx:prove-it
# lean-ctx savings verify | summary | sign → metrics/lean-ctx-savings-YYYY-MM.json
# lean-ctx benchmark scorecard → metrics/lean-ctx-scorecard.json
```

Eval vars (optional, commented in `.env.example`): `LEAN_CTX_EVAL_MODEL`, `LEAN_CTX_EVAL_MODEL_URL`, `LEAN_CTX_EVAL_MODEL_KEY`.

## Observability correlation

lean-ctx state/data directories feed directly into the distributed observability ETL pipeline. The following fields from lean-ctx sources are promoted to OTel spans and Supabase `telemetry_events`:

| lean-ctx source                  | `source` enum      | OTel span parent  | Supabase table     |
| -------------------------------- | ------------------ | ----------------- | ------------------ |
| `logs/lean-ctx/journal*.jsonl`   | `lean-ctx-journal` | `agent.session`   | `telemetry_events` |
| `logs/lean-ctx/tee/`             | `lean-ctx-tee`     | `agent.tool_call` | `telemetry_events` |
| lean-ctx debug log               | `lean-ctx-debug`   | `agent.tool_call` | `telemetry_events` |
| `lean-ctx-session-markers.jsonl` | `lean-ctx-marker`  | `agent.session`   | `pipeline_runs`    |
| `data/lean-ctx/archive/` refs    | `lean-ctx-archive` | `agent.tool_call` | `telemetry_events` |

**Correlation key:** `LEAN_CTX_STATE_DIR` / `LEAN_CTX_DATA_DIR` paths are joined with `AGENT_SESSION_ID` to produce `lean_ctx.read` child spans (attributes: `path`, `mode`, `tokens_saved`).

**Collection command:**

```powershell
node scripts/telemetry/telemetry-cli.mjs collect --since=7d
```

**Full observability stack:** [`docs/observability/README.md`](../observability/README.md)  
**Orchestrator skill:** [`.agents/skills/modme-distributed-observability/SKILL.md`](../../.agents/skills/modme-distributed-observability/SKILL.md)
