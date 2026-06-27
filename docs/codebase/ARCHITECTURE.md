# Architecture

## Core Sections (Required)

### 1) Architectural Style

- Primary style: Multi-tier, event-driven WebSocket streaming.
- Why this classification: Next.js frontend connects to a Python FastAPI backend over WebSockets, passing state from multi-agent chat (AG2) to a dynamic rendering canvas (GenerativeCanvas).
- Primary constraints: Type synchronization between TS/Python (handled via shared-schemas).

### 2) System Flow

```text
User Input (CopilotKit) -> WebSocket -> FastAPI Server -> AG2 GroupChat -> AgentAction -> WebSocket -> GenerativeCanvas
```

Flow details:
1. Frontend connects to backend via WebSocket (`ws://localhost:8000/ws/agent`).
2. User interacts with CopilotKit chat interface.
3. Backend processes messages through AG2 GroupChat.
4. Agents generate actions (create/update UI components) which conform to `AgentActionSchema`.
5. Backend streams state updates via WebSocket.
6. Frontend receives updates and renders UI components dynamically.

### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|-----------------|------|--------------|----------|
| `GenerativeCanvas` | Rendering UI based on agent actions | AI logic or chat orchestration | `GenerativeUI_monorepo/README_GENERATIVE_UI.md` |
| `AgentGroupChat` | AG2 multi-agent conversations | UI definitions | `GenerativeUI_monorepo/README_GENERATIVE_UI.md` |
| `shared-schemas` | Cross-language payload structures | Business logic | `GenerativeUI_monorepo/README_GENERATIVE_UI.md` |

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| Type Sharing | `packages/shared-schemas` | Ensures React payload shapes match Python models (Zod <-> Pydantic). |
| WebSocket Streaming | `apps/agent-server` to `apps/web-dashboard` | Real-time agent state reflection on UI. |

### 5) Known Architectural Risks

- State desync between frontend and backend if WebSocket disconnects.
- [ASK USER] Are there reconnection strategies implemented for the WebSocket layer?
- Agent logic blocking the FastAPI event loop if synchronous tools are called incorrectly.

### 6) Evidence

- `GenerativeUI_monorepo/README_GENERATIVE_UI.md`

### 7) Unified Knowledge Intake (dual-store)

```text
Scrapy / AST indexer → Zod gates (intake-contracts) → GreptimeDB (code) + Supabase (inbox)
                              ↓ promote only
                    inbox_entries.code_pattern_ids ↔ Greptime code_index.id
```

| Component | Path | Role |
|-----------|------|------|
| Validation spine | `packages/intake-contracts/` | Zod at classify/promote/code-chunk boundaries |
| Scrape pipeline | `scripts/scrape-*.mjs` | Web crawl → classify → promote |
| Code AST index | `scripts/code-index-orchestrator.mjs` | ts-morph → GreptimeDB |
| Orchestrator | `scripts/intake-orchestrator.mjs` | `--mode=full` chains scrape + code-index + ingest |
| RAG eval | `experiments/micro-agents/evaluation/runner.ts` | Hybrid retrieval Recall@5 |

See [docs/inbox-pipeline/README.md](../inbox-pipeline/README.md) and [ADR-0010](../../next-forge/docs/adr/0010-dual-store-knowledge-intake.md).
