"""
Message Parsers

Parse and normalize messages from different AI providers.
"""

from __future__ import annotations

import json
import uuid
from typing import Any, Dict, List, Optional

from .types import (
    AIProvider,
    MessageMetadata,
    ParsedMessage,
    ToolCall,
    ToolResult,
)


def parse_claude_message(raw: Dict[str, Any]) -> ParsedMessage:
    """Parse Claude/Anthropic API message"""
    msg_id = raw.get("id", str(uuid.uuid4()))
    role = raw.get("role", "assistant")
    content_raw = raw.get("content", "")

    # Initialize metadata
    metadata = MessageMetadata(
        model=raw.get("model"),
        stop_reason=raw.get("stop_reason"),
    )

    if raw.get("usage"):
        metadata.tokens = {
            "input": raw["usage"].get("input_tokens", 0),
            "output": raw["usage"].get("output_tokens", 0),
        }

    # Parse content blocks
    text_blocks: List[str] = []
    tool_calls: List[ToolCall] = []
    tool_results: List[ToolResult] = []

    if isinstance(content_raw, str):
        text_blocks.append(content_raw)
    elif isinstance(content_raw, list):
        for block in content_raw:
            if not isinstance(block, dict):
                continue

            block_type = block.get("type")

            if block_type == "text":
                text_blocks.append(block.get("text", ""))
            elif block_type == "thinking":
                text_blocks.append(f"[Thinking: {block.get('thinking', '')}]")
            elif block_type == "tool_use":
                tool_calls.append(
                    ToolCall(
                        id=block.get("id", str(uuid.uuid4())),
                        name=block.get("name", ""),
                        arguments=block.get("input", {}),
                    )
                )
            elif block_type == "tool_result":
                tool_results.append(
                    ToolResult(
                        tool_call_id=block.get("tool_use_id", ""),
                        result=block.get("content"),
                        is_error=block.get("is_error", False),
                    )
                )

    return ParsedMessage(
        id=msg_id,
        provider=AIProvider.CLAUDE,
        role=role,  # type: ignore
        content="\n\n".join(text_blocks),
        tool_calls=tool_calls if tool_calls else None,
        tool_results=tool_results if tool_results else None,
        metadata=metadata,
        raw_message=raw,
    )


def parse_openai_message(raw: Dict[str, Any]) -> ParsedMessage:
    """Parse OpenAI Chat Completion message"""
    msg_id = raw.get("id", str(uuid.uuid4()))
    role = raw.get("role", "assistant")
    content = raw.get("content") or ""

    metadata = MessageMetadata(
        extra={"name": raw.get("name")} if raw.get("name") else {}
    )

    # Parse tool calls
    tool_calls: List[ToolCall] = []
    if raw.get("tool_calls"):
        for tc in raw["tool_calls"]:
            try:
                arguments = json.loads(tc["function"]["arguments"])
            except (json.JSONDecodeError, KeyError):
                arguments = {}

            tool_calls.append(
                ToolCall(
                    id=tc.get("id", str(uuid.uuid4())),
                    name=tc["function"]["name"],
                    arguments=arguments,
                )
            )

    # Parse legacy function call
    if raw.get("function_call"):
        try:
            arguments = json.loads(raw["function_call"]["arguments"])
        except json.JSONDecodeError:
            arguments = {}

        tool_calls.append(
            ToolCall(
                id=str(uuid.uuid4()),
                name=raw["function_call"]["name"],
                arguments=arguments,
            )
        )

    # Parse tool result
    tool_results: Optional[List[ToolResult]] = None
    if role == "tool" and raw.get("tool_call_id"):
        tool_results = [
            ToolResult(
                tool_call_id=raw["tool_call_id"], result=content, is_error=False
            )
        ]

    # Normalize role
    normalized_role = role if role != "function" else "assistant"

    return ParsedMessage(
        id=msg_id,
        provider=AIProvider.OPENAI,
        role=normalized_role,  # type: ignore
        content=content if isinstance(content, str) else "",
        tool_calls=tool_calls if tool_calls else None,
        tool_results=tool_results,
        metadata=metadata,
        raw_message=raw,
    )


def parse_copilotkit_message(raw: Dict[str, Any]) -> ParsedMessage:
    """Parse CopilotKit runtime message"""
    msg_id = raw.get("id", str(uuid.uuid4()))
    role = raw.get("role", "assistant")

    metadata = MessageMetadata()
    if raw.get("createdAt"):
        metadata.timestamp = str(raw["createdAt"])

    # Check if it's an action execution
    if "actionExecution" in raw:
        action = raw["actionExecution"]
        content = f"[Action: {action.get('name', 'unknown')}]"

        tool_calls = [
            ToolCall(
                id=action.get("id", str(uuid.uuid4())),
                name=action.get("name", ""),
                arguments=action.get("arguments", {}),
            )
        ]

        tool_results = None
        if action.get("status") in ["complete", "error"]:
            tool_results = [
                ToolResult(
                    tool_call_id=action.get("id", ""),
                    result=action.get("result"),
                    is_error=action.get("status") == "error",
                )
            ]

        return ParsedMessage(
            id=msg_id,
            provider=AIProvider.COPILOTKIT,
            role=role,  # type: ignore
            content=content,
            tool_calls=tool_calls,
            tool_results=tool_results,
            metadata=metadata,
            raw_message=raw,
        )

    # Regular text message
    content = raw.get("content", "")
    return ParsedMessage(
        id=msg_id,
        provider=AIProvider.COPILOTKIT,
        role=role,  # type: ignore
        content=content if isinstance(content, str) else "",
        metadata=metadata,
        raw_message=raw,
    )


def parse_n8n_message(raw: Dict[str, Any]) -> ParsedMessage:
    """Parse n8n webhook/execution response"""
    msg_id = raw.get("executionId", str(uuid.uuid4()))

    metadata = MessageMetadata(
        execution_id=raw.get("executionId"),
        extra={
            "workflowId": raw.get("workflowId"),
            **(raw.get("metadata", {})),
        },
    )

    # Format data as JSON
    data = raw.get("data", {})
    content = json.dumps(data, indent=2)

    return ParsedMessage(
        id=msg_id,
        provider=AIProvider.N8N,
        role="assistant",
        content=content,
        metadata=metadata,
        raw_message=raw,
    )


def best_effort_parse(raw: Any, provider: AIProvider) -> ParsedMessage:
    """
    Best-effort parsing for unknown or malformed messages.
    Used in loose validation mode.
    """
    if not isinstance(raw, dict):
        return ParsedMessage(
            id=f"msg_{uuid.uuid4()}",
            provider=provider,
            role="assistant",
            content=str(raw),
            metadata=MessageMetadata(
                extra={"best_effort": True, "original_provider": provider.value}
            ),
            raw_message=raw,
        )

    obj: Dict[str, Any] = raw

    content = obj.get("content")
    if isinstance(content, str):
        content_str = content
    else:
        content_str = json.dumps(content or obj, indent=2)

    return ParsedMessage(
        id=obj.get("id", f"msg_{uuid.uuid4()}"),
        provider=provider,
        role=obj.get("role", "assistant"),  # type: ignore
        content=content_str,
        metadata=MessageMetadata(
            extra={"best_effort": True, "original_provider": provider.value}
        ),
        raw_message=raw,
    )
