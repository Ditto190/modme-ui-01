# C4 Component — @repo/schemas

**Package:** `next-forge/packages/schemas`

## Responsibility

Canonical Zod schemas for agent UI state, WebSocket envelopes, inbox pipeline contracts. Golden JSON fixtures for cross-language parity.

## Key exports

- `WebSocketMessageSchema` — 10 message types
- `AgentStateSchema`, `AgentActionSchema`
- Inbox Zod contracts

## Evidence

- `next-forge/packages/schemas/index.ts`
- `fixtures/genui-agent-contract.golden.json`
- `ws-contract.test.ts`
