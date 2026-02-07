"""
GreptimeDB Logger for Agent Observability
Logs agent conversations, tool calls, and metrics to GreptimeDB
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class GreptimeLogger:
    """
    Logger for agent conversations to GreptimeDB.

    Supports multiple insertion methods:
    1. SQL INSERT via HTTP API (default)
    2. OpenTelemetry Protocol (OTLP) - for broader telemetry
    3. Batch insertion for performance
    """

    def __init__(
        self,
        host: str | None = None,
        database: str | None = None,
        username: str | None = None,
        password: str | None = None,
        provider_name: str | None = None,
        environment: str | None = None,
        enabled: bool | None = None,
    ):
        """Initialize GreptimeDB logger with configuration."""
        self.host = host or os.getenv("GREPTIME_HOST", "localhost:4000")
        self.database = database or os.getenv("GREPTIME_DB", "public")
        self.username = username or os.getenv("GREPTIME_USERNAME", "")
        self.password = password or os.getenv("GREPTIME_PASSWORD", "")
        self.provider_name = provider_name or os.getenv("AGENT_PROVIDER_NAME", "adk-agent")
        self.environment = environment or os.getenv("AGENT_ENVIRONMENT", "development")
        self.enabled = enabled if enabled is not None else os.getenv("AGENT_OBSERVABILITY_ENABLED", "true").lower() == "true"

        # HTTP client for API calls
        self.client = httpx.Client(timeout=30.0)

        # Batch buffer for performance
        self.batch_buffer: List[Dict[str, Any]] = []
        self.batch_size = int(os.getenv("GREPTIME_BATCH_SIZE", "10"))

        # Cost tracking configuration
        self.enable_cost_tracking = os.getenv("ENABLE_COST_TRACKING", "false").lower() == "true"
        self.cost_per_1k_input = float(os.getenv("GEMINI_COST_PER_1K_INPUT_TOKENS", "0.00025"))
        self.cost_per_1k_output = float(os.getenv("GEMINI_COST_PER_1K_OUTPUT_TOKENS", "0.00075"))

        if not self.enabled:
            logger.info("GreptimeDB observability disabled via AGENT_OBSERVABILITY_ENABLED=false")
        else:
            logger.info(f"GreptimeDB observability enabled: {self.host}/{self.database} (provider: {self.provider_name})")

    def _calculate_cost(self, tokens_input: int, tokens_output: int) -> float:
        """Calculate cost in USD based on token usage."""
        if not self.enable_cost_tracking:
            return 0.0

        cost_input = (tokens_input / 1000.0) * self.cost_per_1k_input
        cost_output = (tokens_output / 1000.0) * self.cost_per_1k_output
        return cost_input + cost_output

    def _execute_sql(self, sql: str) -> Dict[str, Any]:
        """Execute SQL via GreptimeDB HTTP API."""
        if not self.enabled:
            return {"status": "disabled"}

        url = f"http://{self.host}/v1/sql"

        try:
            response = self.client.post(
                url,
                data={"sql": sql, "db": self.database},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                auth=(self.username, self.password) if self.username else None,
            )
            response.raise_for_status()
            return {"status": "success", "data": response.json()}
        except Exception as e:
            logger.error(f"GreptimeDB SQL execution failed: {e}")
            return {"status": "error", "error": str(e)}

    def log_conversation(
        self,
        conversation_id: str,
        user_query: str,
        agent_response: str,
        provider: str | None = None,
        model: str | None = None,
        message_id: str | None = None,
        system_prompt: str | None = None,
        tool_calls: List[Dict[str, Any]] | None = None,
        tool_results: List[Dict[str, Any]] | None = None,
        tokens_input: int | None = None,
        tokens_output: int | None = None,
        latency_ms: float | None = None,
        intent: str | None = None,
        outcome: str = "success",
        error_message: str | None = None,
        user_id: str | None = None,
        session_id: str | None = None,
        metadata: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        """
        Log a conversation to GreptimeDB.

        Args:
            conversation_id: Unique conversation identifier
            user_query: User's input query
            agent_response: Agent's response
            provider: Provider name (defaults to configured provider)
            model: Model used (e.g., 'gemini-2.0-flash-exp')
            message_id: Unique message identifier (auto-generated if None)
            system_prompt: System prompt/context
            tool_calls: List of tool invocations
            tool_results: List of tool results
            tokens_input: Input token count
            tokens_output: Output token count
            latency_ms: Response latency in milliseconds
            intent: Detected user intent
            outcome: Conversation outcome ('success', 'failure', 'partial')
            error_message: Error message if outcome='failure'
            user_id: User identifier
            session_id: Session identifier
            metadata: Additional metadata (JSON)

        Returns:
            Dictionary with status and any error information
        """
        if not self.enabled:
            return {"status": "disabled"}

        # Generate IDs and defaults
        message_id = message_id or str(uuid.uuid4())
        provider = provider or self.provider_name
        timestamp = datetime.utcnow().isoformat()

        # Calculate derived values
        tokens_total = (tokens_input or 0) + (tokens_output or 0)
        cost_usd = self._calculate_cost(tokens_input or 0, tokens_output or 0) if self.enable_cost_tracking else None

        # Prepare JSON fields
        tool_calls_json = json.dumps(tool_calls) if tool_calls else "NULL"
        tool_results_json = json.dumps(tool_results) if tool_results else "NULL"
        metadata_json = json.dumps(metadata) if metadata else "NULL"

        # Escape strings for SQL
        def escape_sql(s: str | None) -> str:
            if s is None:
                return "NULL"
            return "'" + s.replace("'", "''").replace("\\", "\\\\") + "'"

        # Build INSERT statement
        sql = f"""
        INSERT INTO agent_conversations (
            conversation_id, message_id, timestamp,
            provider, model,
            user_query, agent_response, system_prompt,
            tool_calls, tool_results,
            tokens_input, tokens_output, tokens_total,
            latency_ms, cost_usd,
            intent, outcome, error_message,
            user_id, session_id, environment,
            metadata
        ) VALUES (
            {escape_sql(conversation_id)},
            {escape_sql(message_id)},
            '{timestamp}',
            {escape_sql(provider)},
            {escape_sql(model)},
            {escape_sql(user_query)},
            {escape_sql(agent_response)},
            {escape_sql(system_prompt)},
            {tool_calls_json if tool_calls else "NULL"},
            {tool_results_json if tool_results else "NULL"},
            {tokens_input or "NULL"},
            {tokens_output or "NULL"},
            {tokens_total or "NULL"},
            {latency_ms or "NULL"},
            {cost_usd or "NULL"},
            {escape_sql(intent)},
            {escape_sql(outcome)},
            {escape_sql(error_message)},
            {escape_sql(user_id)},
            {escape_sql(session_id)},
            {escape_sql(self.environment)},
            {metadata_json if metadata else "NULL"}
        );
        """

        logger.debug(f"Logging conversation {conversation_id} to GreptimeDB")
        result = self._execute_sql(sql)

        if result.get("status") == "success":
            logger.info(f"✓ Logged conversation {conversation_id} (message: {message_id})")
        else:
            logger.error(f"✗ Failed to log conversation {conversation_id}: {result.get('error')}")

        return result

    def log_tool_usage(
        self,
        tool_name: str,
        provider: str | None = None,
        invocation_count: int = 1,
        success_count: int = 1,
        failure_count: int = 0,
        avg_duration_ms: float | None = None,
        min_duration_ms: float | None = None,
        max_duration_ms: float | None = None,
        error_types: Dict[str, int] | None = None,
    ) -> Dict[str, Any]:
        """
        Log tool usage metrics.

        This is typically called in batch (e.g., every minute) with aggregated stats.
        """
        if not self.enabled:
            return {"status": "disabled"}

        provider = provider or self.provider_name
        timestamp = datetime.utcnow().isoformat()
        error_types_json = json.dumps(error_types) if error_types else "NULL"

        sql = f"""
        INSERT INTO tool_usage_metrics (
            timestamp, tool_name, provider,
            invocation_count, success_count, failure_count,
            avg_duration_ms, min_duration_ms, max_duration_ms,
            error_types
        ) VALUES (
            '{timestamp}',
            '{tool_name}',
            '{provider}',
            {invocation_count},
            {success_count},
            {failure_count},
            {avg_duration_ms or "NULL"},
            {min_duration_ms or "NULL"},
            {max_duration_ms or "NULL"},
            {error_types_json if error_types else "NULL"}
        );
        """

        return self._execute_sql(sql)

    def query(self, sql: str) -> Dict[str, Any]:
        """Execute a SELECT query and return results."""
        return self._execute_sql(sql)

    def get_recent_conversations(self, limit: int = 20, provider: str | None = None) -> List[Dict[str, Any]]:
        """Get recent conversations for evaluation."""
        provider_filter = f"AND provider = '{provider}'" if provider else ""

        sql = f"""
        SELECT
            conversation_id,
            message_id,
            timestamp,
            provider,
            model,
            user_query,
            agent_response,
            tool_calls,
            tool_results,
            tokens_total,
            latency_ms,
            intent,
            outcome
        FROM agent_conversations
        WHERE timestamp > NOW() - INTERVAL '24 hours'
        {provider_filter}
        ORDER BY timestamp DESC
        LIMIT {limit};
        """

        result = self.query(sql)
        if result.get("status") == "success":
            return result.get("data", {}).get("rows", [])
        return []

    def get_unevaluated_conversations(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get conversations that haven't been evaluated yet."""
        sql = f"""
        SELECT
            c.conversation_id,
            c.message_id,
            c.user_query,
            c.agent_response,
            c.tool_calls,
            c.tool_results
        FROM agent_conversations c
        LEFT JOIN agent_evaluations e ON c.conversation_id = e.conversation_id AND c.message_id = e.message_id
        WHERE c.timestamp > NOW() - INTERVAL '7 days'
          AND e.evaluation_id IS NULL
        ORDER BY c.timestamp DESC
        LIMIT {limit};
        """

        result = self.query(sql)
        if result.get("status") == "success":
            return result.get("data", {}).get("rows", [])
        return []

    def close(self):
        """Close the HTTP client."""
        self.client.close()


# Singleton instance for easy import
_logger_instance: GreptimeLogger | None = None


def get_logger() -> GreptimeLogger:
    """Get or create singleton GreptimeDB logger instance."""
    global _logger_instance
    if _logger_instance is None:
        _logger_instance = GreptimeLogger()
    return _logger_instance
