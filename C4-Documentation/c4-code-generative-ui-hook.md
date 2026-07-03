# C4 Code — Generative UI Hook (selective)

## Reconnect delay

Pure function for exponential backoff — tested without WebSocket I/O.

Location: `next-forge/apps/app/app/(authenticated)/generative-ui/hooks/reconnect-delay.ts`

## use-agent-state

- Opens WebSocket to `NEXT_PUBLIC_AGENT_SERVER_WS_URL` or default `ws://localhost:8000/ws/agent`
- Parses inbound JSON with `WebSocketMessageSchema`
- Max 10 reconnect attempts, 3s–30s backoff cap
- `visibilitychange` listener for tab focus reconnect

## Evidence

- `C4-Documentation/c4-component-generative-ui-hook.md`
- `docs/codebase/ARCHITECTURE.md` (reconnection mitigation)
