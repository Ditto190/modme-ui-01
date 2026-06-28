# C4 Component — @repo/schemas

## Responsibility

Canonical TypeScript schema package for ModMe contracts: agent state, WebSocket messages, inbox, observability.

## Location

`next-forge/packages/schemas/`

## Key artifacts

| Export | Purpose |
|--------|---------|
| `WebSocketMessageSchema` | WS frame validation (`state_update`, `token`, `tool_start`, …) |
| `AgentStateSchema` | Canvas state sync |
| Golden JSON | Python pytest parity |

## Dependencies

- Zod
- Consumed by `apps/app/generative-ui/hooks/use-agent-state.ts`

## Tests

- `schemas.test.ts`, `websocket-contract.test.ts`, `observability.test.ts`

## Evidence

- `next-forge/packages/schemas/index.ts`
- `next-forge/packages/schemas/README.md`
