"""Outbound port for WebSocket connection management."""

from typing import Any, Coroutine, Protocol

from fastapi import WebSocket

from ...models.schemas import WebSocketMessage


class ConnectionManagerPort(Protocol):
    """Manage WebSocket connections and message delivery."""

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and register a WebSocket connection."""
        ...

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection."""
        ...

    async def start_message_task(
        self,
        websocket: WebSocket,
        coro: Coroutine[Any, Any, None],
    ) -> None:
        """Run message processing without blocking the receive loop."""
        ...

    async def cancel_message_task(self, websocket: WebSocket) -> bool:
        """Cancel in-flight message processing for a connection."""
        ...

    async def send_message(
        self,
        message: WebSocketMessage,
        websocket: WebSocket,
    ) -> None:
        """Send a message to a specific WebSocket."""
        ...

    async def broadcast(self, message: WebSocketMessage) -> None:
        """Broadcast a message to all connected WebSockets."""
        ...
