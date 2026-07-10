# C4 Component — Generative UI Client Hook

**Module:** `use-agent-state.ts` + `reconnect-delay.ts`

## Responsibility

Browser WebSocket client: connect to agent-server, parse Zod-validated messages, exponential backoff reconnect, visibility-based retry.

## Message handling

| type | Client action |
|------|---------------|
| state_update | Merge AgentState into canvas |
| token | Append streaming text |
| tool_start / tool_result | Tool UI affordances |
| done | Mark run complete |
| error | Surface error state |

## Evidence

- `next-forge/apps/app/app/(authenticated)/generative-ui/hooks/use-agent-state.ts`
- Vitest: `reconnect-delay` tests
