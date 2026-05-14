"""
Agent Tool: Ingest Agent Responses

Add this to agent/main.py to integrate message ingestion with the agent.
"""

from typing import Any, Dict, List

from copilotkit.adk import ToolContext

from agent.message_ingestion import (
    IngestionConfig,
    ValidationMode,
    ingest_message_batch,
)


def register_ingestion_tool(agent):
    """Register the ingest_agent_responses tool with the agent."""

    @agent.tool(
        description="Ingest and normalize AI agent chat responses from multiple providers (Claude, OpenAI, CopilotKit, n8n). "
        "Converts diverse message formats into a unified structure for analysis and storage."
    )
    def ingest_agent_responses(
        tool_context: ToolContext,
        messages: List[Dict[str, Any]],
        validation_mode: str = "strict",
        store_in_state: bool = True,
    ) -> Dict[str, Any]:
        """
        Ingest AI agent chat responses from multiple providers.

        Args:
            tool_context: Agent tool context
            messages: List of raw message objects from AI providers (Claude, OpenAI, CopilotKit, n8n)
            validation_mode: "strict" (reject malformed) or "loose" (best-effort parsing)
            store_in_state: Whether to store parsed messages in agent state

        Returns:
            {"status": "success"|"error", "message": str, "stats": {...}, "messages": [...]}
        """
        if not messages or not isinstance(messages, list):
            return {
                "status": "error",
                "message": "Invalid input: messages must be a non-empty list",
            }

        try:
            # Configure ingestion
            config = IngestionConfig(
                validation_mode=(
                    ValidationMode.STRICT
                    if validation_mode == "strict"
                    else ValidationMode.LOOSE
                ),
                discovery_fallback=validation_mode == "loose",
            )

            # Ingest messages
            result = ingest_message_batch(messages, config)

            # Convert to JSON-serializable format
            parsed_messages = [
                {
                    "id": msg.id,
                    "provider": msg.provider.value,
                    "role": msg.role,
                    "content": msg.content,
                    "toolCalls": (
                        [
                            {
                                "id": tc.id,
                                "name": tc.name,
                                "arguments": tc.arguments,
                            }
                            for tc in msg.tool_calls
                        ]
                        if msg.tool_calls
                        else None
                    ),
                    "toolResults": (
                        [
                            {
                                "toolCallId": tr.tool_call_id,
                                "result": tr.result,
                                "isError": tr.is_error,
                            }
                            for tr in msg.tool_results
                        ]
                        if msg.tool_results
                        else None
                    ),
                    "metadata": {
                        "model": msg.metadata.model,
                        "tokens": msg.metadata.tokens,
                        "stopReason": msg.metadata.stop_reason,
                        "timestamp": msg.metadata.timestamp,
                        "executionId": msg.metadata.execution_id,
                        **(msg.metadata.extra or {}),
                    },
                }
                for msg in result.successful
            ]

            # Store in agent state if requested
            if store_in_state:
                existing = tool_context.state.get("ingested_messages", [])
                tool_context.state["ingested_messages"] = existing + parsed_messages

            # Return results
            response = {
                "status": "success",
                "message": f"Ingested {len(parsed_messages)} messages ({result.stats['failed']} failed)",
                "stats": result.stats,
                "messages": parsed_messages,
            }

            # Include failure details if any
            if result.failed:
                response["failed"] = [
                    {"error": f["error"], "raw": f["raw"]} for f in result.failed
                ]

            return response

        except Exception as e:
            return {
                "status": "error",
                "message": f"Ingestion failed: {str(e)}",
                "error_type": type(e).__name__,
            }


# Usage example for agent/main.py:
"""
from agent.tools.ingestion_tool import register_ingestion_tool

# In your agent initialization:
agent = Agent(...)
register_ingestion_tool(agent)
"""
