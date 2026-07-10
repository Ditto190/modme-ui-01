"""Pure functions for constructing and interpreting AgentState."""

from ..models.schemas import AgentAction, AgentState

DEFAULT_PREVIEW_TEXT = "Response from AI agents"


def build_streaming_state(actions: list[AgentAction], run_id: str) -> AgentState:
    """Build a streaming AgentState for an in-flight run."""
    return AgentState(
        status="streaming",
        actions=actions,
        metadata={"runId": run_id},
    )


def build_idle_state(actions: list[AgentAction]) -> AgentState:
    """Build an idle AgentState preserving existing actions."""
    return AgentState(status="idle", actions=actions)


def extract_preview_text(
    state: AgentState,
    default: str = DEFAULT_PREVIEW_TEXT,
) -> str:
    """Extract display text from the most recent action."""
    if not state.actions:
        return default
    last_action = state.actions[-1]
    return str(last_action.content or last_action.props or default)
