"""WebSocket connection manager implementing ConnectionManagerPort."""

import asyncio
from typing import Any, Coroutine, Dict, Set

from fastapi import WebSocket

from ...models.schemas import WebSocketMessage
class WebSocketConnectionManager:
    """Manages WebSocket connections and message delivery."""

    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()
        self._message_tasks: Dict[WebSocket, asyncio.Task[Any]] = {}
        self._task_lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)
        print(f"Client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        task = self._message_tasks.pop(websocket, None)
        if task and not task.done():
            task.cancel()
        self.active_connections.discard(websocket)
        print(f"Client disconnected. Total connections: {len(self.active_connections)}")

    async def start_message_task(
        self,
        websocket: WebSocket,
        coro: Coroutine[Any, Any, None],
    ) -> None:
        async with self._task_lock:
            existing = self._message_tasks.get(websocket)
            if existing and not existing.done():
                existing.cancel()
                try:
                    await existing
                except asyncio.CancelledError:
                    pass

            task = asyncio.create_task(coro)
            self._message_tasks[websocket] = task

    async def cancel_message_task(self, websocket: WebSocket) -> bool:
        async with self._task_lock:
            existing = self._message_tasks.get(websocket)
            if existing and not existing.done():
                existing.cancel()
                try:
                    await existing
                except asyncio.CancelledError:
                    pass
                return True
            return False

    async def send_message(
        self,
        message: WebSocketMessage,
        websocket: WebSocket,
    ) -> None:
        try:
            await websocket.send_text(message.model_dump_json())
        except Exception as e:
            print(f"Error sending message: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: WebSocketMessage) -> None:
        disconnected: set[WebSocket] = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(message.model_dump_json())
            except Exception as e:
                print(f"Error broadcasting to connection: {e}")
                disconnected.add(connection)

        for connection in disconnected:
            self.disconnect(connection)
