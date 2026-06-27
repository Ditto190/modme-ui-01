"""Thin FastAPI WebSocket inbound adapter."""

import asyncio
import json
import uuid
from datetime import datetime


def _now_ms() -> int:
    return int(datetime.now().timestamp() * 1000)

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ...domain.agent_state import build_idle_state, build_streaming_state, extract_preview_text
from ...models.schemas import WebSocketMessage
from ...ports.outbound.agent_orchestrator_port import AgentOrchestratorPort
from ...ports.outbound.connection_manager_port import ConnectionManagerPort


class AgentWebSocketHandler:
    """Handles WebSocket agent communication via injected ports."""

    def __init__(
        self,
        orchestrator: AgentOrchestratorPort,
        connection_manager: ConnectionManagerPort,
    ) -> None:
        self._orchestrator = orchestrator
        self._connection_manager = connection_manager

    async def _stream_tokens(self, text: str, run_id: str) -> None:
        words = text.split()
        if not words:
            words = [text] if text else ["…"]

        for index, word in enumerate(words, start=1):
            delta = word if index == 1 else f" {word}"
            token_message = WebSocketMessage(
                type="token",
                payload={"delta": delta, "seq": index, "runId": run_id},
                timestamp=_now_ms(),
            )
            await self._connection_manager.broadcast(token_message)
            await asyncio.sleep(0.04)

    async def _process_user_message(self, user_message: str) -> None:
        run_id = str(uuid.uuid4())
        current_actions = self._orchestrator.get_state().actions

        processing_message = WebSocketMessage(
            type="state_update",
            payload=build_streaming_state(current_actions, run_id).model_dump(),
            timestamp=_now_ms(),
        )
        await self._connection_manager.broadcast(processing_message)

        tool_start = WebSocketMessage(
            type="tool_start",
            payload={
                "name": "groupchat",
                "callId": f"{run_id}-tool",
                "runId": run_id,
            },
            timestamp=_now_ms(),
        )
        await self._connection_manager.broadcast(tool_start)

        updated_state = await self._orchestrator.process_message(user_message)
        preview_text = extract_preview_text(updated_state)

        tool_result = WebSocketMessage(
            type="tool_result",
            payload={
                "callId": f"{run_id}-tool",
                "output": {"status": updated_state.status},
                "runId": run_id,
            },
            timestamp=_now_ms(),
        )
        await self._connection_manager.broadcast(tool_result)

        await self._stream_tokens(preview_text, run_id)

        done_message = WebSocketMessage(
            type="done",
            payload={"runId": run_id},
            timestamp=_now_ms(),
        )
        await self._connection_manager.broadcast(done_message)

        state_message = WebSocketMessage(
            type="state_update",
            payload=updated_state.model_dump(),
            timestamp=_now_ms(),
        )
        await self._connection_manager.broadcast(state_message)

    async def handle_connection(self, websocket: WebSocket) -> None:
        await self._connection_manager.connect(websocket)

        try:
            initial_message = WebSocketMessage(
                type="state_update",
                payload=self._orchestrator.get_state().model_dump(),
                timestamp=_now_ms(),
            )
            await self._connection_manager.send_message(initial_message, websocket)

            while True:
                data = await websocket.receive_text()

                try:
                    message_data = json.loads(data)

                    if message_data.get("type") == "ping":
                        pong_message = WebSocketMessage(
                            type="pong",
                            timestamp=_now_ms(),
                        )
                        await self._connection_manager.send_message(
                            pong_message, websocket
                        )

                    elif message_data.get("type") == "action":
                        payload = message_data.get("payload", {}) or {}

                        if payload.get("cancel"):
                            await self._connection_manager.cancel_message_task(
                                websocket
                            )
                            cancel_message = WebSocketMessage(
                                type="state_update",
                                payload=build_idle_state(
                                    self._orchestrator.get_state().actions
                                ).model_dump(),
                                timestamp=_now_ms(),
                            )
                            await self._connection_manager.send_message(
                                cancel_message, websocket
                            )
                            continue

                        user_message = payload.get("message", "")
                        if user_message:
                            await self._connection_manager.start_message_task(
                                websocket,
                                self._process_user_message(user_message),
                            )

                except json.JSONDecodeError:
                    error_message = WebSocketMessage(
                        type="error",
                        payload={"message": "Invalid JSON format"},
                        timestamp=_now_ms(),
                    )
                    await self._connection_manager.send_message(
                        error_message, websocket
                    )

                except Exception as e:
                    error_message = WebSocketMessage(
                        type="error",
                        payload={"message": str(e)},
                        timestamp=_now_ms(),
                    )
                    await self._connection_manager.send_message(
                        error_message, websocket
                    )

        except WebSocketDisconnect:
            self._connection_manager.disconnect(websocket)
        except Exception as e:
            print(f"WebSocket error: {e}")
            self._connection_manager.disconnect(websocket)


def create_websocket_router(
    orchestrator: AgentOrchestratorPort,
    connection_manager: ConnectionManagerPort,
) -> APIRouter:
    """Create a thin WebSocket router with injected dependencies."""
    router = APIRouter()
    handler = AgentWebSocketHandler(orchestrator, connection_manager)

    @router.websocket("/ws/agent")
    async def websocket_endpoint(websocket: WebSocket) -> None:
        await handler.handle_connection(websocket)

    return router
