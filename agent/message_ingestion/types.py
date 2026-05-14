"""
Message Ingestion Types

Type definitions for Python agent implementation.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Literal, Optional


class AIProvider(str, Enum):
    """AI provider types"""

    CLAUDE = "claude"
    OPENAI = "openai"
    COPILOTKIT = "copilotkit"
    N8N = "n8n"
    CUSTOM = "custom"
    UNKNOWN = "unknown"


class ValidationMode(str, Enum):
    """Validation strictness modes"""

    STRICT = "strict"
    LOOSE = "loose"


@dataclass
class ToolCall:
    """Represents a tool/function call"""

    id: str
    name: str
    arguments: Dict[str, Any]


@dataclass
class ToolResult:
    """Represents a tool execution result"""

    tool_call_id: str
    result: Any
    is_error: bool = False


@dataclass
class MessageMetadata:
    """Metadata associated with a message"""

    model: Optional[str] = None
    tokens: Optional[Dict[str, int]] = None
    stop_reason: Optional[str] = None
    timestamp: Optional[str] = None
    execution_id: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ParsedMessage:
    """Unified parsed message format"""

    id: str
    provider: AIProvider
    role: Literal["user", "assistant", "system", "tool"]
    content: str
    tool_calls: Optional[List[ToolCall]] = None
    tool_results: Optional[List[ToolResult]] = None
    metadata: MessageMetadata = field(default_factory=MessageMetadata)
    raw_message: Any = None


@dataclass
class IngestionConfig:
    """Configuration for message ingestion"""

    discovery_fallback: bool = True
    cache_strategy: Literal["memory", "redis", "none"] = "memory"
    validation_mode: ValidationMode = ValidationMode.STRICT
    batch_size: int = 100
    discovery_timeout: int = 30000  # milliseconds


@dataclass
class IngestResult:
    """Result of a single message ingestion"""

    success: bool
    data: Optional[ParsedMessage] = None
    error: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None


@dataclass
class BatchIngestResult:
    """Result of batch message ingestion"""

    successful: List[ParsedMessage]
    failed: List[Dict[str, Any]]
    stats: Dict[str, int]


class MessageIngestionError(Exception):
    """Error during message ingestion"""

    def __init__(
        self,
        message: str,
        provider: AIProvider,
        raw_message: Any,
        validation_errors: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.provider = provider
        self.raw_message = raw_message
        self.validation_errors = validation_errors


class SchemaDiscoveryError(Exception):
    """Error during schema discovery"""

    def __init__(self, message: str, sample_messages: List[Any]):
        super().__init__(message)
        self.sample_messages = sample_messages
