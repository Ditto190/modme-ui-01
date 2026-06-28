# C4 Component — agent-server

## Responsibility

Python hexagonal agent runtime: WebSocket streaming, tool execution, Pydantic models synced to golden JSON.

## Location

`GenerativeUI_monorepo/apps/agent-server/`

## Layers

| Layer | Path |
|-------|------|
| Adapters (HTTP/WS) | `src/adapters/` |
| Domain / agents | `src/domain/` |
| Models | `src/models/schemas.py` |

## Entry

- `src/main.py` — FastAPI app, `/ws/agent`

## Evidence

- `GenerativeUI_monorepo/README_GENERATIVE_UI.md`
- `tests/test_schemas_contract.py`
