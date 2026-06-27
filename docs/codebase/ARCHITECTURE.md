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
| `shared-schemas` / `@repo/schemas` | Cross-language payload structures | Business logic | `next-forge/packages/schemas`, golden contract fixtures |

### 3b) Agent-server hexagonal layout (Ports & Adapters)

`GenerativeUI_monorepo/apps/agent-server/src/` follows hexagonal architecture so WebSocket routing stays thin and AG2 stays swappable:

```text
apps/agent-server/src/
  domain/           # AgentState builders, preview extraction (pure)
  ports/
    inbound/        # (reserved) WebSocket handler contracts
    outbound/       # AgentOrchestratorPort, ConnectionManagerPort
  adapters/
    inbound/        # FastAPI `/ws/agent` route (thin delegate)
    outbound/       # GroupChatAdapter, WebSocketConnectionManager
  app/              # create_app(), create_container() DI wiring
  models/           # Pydantic wire types (mirror @repo/schemas)
  agents/           # AG2 GroupChat implementation detail
```

**Dependency rule:** `domain` → nothing; `ports` → domain types; `adapters` → ports + domain; `app` wires adapters. The inbound WebSocket adapter depends on port interfaces, not AG2 directly.

**Contract parity:** Vitest (`next-forge/packages/schemas`) and pytest (`apps/agent-server/tests/test_schemas_contract.py`) both parse `genui-agent-contract.golden.json` (copied fixture, no cross-monorepo imports). Timestamps are Unix milliseconds.

**Frontend resilience:** `next-forge/apps/app/.../hooks/use-agent-state.ts` uses exponential backoff (3s base, 30s cap, max 10 attempts), `retryConnection`, and `visibilitychange` reconnect; pure delay logic lives in `reconnect-delay.ts` with Vitest coverage.


| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| Type Sharing | `packages/shared-schemas` | Ensures React payload shapes match Python models (Zod <-> Pydantic). |
| WebSocket Streaming | `apps/agent-server` to `apps/web-dashboard` | Real-time agent state reflection on UI. |

### 5) Known Architectural Risks

- State desync between frontend and backend if WebSocket disconnects after max reconnect attempts (10) or during long offline periods.
- **Reconnection (next-forge):** `use-agent-state.ts` implements exponential backoff (3s base, 30s cap), `reconnecting` run status, and manual `retryConnection` after exhaustion.
- Agent logic blocking the FastAPI event loop if synchronous tools are called incorrectly.

### 6) Evidence

- `GenerativeUI_monorepo/README_GENERATIVE_UI.md`
