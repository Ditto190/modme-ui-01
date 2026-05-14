"""
Example Usage: Message Ingestion

Demonstrates how to use the message ingestion system.
"""

from agent.message_ingestion import (
    IngestionConfig,
    ValidationMode,
    detect_provider,
    ingest_message,
    ingest_message_batch,
)


def example_basic_usage():
    """Basic usage example"""
    print("=== Basic Usage ===\n")

    # Single Claude message
    claude_msg = {
        "role": "assistant",
        "content": [
            {"type": "text", "text": "Let me check that for you."},
            {
                "type": "tool_use",
                "id": "toolu_123",
                "name": "search_database",
                "input": {"query": "user data"},
            },
        ],
    }

    result = ingest_message(claude_msg)
    if result.success:
        print(f"Provider: {result.data.provider.value}")
        print(f"Role: {result.data.role}")
        print(f"Content: {result.data.content}")
        if result.data.tool_calls:
            print(f"Tool calls: {len(result.data.tool_calls)}")
            for tc in result.data.tool_calls:
                print(f"  - {tc.name}: {tc.arguments}")


def example_batch_processing():
    """Batch processing example"""
    print("\n=== Batch Processing ===\n")

    messages = [
        {
            "role": "assistant",
            "content": [{"type": "text", "text": "Hello from Claude!"}],
        },
        {
            "role": "assistant",
            "content": "Hello from OpenAI!",
            "tool_calls": [
                {
                    "id": "call_123",
                    "type": "function",
                    "function": {
                        "name": "get_time",
                        "arguments": "{}",
                    },
                }
            ],
        },
        {
            "id": "msg_456",
            "role": "user",
            "content": "Hello from CopilotKit!",
        },
    ]

    result = ingest_message_batch(messages)

    print(f"Total: {result.stats['total']}")
    print(f"Succeeded: {result.stats['succeeded']}")
    print(f"Failed: {result.stats['failed']}")
    print()

    for msg in result.successful:
        print(f"[{msg.provider.value}] {msg.role}: {msg.content[:50]}...")


def example_provider_detection():
    """Provider detection example"""
    print("\n=== Provider Detection ===\n")

    test_messages = [
        (
            "Claude",
            {
                "role": "assistant",
                "content": [{"type": "tool_use", "id": "123", "name": "test", "input": {}}],
            },
        ),
        ("OpenAI", {"role": "assistant", "tool_calls": []}),
        ("CopilotKit", {"id": "123", "role": "user", "content": "hi"}),
        ("n8n", {"executionId": "123", "workflowId": "456", "data": {}}),
        ("Unknown", {"custom": "format"}),
    ]

    for name, msg in test_messages:
        detected = detect_provider(msg)
        print(f"{name:12} → {detected.value}")


def example_validation_modes():
    """Validation mode example"""
    print("\n=== Validation Modes ===\n")

    malformed_message = {"strange": "format", "not": "standard"}

    # Strict mode
    print("Strict mode:")
    config_strict = IngestionConfig(validation_mode=ValidationMode.STRICT)
    result_strict = ingest_message(malformed_message, config_strict)
    print(f"  Success: {result_strict.success}")
    if not result_strict.success:
        print(f"  Error: {result_strict.error}")

    # Loose mode
    print("\nLoose mode:")
    config_loose = IngestionConfig(validation_mode=ValidationMode.LOOSE)
    result_loose = ingest_message(malformed_message, config_loose)
    print(f"  Success: {result_loose.success}")
    if result_loose.success:
        print(f"  Content: {result_loose.data.content}")


def example_full_conversation():
    """Full conversation example"""
    print("\n=== Full Conversation ===\n")

    conversation = [
        {
            "role": "user",
            "content": [{"type": "text", "text": "What's the weather in SF?"}],
        },
        {
            "role": "assistant",
            "content": [
                {"type": "text", "text": "Let me check that."},
                {
                    "type": "tool_use",
                    "id": "toolu_weather_123",
                    "name": "get_weather",
                    "input": {"location": "San Francisco"},
                },
            ],
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": "toolu_weather_123",
                    "content": '{"temp": 68, "conditions": "cloudy"}',
                }
            ],
        },
        {
            "role": "assistant",
            "content": [
                {"type": "text", "text": "It's 68°F and cloudy in San Francisco!"}
            ],
        },
    ]

    result = ingest_message_batch(conversation)

    print(f"Processed {result.stats['succeeded']} messages:\n")
    for i, msg in enumerate(result.successful, 1):
        content_preview = msg.content[:60] + "..." if len(msg.content) > 60 else msg.content
        print(f"{i}. [{msg.role:9}] {content_preview}")

        if msg.tool_calls:
            for tc in msg.tool_calls:
                print(f"     → Tool: {tc.name}")

        if msg.tool_results:
            print(f"     → Tool results: {len(msg.tool_results)}")


def example_metadata_extraction():
    """Metadata extraction example"""
    print("\n=== Metadata Extraction ===\n")

    message = {
        "id": "msg_abc123",
        "role": "assistant",
        "content": [{"type": "text", "text": "Response text"}],
        "model": "claude-sonnet-4-20250514",
        "stop_reason": "end_turn",
        "usage": {"input_tokens": 150, "output_tokens": 75},
    }

    result = ingest_message(message)
    if result.success:
        metadata = result.data.metadata
        print(f"Message ID: {result.data.id}")
        print(f"Model: {metadata.model}")
        print(f"Stop reason: {metadata.stop_reason}")
        print(f"Tokens: {metadata.tokens}")


if __name__ == "__main__":
    example_basic_usage()
    example_batch_processing()
    example_provider_detection()
    example_validation_modes()
    example_full_conversation()
    example_metadata_extraction()

    print("\n✅ All examples completed!")
