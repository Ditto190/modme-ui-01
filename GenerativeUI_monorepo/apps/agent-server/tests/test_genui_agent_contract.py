"""Golden contract parity tests for Pydantic models vs @repo/schemas."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from src.models.schemas import (
    GOLDEN_CONTRACT_VERSION,
    AgentAction,
    AgentState,
    DonePayload,
    OptimisticMessage,
    TokenEventPayload,
    ToolResultPayload,
    ToolStartPayload,
    WebSocketMessage,
)

FIXTURE_PATH = (
    Path(__file__).parent / "fixtures" / "genui-agent-contract.golden.json"
)


@pytest.fixture(name="golden")
def golden_fixture() -> dict[str, Any]:
    with FIXTURE_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def minimal_agent_action(action_type: str) -> dict[str, Any]:
    return {
        "id": f"action-{action_type}",
        "type": action_type,
        "timestamp": 1719494400000,
    }


def test_matches_golden_contract_version(golden: dict[str, Any]) -> None:
    assert golden["contractVersion"] == GOLDEN_CONTRACT_VERSION


def test_parses_golden_agent_action(golden: dict[str, Any]) -> None:
    parsed = AgentAction.model_validate(golden["agentAction"])
    assert parsed.id == "action-001"
    assert parsed.type == "render"
    assert parsed.componentType == "StatCard"
    assert parsed.timestamp == 1719494400000


def test_parses_golden_agent_state_fixtures(golden: dict[str, Any]) -> None:
    assert AgentState.model_validate(golden["agentState"]).status == "streaming"
    assert (
        AgentState.model_validate(golden["agentStateError"]).error
        == "Model rate limit exceeded"
    )


def test_parses_golden_streaming_and_tool_lifecycle_payloads(
    golden: dict[str, Any],
) -> None:
    token = TokenEventPayload.model_validate(golden["tokenEvent"])
    assert token.delta == "hello"
    assert token.seq == 1
    assert token.runId == "run-abc"

    assert ToolStartPayload.model_validate(golden["toolStart"]).name == "fetch_data"
    assert (
        ToolResultPayload.model_validate(golden["toolResult"]).callId == "call-001"
    )
    assert DonePayload.model_validate(golden["done"]).runId == "run-abc"


def test_parses_golden_optimistic_message(golden: dict[str, Any]) -> None:
    parsed = OptimisticMessage.model_validate(golden["optimisticMessage"])
    assert parsed.id == "msg-001"
    assert parsed.role == "user"
    assert parsed.content == "Summarize the dashboard"
    assert parsed.pending is True


def test_parses_all_golden_websocket_message_fixtures(
    golden: dict[str, Any],
) -> None:
    for message in golden["webSocketMessages"]:
        WebSocketMessage.model_validate(message)


def test_accepts_all_golden_enum_literals_for_agent_action_type(
    golden: dict[str, Any],
) -> None:
    for action_type in golden["enums"]["agentActionTypes"]:
        assert AgentAction.model_validate(minimal_agent_action(action_type)).type == action_type

    with pytest.raises(ValidationError):
        AgentAction.model_validate(minimal_agent_action("invalid"))


def test_accepts_all_golden_enum_literals_for_agent_state_status(
    golden: dict[str, Any],
) -> None:
    for status in golden["enums"]["agentStateStatuses"]:
        assert (
            AgentState.model_validate({"actions": [], "status": status}).status == status
        )

    with pytest.raises(ValidationError):
        AgentState.model_validate({"actions": [], "status": "invalid"})


def test_accepts_all_golden_enum_literals_for_optimistic_message_role(
    golden: dict[str, Any],
) -> None:
    for role in golden["enums"]["optimisticMessageRoles"]:
        assert (
            OptimisticMessage.model_validate(
                {"id": "msg", "role": role, "content": "hi"}
            ).role
            == role
        )


def test_accepts_all_golden_enum_literals_for_websocket_message_type(
    golden: dict[str, Any],
) -> None:
    for message_type in golden["enums"]["webSocketMessageTypes"]:
        assert WebSocketMessage.model_validate({"type": message_type}).type == message_type

    with pytest.raises(ValidationError):
        WebSocketMessage.model_validate({"type": "invalid"})
