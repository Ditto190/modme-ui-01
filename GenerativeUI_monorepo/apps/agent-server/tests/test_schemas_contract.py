"""Golden contract parity tests for Pydantic schemas vs @repo/schemas."""

import json
from pathlib import Path

import pytest

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
    Path(__file__).resolve().parent / "fixtures" / "genui-agent-contract.golden.json"
)


@pytest.fixture(name="golden")
def golden_fixture() -> dict:
    with FIXTURE_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def test_contract_version_matches(golden: dict) -> None:
    assert golden["contractVersion"] == GOLDEN_CONTRACT_VERSION


def test_agent_action_parses_golden(golden: dict) -> None:
    action = AgentAction.model_validate(golden["agentAction"])
    assert action.id == "action-001"
    assert action.type == "render"
    assert action.timestamp == 1719494400000


def test_agent_state_parses_golden(golden: dict) -> None:
    state = AgentState.model_validate(golden["agentState"])
    assert state.status == "streaming"
    assert len(state.actions) == 1

    error_state = AgentState.model_validate(golden["agentStateError"])
    assert error_state.status == "error"
    assert error_state.error == "Model rate limit exceeded"


def test_streaming_payloads_parse_golden(golden: dict) -> None:
    token = TokenEventPayload.model_validate(golden["tokenEvent"])
    assert token.delta == "hello"
    assert token.seq == 1

    tool_start = ToolStartPayload.model_validate(golden["toolStart"])
    assert tool_start.name == "fetch_data"

    tool_result = ToolResultPayload.model_validate(golden["toolResult"])
    assert tool_result.callId == "call-001"

    done = DonePayload.model_validate(golden["done"])
    assert done.runId == "run-abc"
    assert done.usage is not None
    assert done.usage.promptTokens == 120


def test_optimistic_message_parses_golden(golden: dict) -> None:
    message = OptimisticMessage.model_validate(golden["optimisticMessage"])
    assert message.role == "user"
    assert message.pending is True


def test_web_socket_messages_parse_golden(golden: dict) -> None:
    for raw in golden["webSocketMessages"]:
        message = WebSocketMessage.model_validate(raw)
        assert message.type in golden["enums"]["webSocketMessageTypes"]


def test_enum_coverage(golden: dict) -> None:
    for action_type in golden["enums"]["agentActionTypes"]:
        AgentAction.model_validate(
            {"id": f"action-{action_type}", "type": action_type, "timestamp": 1}
        )

    for status in golden["enums"]["agentStateStatuses"]:
        AgentState.model_validate({"actions": [], "status": status})
