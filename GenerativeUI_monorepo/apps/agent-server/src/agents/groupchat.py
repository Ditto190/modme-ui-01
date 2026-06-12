"""
AG2 (AutoGen) GroupChat implementation for the agent system.
This module sets up the multi-agent conversation system.
"""
import os
from typing import Optional, Dict, Any
from datetime import datetime
import uuid
import asyncio

try:
    from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager
    AG2_AVAILABLE = True
except ImportError:
    # AG2/AutoGen not installed - use mock implementation
    AG2_AVAILABLE = False

from ..models.schemas import AgentAction, AgentState


class AgentGroupChat:
    """
    Manages a GroupChat of AI agents using AG2 (AutoGen)
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.state = AgentState(status="idle", actions=[])
        
        if AG2_AVAILABLE:
            self._setup_agents()
        else:
            import warnings
            warnings.warn("AG2/AutoGen not available. Using mock implementation.", UserWarning)

    def _setup_agents(self) -> None:
        """Initialize AG2 agents and group chat"""
        if not AG2_AVAILABLE:
            return

        # Configuration for LLM
        llm_config = {
            "model": os.getenv("OPENAI_MODEL", "gpt-4"),
            "api_key": os.getenv("OPENAI_API_KEY", ""),
            "temperature": 0.7,
        }

        # Create assistant agent
        self.assistant = AssistantAgent(
            name="UIAssistant",
            system_message="""You are a UI generation assistant. Your job is to create 
            UI components based on user requests. When generating UI, respond with structured 
            data that includes the component type and properties.""",
            llm_config=llm_config,
        )

        # Create user proxy agent
        self.user_proxy = UserProxyAgent(
            name="UserProxy",
            human_input_mode="NEVER",
            max_consecutive_auto_reply=3,
            code_execution_config=False,
        )

        # Create group chat
        self.groupchat = GroupChat(
            agents=[self.user_proxy, self.assistant],
            messages=[],
            max_round=10,
        )

        # Create group chat manager
        self.manager = GroupChatManager(
            groupchat=self.groupchat,
            llm_config=llm_config,
        )

    async def process_message(self, message: str) -> AgentState:
        """
        Process a message through the agent group chat
        
        Args:
            message: User message to process
            
        Returns:
            Updated agent state
        """
        self.state.status = "processing"
        
        try:
            if AG2_AVAILABLE:
                # Run synchronous AutoGen calls in thread pool to avoid blocking event loop
                action = await asyncio.to_thread(self._process_with_autogen, message)
            else:
                # Mock response for when AG2 is not available
                action = self._create_mock_action(message)
            
            self.state.actions.append(action)
            self.state.status = "complete"
            
        except Exception as e:
            self.state.status = "error"
            self.state.error = str(e)
        
        return self.state

    def _process_with_autogen(self, message: str) -> AgentAction:
        """Process message with AutoGen in synchronous context"""
        # Initiate chat with the user proxy
        self.user_proxy.initiate_chat(
            self.manager,
            message=message,
        )
        
        # Extract the last message and create an action
        return self._create_action_from_response()

    def _create_action_from_response(self) -> AgentAction:
        """Create an AgentAction from the group chat response"""
        # For now, create a simple text component
        # In a real implementation, you would parse the agent's response
        # to determine the appropriate component type and properties
        
        return AgentAction(
            id=str(uuid.uuid4()),
            type="render",
            timestamp=datetime.now().timestamp(),
            componentType="text",
            props={"title": "Agent Response"},
            content="Response from AI agents",
            metadata={"source": "groupchat"}
        )

    def _create_mock_action(self, message: str) -> AgentAction:
        """Create a mock action when AG2 is not available"""
        return AgentAction(
            id=str(uuid.uuid4()),
            type="render",
            timestamp=datetime.now().timestamp(),
            componentType="card",
            props={
                "title": "Mock Agent Response",
                "description": f"Received message: {message[:100]}..."
            },
            content={
                "message": "AG2/AutoGen is not installed. This is a mock response.",
                "original_message": message
            },
            metadata={"source": "mock", "ag2_available": False}
        )

    def get_state(self) -> AgentState:
        """Get the current agent state"""
        return self.state

    def reset_state(self) -> None:
        """Reset the agent state"""
        self.state = AgentState(status="idle", actions=[])
