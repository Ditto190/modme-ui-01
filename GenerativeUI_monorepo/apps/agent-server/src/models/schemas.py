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
    type: Literal[
        "state_update",
        "action",
        "error",
        "ping",
        "pong",
        "token",
        "tool_start",
        "tool_result",
        "done",
    ] = Field(
        ..., description="Message type"
    )
    payload: Optional[Any] = Field(None, description="Message payload")
    timestamp: float = Field(
        default_factory=lambda: datetime.now().timestamp(),
        description="Unix timestamp"
    )


class InboxEntryInput(BaseModel):
    """Inbox entry payload accepted by the MDA inbox pipeline."""

    content_hash: str
    source_file: str
    source_format: str  # md | txt | pdf | url | jsx | snippet | html | csv
    raw_content: Optional[str] = None
    extracted_text: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    agent_name: Optional[str] = None
    agent_role: Optional[str] = None
    session_id: Optional[str] = None
    branch_name: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    severity: str = "medium"  # low | medium | high | critical
    entry_type: Optional[str] = None  # architecture | design | code-review | solution | research | component | link | snippet
    storage_url: Optional[str] = None
    category_id: Optional[str] = None


class CategorizeResult(BaseModel):
    """Result of taxonomy and relation processing for a single entry."""

    entry_id: str
    tags: List[str]
    category_id: Optional[str] = None
    severity: str
    relations: List[Dict[str, Any]] = Field(default_factory=list)
    confidence: float = 1.0
    processed_at: float = Field(default_factory=lambda: datetime.now().timestamp())


class PipelineRequest(BaseModel):
    """Request model for batch inbox pipeline operations."""

    entry_ids: List[str]
    mode: Literal["ingest", "categorize", "relate", "all"] = "all"
    dry_run: bool = False


class PipelineResponse(BaseModel):
    """Batch response emitted by the MDA inbox pipeline."""

    processed: int
    results: List[CategorizeResult]
    errors: List[str] = Field(default_factory=list)
    duration_ms: float
