# @repo/schemas

Zod schemas shared across next-forge apps and packages.

## Generative UI agent contract

Agent WebSocket types (`AgentAction`, `AgentState`, `TokenEventPayload`, tool lifecycle payloads, `WebSocketMessage`, etc.) are ported from `GenerativeUI_monorepo/packages/shared-schemas/src/index.ts`. Contract parity is enforced by Vitest against committed golden fixtures in `fixtures/genui-agent-contract.golden.json` (no cross-monorepo imports).

**Python sync:** FastAPI agent-server mirrors these types in `GenerativeUI_monorepo/apps/agent-server/src/models/schemas.py`. A copied golden fixture lives at `GenerativeUI_monorepo/apps/agent-server/tests/fixtures/genui-agent-contract.golden.json`; pytest in `tests/test_schemas_contract.py` must pass alongside Vitest.

### Contract version bump process

1. Increment `contractVersion` in `fixtures/genui-agent-contract.golden.json`.
2. Update `GOLDEN_CONTRACT_VERSION` in `GenerativeUI_monorepo/apps/agent-server/src/models/schemas.py`.
3. Update Zod schemas in `index.ts` and Pydantic models to match wire shapes.
4. Copy the golden fixture into `GenerativeUI_monorepo/apps/agent-server/tests/fixtures/` (keep copies in sync manually).
5. Run `cd next-forge/packages/schemas && npx vitest run` and `cd GenerativeUI_monorepo/apps/agent-server && poetry run pytest`.

Timestamps are **Unix milliseconds** on both sides (`1719494400000`, not float seconds).
