"""
Message Ingestion Core

Main ingestion functionality for Python agent.
"""

from __future__ import annotations

from typing import Any, Dict, List

from .detection import detect_provider
from .parsers import (
    best_effort_parse,
    parse_claude_message,
    parse_copilotkit_message,
    parse_n8n_message,
    parse_openai_message,
)
from .types import (
    AIProvider,
    BatchIngestResult,
    IngestionConfig,
    IngestResult,
    MessageIngestionError,
    ParsedMessage,
    ValidationMode,
)

# Parser registry
PARSER_REGISTRY: Dict[AIProvider, Any] = {
    AIProvider.CLAUDE: parse_claude_message,
    AIProvider.OPENAI: parse_openai_message,
    AIProvider.COPILOTKIT: parse_copilotkit_message,
    AIProvider.N8N: parse_n8n_message,
}


def ingest_message(
    raw_message: Any, config: IngestionConfig | None = None
) -> IngestResult:
    """
    Ingest a single AI agent message.

    Args:
        raw_message: Raw message data from any AI provider
        config: Optional ingestion configuration

    Returns:
        IngestResult with success status and parsed data or error
    """
    if config is None:
        config = IngestionConfig()

    try:
        # 1. Detect provider
        provider = detect_provider(raw_message)

        # 2. Try parser registry (fast path)
        parser = PARSER_REGISTRY.get(provider)
        if parser:
            try:
                parsed = parser(raw_message)
                return IngestResult(success=True, data=parsed)
            except Exception as e:
                if config.validation_mode == ValidationMode.STRICT:
                    raise MessageIngestionError(
                        f"Validation failed for provider {provider.value}: {e}",
                        provider,
                        raw_message,
                    )
                # Fall through to best-effort in loose mode

        # 3. Best-effort parsing (loose mode or unknown provider)
        if config.validation_mode == ValidationMode.LOOSE or provider == AIProvider.UNKNOWN:
            parsed = best_effort_parse(raw_message, provider)
            return IngestResult(success=True, data=parsed)

        # 4. Strict mode with no parser found
        raise MessageIngestionError(
            f"No parser found for provider {provider.value}",
            provider,
            raw_message,
        )

    except MessageIngestionError as e:
        return IngestResult(
            success=False,
            error=str(e),
            error_details={
                "provider": e.provider.value,
                "validation_errors": e.validation_errors,
            },
        )
    except Exception as e:
        return IngestResult(
            success=False,
            error=f"Ingestion failed: {e}",
            error_details={"exception_type": type(e).__name__},
        )


def ingest_message_batch(
    raw_messages: List[Any], config: IngestionConfig | None = None
) -> BatchIngestResult:
    """
    Ingest a batch of AI agent messages.

    Args:
        raw_messages: List of raw message data
        config: Optional ingestion configuration

    Returns:
        BatchIngestResult with successful and failed messages
    """
    if config is None:
        config = IngestionConfig()

    successful: List[ParsedMessage] = []
    failed: List[Dict[str, Any]] = []

    for raw_message in raw_messages:
        result = ingest_message(raw_message, config)

        if result.success and result.data:
            successful.append(result.data)
        else:
            failed.append(
                {
                    "raw": raw_message,
                    "error": result.error,
                    "error_details": result.error_details,
                }
            )

    return BatchIngestResult(
        successful=successful,
        failed=failed,
        stats={
            "total": len(raw_messages),
            "succeeded": len(successful),
            "failed": len(failed),
        },
    )
