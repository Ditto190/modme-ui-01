# C4 Component — generative-ui client island

## Responsibility

Client-side WebSocket bridge between next-forge app and agent-server; renders generative canvas state.

## Location

`next-forge/apps/app/app/(authenticated)/generative-ui/`

## Key modules

| Module | Role |
|--------|------|
| `hooks/use-agent-state.ts` | WS connect, reconnect, message dispatch |
| `hooks/websocket-message-handler.ts` | Per-type handlers (`token`, `tool_start`, `state_update`) |
| `generative-canvas.tsx` | UI shell |

## External deps

- `@repo/schemas` for `WebSocketMessageSchema`
- Env: `NEXT_PUBLIC_AGENT_SERVER_WS_URL` (default `ws://localhost:8000/ws/agent`)

## Evidence

- `use-agent-state.ts`
- `C4-Documentation/apis/agent-server-api.yaml`
