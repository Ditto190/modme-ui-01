"""
VSCode Telemetry Adapter for GitHub Copilot with Phoenix Integration
Captures Copilot Chat conversations and code completions using OpenTelemetry spans

This module provides OpenTelemetry-based tracing for GitHub Copilot interactions,
integrating seamlessly with Phoenix observability platform.
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class VSCodeCopilotTelemetryAdapter:
    """
    OpenTelemetry-based adapter for GitHub Copilot interactions.

    Integrates with Phoenix observability platform to capture:
    - Chat conversations (request/response pairs)
    - Code completions (inline suggestions)
    - Multi-turn conversations
    - Context metadata (files, selections, workspace)

    Architecture:
    1. VSCode extension captures telemetry events
    2. Extension calls this adapter via HTTP API or MCP
    3. Adapter creates OpenTelemetry spans with OpenInference attributes
    4. Spans exported to Phoenix + GreptimeDB

    Requires:
    - Phoenix tracing initialized (see phoenix_config.py)
    - Custom VSCode extension (see docs/VSCODE_COPILOT_EXTENSION.md)
    """

    def __init__(self, tracer: Optional[trace.Tracer] = None):
        """
        Initialize VSCode Copilot telemetry adapter.

        Args:
            tracer: Optional custom tracer. If not provided, uses global tracer.
        """
        self.tracer = tracer or trace.get_tracer(__name__)
        self.active_conversations: Dict[str, Dict[str, Any]] = {}

    def log_chat_request(
        self,
        request_id: str,
        user_query: str,
        conversation_id: str | None = None,
        context: Dict[str, Any] | None = None,
    ) -> str:
        """
        Start OpenTelemetry span for GitHub Copilot Chat request.

        Args:
            request_id: Unique request ID from VSCode telemetry
            user_query: User's question to Copilot
            conversation_id: Optional conversation ID for multi-turn tracking
            context: Optional context data (file path, selection, etc.)

        Returns:
            conversation_id
        """
        conv_id = conversation_id or str(uuid.uuid4())

        # Start a new span for this conversation
        span = self.tracer.start_span(f"copilot.chat.{request_id}")

        # Add OpenInference semantic attributes
        span.set_attribute("llm.provider", "github-copilot")
        span.set_attribute("llm.request_type", "chat")
        span.set_attribute("conversation.id", conv_id)
        span.set_attribute("input.value", user_query)

        # Add context metadata
        if context:
            if "file_path" in context:
                span.set_attribute("code.file_path", context["file_path"])
            if "language" in context:
                span.set_attribute("code.language", context["language"])
            if "selection" in context:
                span.set_attribute("code.selection", json.dumps(context["selection"]))
            if "workspace" in context:
                span.set_attribute("workspace.name", context["workspace"])

        # Store pending request with span
        self.active_conversations[request_id] = {
            "request_id": request_id,
            "conversation_id": conv_id,
            "user_query": user_query,
            "timestamp": datetime.utcnow(),
            "context": context or {},
            "span": span,
        }

        logger.info(f"Started Copilot chat span: {request_id}")
        return conv_id

    def log_chat_response(
        self,
        request_id: str,
        agent_response: str,
        model: str = "gpt-4o",
        tool_calls: list | None = None,
        input_tokens: int | None = None,
        output_tokens: int | None = None,
        latency_ms: int | None = None,
        finish_reason: str | None = None,
    ) -> Dict[str, str]:
        """
        Complete OpenTelemetry span for GitHub Copilot Chat response.

        Args:
            request_id: Request ID matching log_chat_request
            agent_response: Copilot's response
            model: Model used (default: gpt-4o)
            tool_calls: Optional tool/function calls made
            input_tokens: Input token count
            output_tokens: Output token count
            latency_ms: Optional response latency (auto-calculated if not provided)
            finish_reason: Stop reason (e.g., "stop", "length", "tool_calls")

        Returns:
            Status dict
        """
        if request_id not in self.active_conversations:
            logger.warning(f"Unknown request_id: {request_id}")
            return {"status": "error", "message": "Unknown request_id"}

        # Get pending request with span
        pending = self.active_conversations.pop(request_id)
        span = pending["span"]

        try:
            # Calculate latency if not provided
            if latency_ms is None:
                start_time = pending["timestamp"]
                end_time = datetime.utcnow()
                latency_ms = int((end_time - start_time).total_seconds() * 1000)

            # Add response attributes
            span.set_attribute("output.value", agent_response)
            span.set_attribute("llm.model", model)

            # Add token counts
            if input_tokens is not None:
                span.set_attribute("llm.token_count.prompt", input_tokens)
            if output_tokens is not None:
                span.set_attribute("llm.token_count.completion", output_tokens)
            if input_tokens and output_tokens:
                span.set_attribute("llm.token_count.total", input_tokens + output_tokens)

            span.set_attribute("llm.latency_ms", latency_ms)

            if finish_reason:
                span.set_attribute("llm.finish_reason", finish_reason)

            # Add tool calls if present
            if tool_calls:
                span.set_attribute("llm.tool_calls", json.dumps(tool_calls))
                span.set_attribute("llm.tool_call_count", len(tool_calls))

            # Mark span as successful
            span.set_status(Status(StatusCode.OK))

            logger.info(f"Completed Copilot chat span: {request_id} (latency: {latency_ms}ms)")

            return {
                "status": "success",
                "conversation_id": pending["conversation_id"],
                "request_id": request_id,
                "latency_ms": latency_ms,
            }

        except Exception as e:
            # Mark span as error
            span.set_status(Status(StatusCode.ERROR, str(e)))
            span.record_exception(e)
            logger.error(f"Failed to complete Copilot span: {e}")
            return {"status": "error", "message": str(e)}

        finally:
            # Always end the span
            span.end()

    def log_completion_accepted(
        self,
        completion_text: str,
        language: str,
        file_path: str | None = None,
        conversation_id: str | None = None,
        input_tokens: int | None = None,
        output_tokens: int | None = None,
    ) -> Dict[str, str]:
        """
        Log GitHub Copilot code completion acceptance using OpenTelemetry.

        Tracks when user accepts inline code suggestions.

        Args:
            completion_text: The accepted code completion
            language: Programming language
            file_path: Optional file path where completion was inserted
            conversation_id: Optional conversation ID
            input_tokens: Input context tokens
            output_tokens: Completion tokens

        Returns:
            Status dict
        """
        conv_id = conversation_id or str(uuid.uuid4())

        with self.tracer.start_as_current_span("copilot.completion") as span:
            try:
                # Add OpenInference attributes
                span.set_attribute("llm.provider", "github-copilot")
                span.set_attribute("llm.model", "copilot-completion")
                span.set_attribute("llm.request_type", "completion")
                span.set_attribute("conversation.id", conv_id)
                span.set_attribute("output.value", completion_text)
                span.set_attribute("code.language", language)

                if file_path:
                    span.set_attribute("code.file_path", file_path)

                if input_tokens:
                    span.set_attribute("llm.token_count.prompt", input_tokens)
                if output_tokens:
                    span.set_attribute("llm.token_count.completion", output_tokens)

                span.set_status(Status(StatusCode.OK))
                logger.info(f"Logged Copilot completion for {language} in {file_path or 'unknown'}")

                return {
                    "status": "success",
                    "conversation_id": conv_id,
                    "file_path": file_path or "unknown",
                }

            except Exception as e:
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.record_exception(e)
                logger.error(f"Failed to log Copilot completion: {e}")
                return {"status": "error", "message": str(e)}

    def log_from_telemetry_event(
        self,
        telemetry_event: Dict[str, Any],
    ) -> Dict[str, str]:
        """
        Parse and log VSCode telemetry event.

        Expected event structure:
        {
            "event_type": "chat_request" | "chat_response" | "completion_accepted",
            "request_id": "...",
            "conversation_id": "...",
            "data": {...}
        }

        Args:
            telemetry_event: Raw telemetry event from VSCode

        Returns:
            Status dict
        """
        event_type = telemetry_event.get("event_type")

        if event_type == "chat_request":
            return {
                "status": "success",
                "conversation_id": self.log_chat_request(
                    request_id=telemetry_event["request_id"],
                    user_query=telemetry_event["data"]["user_query"],
                    conversation_id=telemetry_event.get("conversation_id"),
                    context=telemetry_event["data"].get("context"),
                ),
            }

        elif event_type == "chat_response":
            return self.log_chat_response(
                request_id=telemetry_event["request_id"],
                agent_response=telemetry_event["data"]["agent_response"],
                model=telemetry_event["data"].get("model", "gpt-4o"),
                tool_calls=telemetry_event["data"].get("tool_calls"),
                input_tokens=telemetry_event["data"].get("input_tokens"),
                output_tokens=telemetry_event["data"].get("output_tokens"),
                latency_ms=telemetry_event["data"].get("latency_ms"),
                finish_reason=telemetry_event["data"].get("finish_reason"),
            )

        elif event_type == "completion_accepted":
            return self.log_completion_accepted(
                completion_text=telemetry_event["data"]["completion_text"],
                language=telemetry_event["data"].get("language", "unknown"),
                file_path=telemetry_event["data"].get("file_path"),
                conversation_id=telemetry_event.get("conversation_id"),
                input_tokens=telemetry_event["data"].get("input_tokens"),
                output_tokens=telemetry_event["data"].get("output_tokens"),
            )

        else:
            return {"status": "error", "message": f"Unknown event_type: {event_type}"}


# Singleton instance
_adapter_instance: Optional[VSCodeCopilotTelemetryAdapter] = None


def get_vscode_copilot_adapter() -> VSCodeCopilotTelemetryAdapter:
    """Get singleton VSCode Copilot telemetry adapter."""
    global _adapter_instance
    if _adapter_instance is None:
        _adapter_instance = VSCodeCopilotTelemetryAdapter()
    return _adapter_instance


# FastAPI endpoint for VSCode extension integration
def create_fastapi_endpoint():
    """
    Create FastAPI endpoint for VSCode extension to send telemetry.

    Add to agent/main.py:

    ```python
    from observability.vscode_copilot_telemetry import create_fastapi_endpoint

    # Add route
    app.include_router(create_fastapi_endpoint())
    ```
    """
    try:
        from fastapi import APIRouter, HTTPException
        from pydantic import BaseModel
    except ImportError:
        logger.error("FastAPI not installed. Install with: pip install fastapi")
        raise

    router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])

    class TelemetryEvent(BaseModel):
        event_type: str
        request_id: str | None = None
        conversation_id: str | None = None
        data: Dict[str, Any]

    @router.post("/copilot")
    async def log_copilot_telemetry(event: TelemetryEvent):
        """Log GitHub Copilot telemetry event."""
        adapter = get_vscode_copilot_adapter()
        result = adapter.log_from_telemetry_event(event.dict())

        if result.get("status") == "error":
            raise HTTPException(status_code=400, detail=result.get("message"))

        return result

    return router


if __name__ == "__main__":
    # Test example with Phoenix tracing
    from observability.phoenix_config import initialize_phoenix

    # Initialize Phoenix
    tracer, config = initialize_phoenix(enable_console=True)

    # Create adapter
    adapter = VSCodeCopilotTelemetryAdapter(tracer=tracer)

    # Simulate chat request/response
    print("\n=== Testing Copilot Chat ===")
    conv_id = adapter.log_chat_request(
        request_id="test-123",
        user_query="How do I use async/await in Python?",
        context={"file_path": "main.py", "language": "python"}
    )
    print(f"Started conversation: {conv_id}")

    result = adapter.log_chat_response(
        request_id="test-123",
        agent_response="In Python, async/await is used for asynchronous programming...",
        model="gpt-4o",
        input_tokens=50,
        output_tokens=100,
        latency_ms=1234,
    )
    print(f"Response logged: {json.dumps(result, indent=2)}")

    # Simulate code completion
    print("\n=== Testing Copilot Completion ===")
    completion_result = adapter.log_completion_accepted(
        completion_text="async def fetch_data():\n    await asyncio.sleep(1)",
        language="python",
        file_path="async_example.py",
        output_tokens=25,
    )
    print(f"Completion logged: {json.dumps(completion_result, indent=2)}")

    print(f"\nView traces in Phoenix UI: {config.phoenix_endpoint}")
