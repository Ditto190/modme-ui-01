"""Application composition root and dependency injection."""

from dataclasses import dataclass

from ..adapters.outbound.groupchat_adapter import GroupChatAdapter
from ..adapters.outbound.websocket_connection_manager import WebSocketConnectionManager
from ..ports.outbound.agent_orchestrator_port import AgentOrchestratorPort
from ..ports.outbound.connection_manager_port import ConnectionManagerPort


@dataclass
class AppContainer:
    """Holds wired port implementations for the application."""

    orchestrator: AgentOrchestratorPort
    connection_manager: ConnectionManagerPort


def create_container() -> AppContainer:
    """Construct default production dependencies."""
    return AppContainer(
        orchestrator=GroupChatAdapter(),
        connection_manager=WebSocketConnectionManager(),
    )
