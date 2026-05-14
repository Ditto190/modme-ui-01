"""
Example: Initialize Phoenix observability for AI agent

This example demonstrates how to set up Phoenix with OpenInference
for multi-provider AI tracing.
"""

from observability import initialize_phoenix, instrument_all_providers

# 1. Initialize Phoenix (also sets up dual export to GreptimeDB if enabled)
tracer, config = initialize_phoenix(
    enable_greptime=True,  # Dual export to GreptimeDB
    enable_console=False    # Console debugging (set to True for verbose output)
)

# 2. Auto-instrument all AI providers
instrumentors = instrument_all_providers()

print(f"Phoenix UI available at: {config.phoenix_endpoint}")
print(f"Instrumented providers: {list(instrumentors.keys())}")

# 3. Now all AI SDK calls are automatically traced!
# Example with Anthropic
from anthropic import Anthropic

client = Anthropic(api_key="your-key")  # Automatically traced!
response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello, Claude!"}]
)

print(f"Response: {response.content[0].text}")
print(f"\nView trace at: {config.phoenix_endpoint}")

# 4. Manual span attributes (for custom providers or additional context)
from observability import add_llm_span_attributes

with tracer.start_as_current_span("custom_agent_interaction") as span:
    add_llm_span_attributes(
        span,
        provider="custom",
        model="my-model",
        input_tokens=100,
        output_tokens=50,
        latency_ms=1500
    )

    # Your custom agent logic...
    pass

print("\n✅ Phoenix observability initialized successfully!")
print(f"📊 View traces at: {config.phoenix_endpoint}")
