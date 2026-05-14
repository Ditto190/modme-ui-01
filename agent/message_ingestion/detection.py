"""
Provider Detection

Auto-detect AI provider from message structure.
"""

from __future__ import annotations

from typing import Any, Dict

from .types import AIProvider


def detect_provider(raw: Any) -> AIProvider:
    """
    Detect the AI provider from message structure.

    Args:
        raw: Raw message data

    Returns:
        Detected provider enum value
    """
    if not isinstance(raw, dict):
        return AIProvider.UNKNOWN

    obj: Dict[str, Any] = raw

    # Claude detection
    if obj.get("type") == "message" or _is_claude_format(obj):
        return AIProvider.CLAUDE

    # OpenAI detection
    if _is_openai_format(obj):
        return AIProvider.OPENAI

    # CopilotKit detection
    if "actionExecution" in obj or (
        "id" in obj and "role" in obj and "content" in obj
    ):
        return AIProvider.COPILOTKIT

    # n8n detection
    if ("executionId" in obj and "workflowId" in obj) or (
        "data" in obj and "workflowId" in obj
    ):
        return AIProvider.N8N

    return AIProvider.UNKNOWN


def _is_claude_format(obj: Dict[str, Any]) -> bool:
    """Check if message matches Claude/Anthropic format"""
    if not obj.get("role"):
        return False

    content = obj.get("content")
    if isinstance(content, list):
        # Check for Claude-specific content blocks
        for block in content:
            if isinstance(block, dict) and block.get("type") in [
                "tool_use",
                "tool_result",
                "thinking",
            ]:
                return True

    return False


def _is_openai_format(obj: Dict[str, Any]) -> bool:
    """Check if message matches OpenAI format"""
    if not obj.get("role"):
        return False

    # Check for OpenAI-specific fields
    return (
        "tool_calls" in obj or "function_call" in obj or "tool_call_id" in obj
    )
