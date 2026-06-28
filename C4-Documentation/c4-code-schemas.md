# C4 Code — @repo/schemas (selective)

## WebSocketMessageSchema

```typescript
// next-forge/packages/schemas/index.ts
export const WebSocketMessageSchema = z.object({
  type: z.enum([
    "state_update", "action", "error", "ping", "pong",
    "token", "tool_start", "tool_result", "done",
  ]),
  payload: z.unknown().optional(),
  timestamp: z.number().default(() => Date.now()),
});
```

## Parity

Python mirror: `GenerativeUI_monorepo/apps/agent-server/src/models/schemas.py` — `WebSocketMessage` Pydantic model with same `type` literals.

## Tests

- `ws-contract.test.ts` — all golden `webSocketMessages[]`
- `test_schemas_contract.py` — same golden file (copied fixture)

## Evidence

- `fixtures/genui-agent-contract.golden.json`
- `C4-Documentation/c4-component-schemas.md`
