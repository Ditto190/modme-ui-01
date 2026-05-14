"""
Message Ingestion Module

Ingest and normalize AI agent chat responses from multiple providers.
"""

from .detection import detect_provider
from .ingestion import ingest_message, ingest_message_batch
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
    MessageMetadata,
    ParsedMessage,
    SchemaDiscoveryError,
    ToolCall,
    ToolResult,
    ValidationMode,
)

__all__ = [
    # Core functions
    "ingest_message",
    "ingest_message_batch",
    "detect_provider",
    # Parsers
    "parse_claude_message",
    "parse_openai_message",
    "parse_copilotkit_message",
    "parse_n8n_message",
    "best_effort_parse",
    # Types
    "AIProvider",
    "ValidationMode",
    "ParsedMessage",
    "ToolCall",
    "ToolResult",
    "MessageMetadata",
    "IngestionConfig",
    "IngestResult",
    "BatchIngestResult",
    "MessageIngestionError",
    "SchemaDiscoveryError",
]
