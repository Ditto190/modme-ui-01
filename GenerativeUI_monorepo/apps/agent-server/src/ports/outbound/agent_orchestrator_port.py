"""Outbound port for agent orchestration."""

from typing import Protocol

from ...models.schemas import AgentState


class AgentOrchestratorPort(Protocol):
    """Process user messages and expose current agent state."""

    async def process_message(self, message: str) -> AgentState:
        """Run a user message through the agent pipeline."""
        ...

    def get_state(self) -> AgentState:
        """Return the current agent state snapshot."""
        ...
