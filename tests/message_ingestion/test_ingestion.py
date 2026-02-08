"""
Test Message Ingestion

Unit tests for message ingestion functionality.
"""


from agent.message_ingestion import (
    AIProvider,
    IngestionConfig,
    ValidationMode,
    detect_provider,
    ingest_message,
    ingest_message_batch,
)

# ============================================================================
# Sample Messages
# ============================================================================

CLAUDE_MESSAGE = {
    "id": "msg_123",
    "type": "message",
    "role": "assistant",
    "content": [
        {"type": "text", "text": "Let me check the weather."},
        {
            "type": "tool_use",
            "id": "toolu_01A09q90qw90lq917835lq9",
            "name": "get_weather",
            "input": {"location": "San Francisco, CA"},
        },
    ],
    "model": "claude-sonnet-4-20250514",
    "stop_reason": "tool_use",
    "usage": {"input_tokens": 100, "output_tokens": 50},
}

OPENAI_MESSAGE = {
    "id": "chatcmpl-123",
    "role": "assistant",
    "content": "Let me check the weather.",
    "tool_calls": [
        {
            "id": "call_abc123",
            "type": "function",
            "function": {
                "name": "get_weather",
                "arguments": '{"location": "San Francisco, CA"}',
            },
        }
    ],
}

COPILOTKIT_MESSAGE = {
    "id": "msg_456",
    "role": "assistant",
    "actionExecution": {
        "id": "action_789",
        "name": "search_docs",
        "arguments": {"query": "API reference"},
        "status": "executing",
    },
}

N8N_MESSAGE = {
    "executionId": "exec_123",
    "workflowId": "workflow_456",
    "data": {"result": "success", "output": [1, 2, 3]},
}


# ============================================================================
# Provider Detection Tests
# ============================================================================


def test_detect_claude_provider():
    """Test Claude message detection"""
    provider = detect_provider(CLAUDE_MESSAGE)
    assert provider == AIProvider.CLAUDE


def test_detect_openai_provider():
    """Test OpenAI message detection"""
    provider = detect_provider(OPENAI_MESSAGE)
    assert provider == AIProvider.OPENAI


def test_detect_copilotkit_provider():
    """Test CopilotKit message detection"""
    provider = detect_provider(COPILOTKIT_MESSAGE)
    assert provider == AIProvider.COPILOTKIT


def test_detect_n8n_provider():
    """Test n8n message detection"""
    provider = detect_provider(N8N_MESSAGE)
    assert provider == AIProvider.N8N


def test_detect_unknown_provider():
    """Test unknown provider detection"""
    provider = detect_provider({"unknown": "format"})
    assert provider == AIProvider.UNKNOWN


# ============================================================================
# Claude Message Ingestion Tests
# ============================================================================


def test_ingest_claude_message():
    """Test Claude message ingestion"""
    result = ingest_message(CLAUDE_MESSAGE)

    assert result.success
    assert result.data is not None
    assert result.data.provider == AIProvider.CLAUDE
    assert result.data.role == "assistant"
    assert "weather" in result.data.content.lower()
    assert result.data.tool_calls is not None
    assert len(result.data.tool_calls) == 1
    assert result.data.tool_calls[0].name == "get_weather"
    assert result.data.tool_calls[0].arguments["location"] == "San Francisco, CA"


def test_ingest_claude_text_only():
    """Test Claude message with text only"""
    message = {
        "role": "assistant",
        "content": [{"type": "text", "text": "Hello, world!"}],
    }

    result = ingest_message(message)
    assert result.success
    assert result.data is not None
    assert result.data.content == "Hello, world!"
    assert result.data.tool_calls is None


# ============================================================================
# OpenAI Message Ingestion Tests
# ============================================================================


def test_ingest_openai_message():
    """Test OpenAI message ingestion"""
    result = ingest_message(OPENAI_MESSAGE)

    assert result.success
    assert result.data is not None
    assert result.data.provider == AIProvider.OPENAI
    assert result.data.role == "assistant"
    assert result.data.content == "Let me check the weather."
    assert result.data.tool_calls is not None
    assert len(result.data.tool_calls) == 1
    assert result.data.tool_calls[0].name == "get_weather"


def test_ingest_openai_tool_result():
    """Test OpenAI tool result message"""
    message = {
        "role": "tool",
        "tool_call_id": "call_abc123",
        "content": '{"temperature": 72}',
    }

    result = ingest_message(message)
    assert result.success
    assert result.data is not None
    assert result.data.tool_results is not None
    assert len(result.data.tool_results) == 1
    assert result.data.tool_results[0].tool_call_id == "call_abc123"


# ============================================================================
# CopilotKit Message Ingestion Tests
# ============================================================================


def test_ingest_copilotkit_action():
    """Test CopilotKit action execution message"""
    result = ingest_message(COPILOTKIT_MESSAGE)

    assert result.success
    assert result.data is not None
    assert result.data.provider == AIProvider.COPILOTKIT
    assert result.data.tool_calls is not None
    assert result.data.tool_calls[0].name == "search_docs"


def test_ingest_copilotkit_text():
    """Test CopilotKit text message"""
    message = {"id": "msg_123", "role": "user", "content": "Hello"}

    result = ingest_message(message)
    assert result.success
    assert result.data is not None
    assert result.data.content == "Hello"


# ============================================================================
# n8n Message Ingestion Tests
# ============================================================================


def test_ingest_n8n_message():
    """Test n8n webhook response ingestion"""
    result = ingest_message(N8N_MESSAGE)

    assert result.success
    assert result.data is not None
    assert result.data.provider == AIProvider.N8N
    assert result.data.metadata.execution_id == "exec_123"
    assert "success" in result.data.content


# ============================================================================
# Batch Ingestion Tests
# ============================================================================


def test_ingest_message_batch():
    """Test batch message ingestion"""
    messages = [
        CLAUDE_MESSAGE,
        OPENAI_MESSAGE,
        COPILOTKIT_MESSAGE,
        N8N_MESSAGE,
    ]

    result = ingest_message_batch(messages)

    assert result.stats["total"] == 4
    assert result.stats["succeeded"] == 4
    assert result.stats["failed"] == 0
    assert len(result.successful) == 4


def test_ingest_batch_with_failures():
    """Test batch ingestion with some failures"""
    messages = [
        CLAUDE_MESSAGE,
        {"invalid": "format"},  # Will succeed in loose mode, fail in strict
        OPENAI_MESSAGE,
    ]

    # Strict mode - should have failures for unknown format
    result_strict = ingest_message_batch(
        messages, IngestionConfig(validation_mode=ValidationMode.STRICT)
    )
    assert result_strict.stats["failed"] == 1

    # Loose mode - best-effort parsing
    result_loose = ingest_message_batch(
        messages, IngestionConfig(validation_mode=ValidationMode.LOOSE)
    )
    assert result_loose.stats["succeeded"] == 3


# ============================================================================
# Validation Mode Tests
# ============================================================================


def test_strict_mode_rejects_malformed():
    """Test strict validation mode rejects malformed messages"""
    config = IngestionConfig(validation_mode=ValidationMode.STRICT)
    result = ingest_message({"invalid": "message"}, config)

    assert not result.success
    assert result.error is not None


def test_loose_mode_accepts_malformed():
    """Test loose validation mode accepts malformed messages"""
    config = IngestionConfig(validation_mode=ValidationMode.LOOSE)
    result = ingest_message({"invalid": "message"}, config)

    assert result.success
    assert result.data is not None
    assert result.data.provider == AIProvider.UNKNOWN


# ============================================================================
# Edge Cases
# ============================================================================


def test_empty_message():
    """Test handling of empty message"""
    config = IngestionConfig(validation_mode=ValidationMode.LOOSE)
    result = ingest_message({}, config)

    assert result.success
    assert result.data is not None


def test_non_dict_message():
    """Test handling of non-dict message"""
    config = IngestionConfig(validation_mode=ValidationMode.LOOSE)
    result = ingest_message("plain string message", config)

    assert result.success
    assert result.data is not None
    assert result.data.content == "plain string message"


def test_null_message():
    """Test handling of null message"""
    config = IngestionConfig(validation_mode=ValidationMode.LOOSE)
    result = ingest_message(None, config)

    assert result.success  # Best-effort parsing should handle this


# ============================================================================
# Integration Tests
# ============================================================================


def test_full_conversation_flow():
    """Test ingesting a full conversation"""
    conversation = [
        {"role": "user", "content": [{"type": "text", "text": "What's the weather?"}]},
        CLAUDE_MESSAGE,  # Tool call
        {
            "role": "user",
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": "toolu_01A09q90qw90lq917835lq9",
                    "content": '{"temperature": 72, "conditions": "sunny"}',
                }
            ],
        },
        {
            "role": "assistant",
            "content": [
                {"type": "text", "text": "It's 72°F and sunny in San Francisco!"}
            ],
        },
    ]

    result = ingest_message_batch(conversation)

    assert result.stats["succeeded"] == 4
    assert result.stats["failed"] == 0

    # Verify message sequence
    messages = result.successful
    assert messages[0].role == "user"
    assert messages[1].tool_calls is not None
    assert messages[2].tool_results is not None
    assert "72°F" in messages[3].content
