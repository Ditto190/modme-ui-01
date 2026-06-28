# VoltOps → ModMe Field Mapping

Reference mapping from VoltAgent/VoltOps observability concepts to ModMe equivalents. Source: [voltagent.dev/llms.txt](https://voltagent.dev/llms.txt) (VoltOps monitoring + tracing patterns).

## Core concept mapping

| VoltOps concept | VoltOps implementation | ModMe equivalent | ModMe location |
|-----------------|------------------------|------------------|----------------|
| `AgentEventEmitter` | Decoupled event bus per agent | `telemetry-cli collect` + session-logger JSONL events | `scripts/telemetry/telemetry-cli.mjs` |
| `parentAgentId` | Supervisor→sub-agent link | OTel `parent_span_id` + `trace_refs.parent_session_id` | Supabase `trace_refs` table |
| `parentHistoryEntryId` | History entry parent pointer | `PARENT_SESSION_ID` env → `telemetry_events.parent_session_id` | session-logger config |
| `historyUpdate` WebSocket | Real-time agent state push | Batch promote → Supabase + optional live `SessionOpsPanel` SSE | `session-ops-panel.tsx` |
| `historyEntryCreated` event | New history entry notification | `pipeline_runs` INSERT → `eval_signals` | `telemetry-bridge.mjs` |
| `.voltagent/` SQLite store | Local agent state persistence | `logs/lean-ctx/` + `data/lean-ctx/` (project-local) | `LEAN_CTX_STATE_DIR` |
| Sub-agent `handoffTask` | Task delegation with trace link | Multi-agent worktree envelopes + `ctx_agent` diary + `agent.handoff` span | `scripts/agent-session-start.ps1` |
| Workflow step observability | Per-step trace + status | `pipeline_runs` stage lifecycle: raw→normalized→stored→promoted | `telemetry-bridge.mjs` |
| `AgentStatus` enum | RUNNING/IDLE/ERROR/WAITING | `pipeline_runs.status`: running/completed/failed/skipped | Supabase schema |
| `toolCall` event | Tool invocation with args/result | `agent.tool_call` OTel span + `telemetry_events` type=tool_call | OTel adapter |
| `toolResult` event | Tool output capture | `telemetry_events.metadata.tool_result` | telemetry-bridge |
| `userMessage` / `assistantMessage` | Chat turn tracking | session-logger `prompt` event | session-logger.ps1 |
| `modelConfig.provider` | LLM provider identifier | `agent_platform` field (cursor/copilot/claude/voltagent/cloud) | observability contract v1 |
| `subAgents[]` | Child agent array | Worktree slots + `parent_session_id` chain | multi-agent-worktrees.md |
| VoltOps dashboard | Real-time agent monitoring UI | `OpsSignalCard` + `SessionOpsPanel` in Knowledge tab | `ops-signal-card.tsx` |

## Span/event name mapping

| VoltOps event type | ModMe OTel span name | Key attributes |
|--------------------|----------------------|----------------|
| `agent.start` | `agent.session` | `session_id`, `agent_platform`, `branch`, `worktree` |
| `agent.finish` | `agent.session` (end) | `duration_ms`, `exit_status` |
| `agent.toolCall` | `agent.tool_call` | `tool_name`, `lean_ctx_mode`, `duration_ms` |
| `agent.handoff` | `agent.handoff` | `parent_session_id`, `child_session_id`, `task_slug` |
| pipeline step | `telemetry.sync` | `pipeline_run_id`, `stage`, `events_count` |
| lean-ctx read | `lean_ctx.read` | `path`, `mode`, `tokens_saved` |

## Storage mapping

| VoltOps store | ModMe store | Primary key |
|---------------|-------------|-------------|
| `.voltagent/` SQLite | `logs/lean-ctx/` + `data/lean-ctx/` | session UUID |
| VoltOps cloud (optional) | Supabase `pipeline_runs`, `trace_refs` | `pipeline_run_id` + `session_id` |
| Metrics / time-series | Greptime `agent_spans` (OTLP) | `trace_id` + `span_id` |
| Bridge / join table | Supabase `trace_refs` | `greptime_span_id` FK |

## What ModMe does not adopt

| VoltOps feature | Reason skipped | ModMe alternative |
|-----------------|---------------|-------------------|
| `@voltagent/core` runtime requirement for all agents | Vendor lock-in; most agents are Cursor/Copilot | OTel adapter pattern (reference only) |
| VoltOps cloud subscription | Privacy-first; local-first approach | Supabase self-hosted + optional cloud |
| VoltOps WebSocket realtime push per agent event | Too chatty at developer scale | Batch promote; optional SSE |
| VoltOps `memoryManager` persistence | Handled by lean-ctx archive + ctx_knowledge | lean-ctx data dir |

## `agent_platform` enum (ModMe extension)

VoltOps has `modelConfig.provider`; ModMe uses `agent_platform` as a broader classifier:

| `agent_platform` | Detection signal | VoltOps analogue |
|------------------|-----------------|------------------|
| `cursor` | `CURSOR_SESSION_ID` env | — |
| `copilot` | `GITHUB_COPILOT_*` env | — |
| `claude` | `CLAUDECODE` env, `~/.claude/` | — |
| `voltagent` | `@voltagent/core` events, `.voltagent/` dir | native |
| `cloud` | `CURSOR_CLOUD` env, envelope `owner=cloud` | — |
| `human` | No platform env detected | — |

## Correlation key cross-reference

| ModMe field | VoltOps field | OTel standard |
|-------------|---------------|---------------|
| `session_id` | `historyEntryId` | `trace_id` (root) |
| `parent_session_id` | `parentHistoryEntryId` | `parent_span_id` |
| `agent_platform` | `modelConfig.provider` | `agent.platform` resource attr |
| `worktree` | — (VoltOps doesn't have) | `agent.worktree` resource attr |
| `branch` | — | `vcs.branch` resource attr |
| `tenant_id` | workspace/org | `tenant.id` resource attr |
| `pipeline_run_id` | workflow run ID | `workflow.run_id` |

## References

- VoltOps source: [voltagent.dev/llms.txt](https://voltagent.dev/llms.txt)
- `@voltagent/core` in `next-forge/bun.lock` (reference only, not a runtime dependency for all agents)
- ModMe observability contract: `docs/inbox-pipeline/contracts/observability-contract.v1.json`
- Multi-agent handoff: `docs/multi-agent-worktrees.md`
- OTel span taxonomy: `.agents/skills/modme-distributed-observability/SKILL.md`
