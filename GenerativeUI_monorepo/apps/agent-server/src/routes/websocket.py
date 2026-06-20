"""
WebSocket route for real-time agent communication
"""
import asyncio
import json
import uuid
from datetime import datetime
from typing import Any, Coroutine, Dict, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..agents.groupchat import AgentGroupChat
from ..models.schemas import AgentState, WebSocketMessage

router = APIRouter()

# Global agent group chat instance
agent_chat: AgentGroupChat = AgentGroupChat()


class ConnectionManager:
    """Manages WebSocket connections"""

    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()
        self._message_tasks: Dict[WebSocket, asyncio.Task] = {}
        self._task_lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and store a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
        print(f"Client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection"""
        task = self._message_tasks.pop(websocket, None)
        if task and not task.done():
            task.cancel()
        self.active_connections.discard(websocket)
        print(f"Client disconnected. Total connections: {len(self.active_connections)}")

    async def start_message_task(
        self, websocket: WebSocket, coro: Coroutine[Any, Any, None]
    ) -> None:
        """Run message processing without blocking the receive loop."""
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
        """Cancel in-flight message processing for a connection."""
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

    async def send_message(self, message: WebSocketMessage, websocket: WebSocket) -> None:
        """Send a message to a specific WebSocket"""
        try:
            await websocket.send_text(message.model_dump_json())
        except Exception as e:
            print(f"Error sending message: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: WebSocketMessage) -> None:
        """Broadcast a message to all connected WebSockets"""
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(message.model_dump_json())
            except Exception as e:
                print(f"Error broadcasting to connection: {e}")
                disconnected.add(connection)

        for connection in disconnected:
            self.disconnect(connection)


manager = ConnectionManager()


async def _stream_tokens(text: str, run_id: str) -> None:
    """Emit token events word-by-word for streaming UI feedback."""
    words = text.split()
    if not words:
        words = [text] if text else ["…"]

    for index, word in enumerate(words, start=1):
        delta = word if index == 1 else f" {word}"
        token_message = WebSocketMessage(
            type="token",
            payload={"delta": delta, "seq": index, "runId": run_id},
            timestamp=datetime.now().timestamp(),
        )
        await manager.broadcast(token_message)
        await asyncio.sleep(0.04)


async def _process_user_message(user_message: str) -> None:
    run_id = str(uuid.uuid4())

    processing_message = WebSocketMessage(
        type="state_update",
        payload=AgentState(
            status="streaming",
            actions=agent_chat.get_state().actions,
            metadata={"runId": run_id},
        ).model_dump(),
        timestamp=datetime.now().timestamp(),
    )
    await manager.broadcast(processing_message)

    tool_start = WebSocketMessage(
        type="tool_start",
        payload={
            "name": "groupchat",
            "callId": f"{run_id}-tool",
            "runId": run_id,
        },
        timestamp=datetime.now().timestamp(),
    )
    await manager.broadcast(tool_start)

    updated_state = await agent_chat.process_message(user_message)

    preview_text = "Response from AI agents"
    if updated_state.actions:
        last_action = updated_state.actions[-1]
        preview_text = str(last_action.content or last_action.props or preview_text)

    tool_result = WebSocketMessage(
        type="tool_result",
        payload={
            "callId": f"{run_id}-tool",
            "output": {"status": updated_state.status},
            "runId": run_id,
        },
        timestamp=datetime.now().timestamp(),
    )
    await manager.broadcast(tool_result)

    await _stream_tokens(preview_text, run_id)

    done_message = WebSocketMessage(
        type="done",
        payload={"runId": run_id},
        timestamp=datetime.now().timestamp(),
    )
    await manager.broadcast(done_message)

    state_message = WebSocketMessage(
        type="state_update",
        payload=updated_state.model_dump(),
        timestamp=datetime.now().timestamp(),
    )
    await manager.broadcast(state_message)


@router.websocket("/ws/agent")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """
    WebSocket endpoint for agent communication.
    Streams state updates and token events from the GroupChat to connected clients.
    """
    await manager.connect(websocket)

    try:
        initial_message = WebSocketMessage(
            type="state_update",
            payload=agent_chat.get_state().model_dump(),
            timestamp=datetime.now().timestamp(),
        )
        await manager.send_message(initial_message, websocket)

        while True:
            data = await websocket.receive_text()

            try:
                message_data = json.loads(data)

                if message_data.get("type") == "ping":
                    pong_message = WebSocketMessage(
                        type="pong",
                        timestamp=datetime.now().timestamp(),
                    )
                    await manager.send_message(pong_message, websocket)

                elif message_data.get("type") == "action":
                    payload = message_data.get("payload", {}) or {}

                    if payload.get("cancel"):
                        await manager.cancel_message_task(websocket)
                        cancel_message = WebSocketMessage(
                            type="state_update",
                            payload=AgentState(
                                status="idle",
                                actions=agent_chat.get_state().actions,
                            ).model_dump(),
                            timestamp=datetime.now().timestamp(),
                        )
                        await manager.send_message(cancel_message, websocket)
                        continue

                    user_message = payload.get("message", "")
                    if user_message:
                        await manager.start_message_task(
                            websocket, _process_user_message(user_message)
                        )

            except json.JSONDecodeError:
                error_message = WebSocketMessage(
                    type="error",
                    payload={"message": "Invalid JSON format"},
                    timestamp=datetime.now().timestamp(),
                )
                await manager.send_message(error_message, websocket)

            except Exception as e:
                error_message = WebSocketMessage(
                    type="error",
                    payload={"message": str(e)},
                    timestamp=datetime.now().timestamp(),
                )
                await manager.send_message(error_message, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)
