"""
Pydantic v2 models for the Universal Chat Ingestion Bridge.

These models match the Zod schemas in:
    agent-generator/src/chat-formats/types.ts

And the OpenAPI spec at:
    agent-generator/dist/openapi/universal-chat-ingestion.json

Schema provenance:
    types.ts (Zod) ──► openapi.ts (zod-openapi) ──► OpenAPI 3.1 spec
                                                       │
    models.py (Pydantic) ◄─── contract match ──────────┘

Adding a field? Update types.ts first, regenerate the OpenAPI spec,
then mirror the change here in Pydantic.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ToolCall(BaseModel):
    """A single tool invocation within a conversation turn."""

    name: str = Field(..., description='Tool/function name (e.g., "read_file", "search")')
    input: Optional[str] = Field(None, description="Stringified JSON arguments passed to the tool")
    output: Optional[str] = Field(None, description="Stringified JSON result from the tool")
    round: Optional[int] = Field(None, description="Tool calling round index (0-indexed)")


class TokenUsage(BaseModel):
    """Token usage metrics for a turn."""

    prompt: int = Field(0, description="Number of prompt/input tokens")
    completion: int = Field(0, description="Number of completion/output tokens")
    total: Optional[int] = Field(None, description="Total tokens (if provided by API)")


class UniversalTurn(BaseModel):
    """A single conversation turn in the universal format."""

    index: int = Field(..., description="Turn position in conversation (0-indexed)")
    userMessage: str = Field(..., description="The human input text")
    assistantResponse: str = Field(..., description="The assistant output text")
    model: str = Field("unknown", description="Model identifier (e.g., claude-sonnet-4-20250514)")
    timestampMs: Optional[int] = Field(None, description="Unix timestamp in milliseconds")
    latencyMs: Optional[int] = Field(None, description="Total response time in milliseconds")
    tokens: Optional[TokenUsage] = None
    toolCalls: List[ToolCall] = Field(default_factory=list, description="Tools/functions invoked during this turn")
    thinking: Optional[str] = Field(None, description="Chain-of-thought / reasoning text")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Agent-specific metadata preserved as-is")


class UniversalTurnPayload(BaseModel):
    """Complete payload sent from n8n → Python bridge /ingest endpoint.

    This is the contract between the TypeScript pipeline (normalization)
    and the Python bridge (OTLP serialization + Phoenix upload).
    """

    format: str = Field(..., description="Detected format ID (e.g., copilot-chat, claude-code)")
    agent: str = Field(..., description="AI agent that produced this chat (e.g., GitHub Copilot)")
    projectName: str = Field("chat-traces", description="Phoenix project name for trace organization")
    sessionId: Optional[str] = Field(None, description="Session identifier (if available from source)")
    responder: Optional[str] = Field(None, description="User/responder identity")
    turns: List[UniversalTurn] = Field(..., min_length=1, description="The normalized conversation turns")

    # Optional Phoenix URL override (not in the TypeScript schema — bridge-only)
    phoenixUrl: Optional[str] = Field(None, description="Override Phoenix endpoint URL")


class IngestSuccessResponse(BaseModel):
    """Successful ingestion response."""

    status: str = "success"
    format: str
    agent: str
    project: str
    endpoint: str
    total_turns: int
    uploaded: int
    skipped: int
    session_id: str = ""
    elapsed_seconds: float
    errors: Optional[List[str]] = None


class LegacyUploadRequest(BaseModel):
    """Legacy /upload endpoint request (backward-compatible).

    Supports both wrapped (chatData + projectName) and will also
    accept raw chat.json directly via the fallback path.
    """

    chatData: Optional[Dict[str, Any]] = Field(None, description="The VS Code chat.json content")
    projectName: Optional[str] = Field(None, description="Phoenix project name")
    phoenixUrl: Optional[str] = Field(None, description="Override Phoenix endpoint URL")
    # If chatData is not present, the body itself might be raw chat.json
    # — that case is handled in the endpoint logic


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "ok"
    service: str = "trace-bridge"
    version: str = "2.1.0"
