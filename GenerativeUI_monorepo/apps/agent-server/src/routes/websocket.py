"""
WebSocket route for real-time agent communication
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Set
import json
from datetime import datetime

from ..agents.groupchat import AgentGroupChat
from ..models.schemas import WebSocketMessage, AgentState

router = APIRouter()

# Global agent group chat instance
agent_chat: AgentGroupChat = AgentGroupChat()


class ConnectionManager:
    """Manages WebSocket connections"""

    def __init__(self) -> None:
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and store a new WebSocket connection"""
        await websocket.accept()
        self.active_connections.add(websocket)
        print(f"Client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection"""
        self.active_connections.discard(websocket)
        print(f"Client disconnected. Total connections: {len(self.active_connections)}")

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
        
        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection)


manager = ConnectionManager()


@router.websocket("/ws/agent")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """
    WebSocket endpoint for agent communication.
    Streams state updates from the GroupChat to connected clients.
    """
    await manager.connect(websocket)
    
    try:
        # Send initial state
        initial_message = WebSocketMessage(
            type="state_update",
            payload=agent_chat.get_state().model_dump(),
            timestamp=datetime.now().timestamp()
        )
        await manager.send_message(initial_message, websocket)
        
        # Keep connection alive and handle incoming messages
        while True:
            data = await websocket.receive_text()
            
            try:
                # Parse incoming message
                message_data = json.loads(data)
                
                if message_data.get("type") == "ping":
                    # Respond to ping
                    pong_message = WebSocketMessage(
                        type="pong",
                        timestamp=datetime.now().timestamp()
                    )
                    await manager.send_message(pong_message, websocket)
                    
                elif message_data.get("type") == "action":
                    # Process action through agent chat
                    user_message = message_data.get("payload", {}).get("message", "")
                    
                    if user_message:
                        # Update state to processing
                        processing_message = WebSocketMessage(
                            type="state_update",
                            payload=AgentState(
                                status="processing",
                                actions=agent_chat.get_state().actions
                            ).model_dump(),
                            timestamp=datetime.now().timestamp()
                        )
                        await manager.broadcast(processing_message)
                        
                        # Process message through agent group chat
                        updated_state = await agent_chat.process_message(user_message)
                        
                        # Broadcast updated state
                        state_message = WebSocketMessage(
                            type="state_update",
                            payload=updated_state.model_dump(),
                            timestamp=datetime.now().timestamp()
                        )
                        await manager.broadcast(state_message)
                        
            except json.JSONDecodeError:
                error_message = WebSocketMessage(
                    type="error",
                    payload={"message": "Invalid JSON format"},
                    timestamp=datetime.now().timestamp()
                )
                await manager.send_message(error_message, websocket)
                
            except Exception as e:
                error_message = WebSocketMessage(
                    type="error",
                    payload={"message": str(e)},
                    timestamp=datetime.now().timestamp()
                )
                await manager.send_message(error_message, websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)
