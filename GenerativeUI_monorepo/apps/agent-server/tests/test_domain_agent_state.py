"""Tests for domain agent state pure functions."""

from src.domain.agent_state import (
    build_idle_state,
    build_streaming_state,
    extract_preview_text,
)
from src.models.schemas import AgentAction, AgentState


def test_build_streaming_state_includes_run_id() -> None:
    actions = [
        AgentAction(
            id="a1",
            type="render",
            timestamp=1000,
            componentType="text",
        )
    ]
    state = build_streaming_state(actions, "run-123")
    assert state.status == "streaming"
    assert state.actions == actions
    assert state.metadata == {"runId": "run-123"}


def test_build_idle_state_preserves_actions() -> None:
    actions = [
        AgentAction(id="a1", type="render", timestamp=1000),
    ]
    state = build_idle_state(actions)
    assert state.status == "idle"
    assert state.actions == actions


def test_extract_preview_text_from_content() -> None:
    state = AgentState(
        status="complete",
        actions=[
            AgentAction(
                id="a1",
                type="render",
                timestamp=1000,
                content="Hello world",
            )
        ],
    )
    assert extract_preview_text(state) == "Hello world"


def test_extract_preview_text_default_when_no_actions() -> None:
    state = AgentState(status="idle", actions=[])
    assert extract_preview_text(state) == "Response from AI agents"
