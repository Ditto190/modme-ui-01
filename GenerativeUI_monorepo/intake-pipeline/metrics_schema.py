"""
Pydantic models matching the actual Copilot session events.jsonl format.

Real event shape (from ~/.copilot/session-state/<id>/events.jsonl):
  {"type": "session.start", "data": {...}, "id": "...", "timestamp": "...", "parentId": "..."}
  {"type": "tool.execution_start", "data": {"toolCallId":"...", "toolName":"...", "arguments":{}, "model":"...", "turnId":"..."}, ...}
  {"type": "tool.execution_complete", "data": {"toolCallId":"...", "model":"...", "interactionId":"...", "turnId":"...", "success": true, "result":{}}, ...}
"""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Any, Optional


# ── Raw event envelope ──────────────────────────────────────────────────────

class RawEvent(BaseModel):
    type: str
    data: dict[str, Any] = Field(default_factory=dict)
    id: str
    timestamp: str
    parentId: Optional[str] = None


# ── Typed event shapes ───────────────────────────────────────────────────────

class SessionStartData(BaseModel):
    sessionId: str
    version: Optional[int] = None
    producer: Optional[str] = None
    copilotVersion: Optional[str] = None
    startTime: Optional[str] = None
    selectedModel: Optional[str] = None
    reasoningEffort: Optional[str] = None
    contextTier: Optional[str] = None
    context: dict[str, Any] = Field(default_factory=dict)


class ToolExecutionStartData(BaseModel):
    toolCallId: str
    toolName: str
    arguments: dict[str, Any] = Field(default_factory=dict)
    model: Optional[str] = None
    turnId: Optional[str] = None
    interactionId: Optional[str] = None


class ToolExecutionCompleteData(BaseModel):
    toolCallId: str
    model: Optional[str] = None
    interactionId: Optional[str] = None
    turnId: Optional[str] = None
    success: bool = False
    result: Optional[dict[str, Any]] = None
    error: Optional[dict[str, Any]] = None


# ── Aggregated models for Supabase ───────────────────────────────────────────

class SessionRecord(BaseModel):
    """Maps to copilot_sessions table."""
    session_id: str
    started_at: Optional[str] = None
    ended_at: Optional[str] = None
    model: Optional[str] = None
    reasoning_effort: Optional[str] = None
    branch: Optional[str] = None
    repository: Optional[str] = None
    cwd: Optional[str] = None
    host_type: Optional[str] = None
    producer: Optional[str] = None
    copilot_version: Optional[str] = None
    total_turns: int = 0
    total_tool_calls: int = 0
    tool_success_count: int = 0
    tool_failure_count: int = 0
    duration_ms: Optional[int] = None


class ToolCallRecord(BaseModel):
    """Maps to copilot_tool_calls table."""
    session_id: str
    tool_call_id: str
    tool_name: str
    turn_id: Optional[str] = None
    interaction_id: Optional[str] = None
    model: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    duration_ms: Optional[int] = None
    success: Optional[bool] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    arguments: dict[str, Any] = Field(default_factory=dict)


class ToolMetricRecord(BaseModel):
    """Maps to tool_metrics table (daily aggregates)."""
    tool_name: str
    metric_date: str       # YYYY-MM-DD
    invocations: int = 0
    success_count: int = 0
    failure_count: int = 0
    success_rate: Optional[float] = None
    avg_duration_ms: Optional[float] = None
    p95_duration_ms: Optional[float] = None
    popularity_score: float = 0.0
    trending_score: float = 0.0


# ── Legacy compat (keep for orchestrator until full rewrite) ──────────────────

class SessionMetric(BaseModel):
    id: str
    invocations: int = 0
    success_count: int = 0
    avg_latency_ms: Optional[float] = None
    behavior_id: Optional[str] = None
    feature_id: Optional[str] = None
    popularity: Optional[float] = None

    def to_dict(self):
        return self.model_dump()

