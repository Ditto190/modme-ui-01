# C4 Component — agent-server

**Container:** agent-server (:8000)

## Responsibility

Python FastAPI satellite: WebSocket `/ws/agent`, AG2 GroupChat orchestration, schema-validated outbound messages.

## Hexagonal layout

```
domain/ → ports/ → adapters/inbound (WS route) + adapters/outbound (GroupChat, connection manager)
app/ → DI container wiring
models/ → Pydantic wire types
```

## Evidence

- `GenerativeUI_monorepo/apps/agent-server/src/app/factory.py`
- `GenerativeUI_monorepo/apps/agent-server/src/adapters/inbound/websocket_route.py`
