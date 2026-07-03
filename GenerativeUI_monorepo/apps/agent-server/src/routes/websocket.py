"""
Legacy WebSocket route module — re-exports from hexagonal adapters.

Use ``app.factory.create_app()`` for DI-wired application startup.
"""
from ..app.container import create_container
from ..adapters.inbound.websocket_route import create_websocket_router

_container = create_container()
router = create_websocket_router(
    _container.orchestrator,
    _container.connection_manager,
)

__all__ = ["router"]
