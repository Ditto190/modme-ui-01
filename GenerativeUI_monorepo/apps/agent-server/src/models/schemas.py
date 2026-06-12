"""
Pydantic models for the agent server.
These models mirror the Zod schemas from @generative-ui/shared-schemas
"""
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class AgentAction(BaseModel):
    """
    AgentAction represents an action taken by an AI agent
    that should be reflected in the UI state
    """
    id: str = Field(..., description="Unique identifier for the action")
    type: Literal["create", "update", "delete", "render"] = Field(
        ..., description="Type of action"
    )
    timestamp: float = Field(..., description="Unix timestamp of when the action occurred")
    componentType: Optional[str] = Field(None, description="Type of UI component to render")
    props: Optional[Dict[str, Any]] = Field(None, description="Properties to pass to the component")
    content: Optional[Any] = Field(None, description="Content or data associated with the action")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class AgentState(BaseModel):
    """
    AgentState represents the current state of the AI agent system
    """
    actions: List[AgentAction] = Field(default_factory=list, description="List of agent actions")
    status: Literal["idle", "processing", "streaming", "complete", "error"] = Field(
        ..., description="Current status"
    )
    error: Optional[str] = Field(None, description="Error message if status is error")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional state metadata")


class WebSocketMessage(BaseModel):
    """
    WebSocket message for real-time communication
    """
    type: Literal["state_update", "action", "error", "ping", "pong"] = Field(
        ..., description="Message type"
    )
    payload: Optional[Any] = Field(None, description="Message payload")
    timestamp: float = Field(
        default_factory=lambda: datetime.now().timestamp(),
        description="Unix timestamp"
    )
