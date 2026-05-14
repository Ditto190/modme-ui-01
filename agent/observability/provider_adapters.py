"""
Provider-specific adapters for capturing agent conversations.
Hooks into different AI providers to log interactions to GreptimeDB.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict

from google.adk.tools import ToolContext
from observability.greptime_logger import get_logger

logger = logging.getLogger(__name__)


class ADKAgentAdapter:
    """
    Adapter for Google ADK Agent Framework.
    Captures conversations via after_model_modifier hook.
    """

    def __init__(self):
        self.greptime_logger = get_logger()
        self.start_times: Dict[str, float] = {}

    def before_request(self, conversation_id: str) -> None:
        """Record start time for latency calculation."""
        self.start_times[conversation_id] = time.time()

    def after_response(
        self,
        tool_context: ToolContext,
        conversation_id: str,
        user_query: str,
        agent_response: str,
        model: str | None = None,
    ) -> None:
        """
        Log conversation after model response.

        This should be called from the after_model_modifier hook in main.py.
        """
        # Calculate latency
        latency_ms = None
        if conversation_id in self.start_times:
            latency_ms = (time.time() - self.start_times[conversation_id]) * 1000
            del self.start_times[conversation_id]

        # Extract tool calls from context
        tool_calls = []
        tool_results = []

        # Parse tools from agent state if available
        if hasattr(tool_context, 'state') and tool_context.state:
            # This would need to be customized based on your state structure
            pass

        # Extract token usage if available
        tokens_input = None
        tokens_output = None

        # Log to GreptimeDB
        try:
            self.greptime_logger.log_conversation(
                conversation_id=conversation_id,
                user_query=user_query,
                agent_response=agent_response,
                provider="adk-agent",
                model=model or "gemini-2.0-flash-exp",
                tool_calls=tool_calls if tool_calls else None,
                tool_results=tool_results if tool_results else None,
                tokens_input=tokens_input,
                tokens_output=tokens_output,
                latency_ms=latency_ms,
                outcome="success",
            )
            logger.debug(f"Logged ADK conversation {conversation_id}")
        except Exception as e:
            logger.error(f"Failed to log ADK conversation: {e}")


class CopilotAdapter:
    """
    Adapter for GitHub Copilot.
    Captures conversations from VSCode extension telemetry or MCP logs.
    """

    def __init__(self):
        self.greptime_logger = get_logger()

    def log_from_mcp(self, mcp_event: Dict[str, Any]) -> None:
        """
        Log conversation from MCP server event.

        Expected format from .vscode/mcp.json logs:
        {
            "conversation_id": "...",
            "user_query": "...",
            "response": "...",
            "model": "gpt-4",
            "timestamp": "..."
        }
        """
        try:
            self.greptime_logger.log_conversation(
                conversation_id=mcp_event.get("conversation_id", "unknown"),
                user_query=mcp_event.get("user_query", ""),
                agent_response=mcp_event.get("response", ""),
                provider="copilot",
                model=mcp_event.get("model", "gpt-4"),
                tokens_input=mcp_event.get("tokens_input"),
                tokens_output=mcp_event.get("tokens_output"),
                latency_ms=mcp_event.get("latency_ms"),
                outcome=mcp_event.get("outcome", "success"),
                metadata=mcp_event.get("metadata"),
            )
            logger.debug(f"Logged Copilot conversation {mcp_event.get('conversation_id')}")
        except Exception as e:
            logger.error(f"Failed to log Copilot conversation: {e}")


class ClaudeAdapter:
    """
    Adapter for Claude (Anthropic API or Desktop).
    Wraps API client to capture conversations.
    """

    def __init__(self):
        self.greptime_logger = get_logger()

    def log_conversation(
        self,
        conversation_id: str,
        messages: list,
        response: Dict[str, Any],
        model: str = "claude-3-opus",
    ) -> None:
        """
        Log Claude conversation.

        Args:
            conversation_id: Unique conversation ID
            messages: List of message dicts with role/content
            response: Claude API response
            model: Model name
        """
        # Extract user query (last user message)
        user_query = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                user_query = msg.get("content", "")
                break

        # Extract agent response
        agent_response = ""
        if isinstance(response.get("content"), list):
            agent_response = " ".join(
                block.get("text", "") for block in response["content"] if block.get("type") == "text"
            )

        # Extract tool calls
        tool_calls = []
        for block in response.get("content", []):
            if block.get("type") == "tool_use":
                tool_calls.append({
                    "name": block.get("name"),
                    "params": block.get("input", {}),
                })

        # Extract usage
        usage = response.get("usage", {})

        try:
            self.greptime_logger.log_conversation(
                conversation_id=conversation_id,
                user_query=user_query,
                agent_response=agent_response,
                provider="claude",
                model=model,
                tool_calls=tool_calls if tool_calls else None,
                tokens_input=usage.get("input_tokens"),
                tokens_output=usage.get("output_tokens"),
                outcome="success",
            )
            logger.debug(f"Logged Claude conversation {conversation_id}")
        except Exception as e:
            logger.error(f"Failed to log Claude conversation: {e}")


class AntigravityAdapter:
    """
    Adapter for Antigravity (custom provider - TBD).
    Placeholder until provider details are clarified.
    """

    def __init__(self):
        self.greptime_logger = get_logger()
        logger.warning("AntigravityAdapter is a placeholder. Needs implementation based on actual provider.")

    def log_conversation(self, **kwargs) -> None:
        """Placeholder - implement based on Antigravity API."""
        logger.warning("Antigravity logging not implemented")


# Singleton instances
_adk_adapter: ADKAgentAdapter | None = None
_copilot_adapter: CopilotAdapter | None = None
_claude_adapter: ClaudeAdapter | None = None
_antigravity_adapter: AntigravityAdapter | None = None


def get_adk_adapter() -> ADKAgentAdapter:
    """Get or create ADK adapter singleton."""
    global _adk_adapter
    if _adk_adapter is None:
        _adk_adapter = ADKAgentAdapter()
    return _adk_adapter


def get_copilot_adapter() -> CopilotAdapter:
    """Get or create Copilot adapter singleton."""
    global _copilot_adapter
    if _copilot_adapter is None:
        _copilot_adapter = CopilotAdapter()
    return _copilot_adapter


def get_claude_adapter() -> ClaudeAdapter:
    """Get or create Claude adapter singleton."""
    global _claude_adapter
    if _claude_adapter is None:
        _claude_adapter = ClaudeAdapter()
    return _claude_adapter


def get_antigravity_adapter() -> AntigravityAdapter:
    """Get or create Antigravity adapter singleton."""
    global _antigravity_adapter
    if _antigravity_adapter is None:
        _antigravity_adapter = AntigravityAdapter()
    return _antigravity_adapter
