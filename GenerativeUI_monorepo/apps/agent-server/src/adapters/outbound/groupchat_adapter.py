"""AG2 GroupChat adapter implementing AgentOrchestratorPort."""

from typing import Any, Optional

from ...agents.groupchat import AgentGroupChat
from ...models.schemas import AgentState


class GroupChatAdapter:
    """Wraps AgentGroupChat behind the orchestrator port."""

    def __init__(self, config: Optional[dict[str, Any]] = None) -> None:
        self._chat = AgentGroupChat(config)

    async def process_message(self, message: str) -> AgentState:
        return await self._chat.process_message(message)

    def get_state(self) -> AgentState:
        return self._chat.get_state()
