"""
Custom AI Provider Tracer for Phoenix

Provides OpenTelemetry tracing for custom AI providers that don't have
auto-instrumentation libraries. Use this for:
- Custom LLM APIs
- Internal AI models
- Provider-specific implementations
- Claude Desktop App
- Windsurf IDE
- Other AI coding assistants

Architecture:
1. Wrap LLM calls with context manager
2. Create OpenTelemetry spans with OpenInference attributes
3. Automatically export to Phoenix + GreptimeDB
"""

from __future__ import annotations

import logging
import time
from contextlib import contextmanager
from typing import Any, Dict, Optional

from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CustomProviderTracer:
    """
    Tracer for custom AI providers without auto-instrumentation.

    Example:
        >>> tracer = CustomProviderTracer(provider="my-llm")
        >>>
        >>> with tracer.trace_llm_call(
        ...     model="my-model-v1",
        ...     operation="chat_completion"
        ... ) as span:
        ...     response = my_llm_client.chat("Hello!")
        ...     tracer.set_tokens(span, input_tokens=10, output_tokens=20)
        ...     tracer.set_output(span, response)
    """

    def __init__(
        self,
        provider: str,
        tracer: Optional[trace.Tracer] = None,
    ):
        """
        Initialize custom provider tracer.

        Args:
            provider: Provider name (e.g., "claude-desktop", "windsurf", "cursor")
            tracer: Optional custom tracer (defaults to global tracer)
        """
        self.provider = provider
        self.tracer = tracer or trace.get_tracer(__name__)
        logger.info(f"[CustomTracer] Initialized for provider: {provider}")

    @contextmanager
    def trace_llm_call(
        self,
        model: str,
        operation: str = "llm_call",
        **span_attributes,
    ):
        """
        Context manager for tracing LLM calls.

        Args:
            model: Model name (e.g., "claude-3-5-sonnet", "windsurf-cascade")
            operation: Operation type (e.g., "chat_completion", "embedding")
            **span_attributes: Additional span attributes

        Yields:
            OpenTelemetry span for adding custom attributes

        Example:
            >>> with tracer.trace_llm_call(
            ...     model="claude-3-5-sonnet",
            ...     operation="chat_completion"
            ... ) as span:
            ...     response = claude_api.chat("Hello")
            ...     tracer.set_output(span, response)
        """
        span_name = f"{self.provider}.{operation}"

        with self.tracer.start_as_current_span(span_name) as span:
            try:
                # Set required OpenInference attributes
                span.set_attribute("llm.provider", self.provider)
                span.set_attribute("llm.model", model)
                span.set_attribute("llm.request_type", operation)

                # Add custom attributes
                for key, value in span_attributes.items():
                    span.set_attribute(key, value)

                # Track timing
                start_time = time.time()

                yield span

                # Calculate latency
                latency_ms = (time.time() - start_time) * 1000
                span.set_attribute("llm.latency_ms", latency_ms)

                # Mark as successful if no exception raised
                span.set_status(Status(StatusCode.OK))

            except Exception as e:
                # Record exception in span
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.record_exception(e)
                logger.error(f"[CustomTracer] Error in {span_name}: {e}")
                raise

    def set_input(self, span: trace.Span, input_text: str):
        """
        Set input prompt/message.

        Args:
            span: Active span
            input_text: User input or prompt
        """
        span.set_attribute("input.value", input_text)

    def set_output(self, span: trace.Span, output_text: str):
        """
        Set output response.

        Args:
            span: Active span
            output_text: Model response
        """
        span.set_attribute("output.value", output_text)

    def set_tokens(
        self,
        span: trace.Span,
        input_tokens: Optional[int] = None,
        output_tokens: Optional[int] = None,
    ):
        """
        Set token counts.

        Args:
            span: Active span
            input_tokens: Input/prompt tokens
            output_tokens: Output/completion tokens
        """
        if input_tokens is not None:
            span.set_attribute("llm.token_count.prompt", input_tokens)
        if output_tokens is not None:
            span.set_attribute("llm.token_count.completion", output_tokens)
        if input_tokens and output_tokens:
            span.set_attribute("llm.token_count.total", input_tokens + output_tokens)

    def set_parameters(
        self,
        span: trace.Span,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        **other_params,
    ):
        """
        Set model parameters.

        Args:
            span: Active span
            temperature: Sampling temperature
            max_tokens: Max output tokens
            top_p: Nucleus sampling parameter
            **other_params: Additional model parameters
        """
        if temperature is not None:
            span.set_attribute("llm.temperature", temperature)
        if max_tokens is not None:
            span.set_attribute("llm.max_tokens", max_tokens)
        if top_p is not None:
            span.set_attribute("llm.top_p", top_p)

        # Add custom parameters
        for key, value in other_params.items():
            span.set_attribute(f"llm.{key}", value)

    def set_tool_calls(self, span: trace.Span, tool_calls: list[Dict[str, Any]]):
        """
        Set tool/function calls made by model.

        Args:
            span: Active span
            tool_calls: List of tool call dicts
        """
        import json
        span.set_attribute("llm.tool_calls", json.dumps(tool_calls))
        span.set_attribute("llm.tool_call_count", len(tool_calls))

    def set_metadata(self, span: trace.Span, **metadata):
        """
        Set custom metadata attributes.

        Args:
            span: Active span
            **metadata: Key-value metadata pairs
        """
        for key, value in metadata.items():
            span.set_attribute(f"metadata.{key}", value)


# Convenience functions for common use cases

def trace_claude_desktop(
    model: str = "claude-3-5-sonnet",
    tracer: Optional[trace.Tracer] = None,
):
    """
    Create tracer for Claude Desktop App.

    Args:
        model: Claude model name
        tracer: Optional custom tracer

    Returns:
        CustomProviderTracer configured for Claude Desktop

    Example:
        >>> tracer = trace_claude_desktop()
        >>> with tracer.trace_llm_call(model="claude-3-5-sonnet") as span:
        ...     response = claude_desktop_api.chat("Hello")
        ...     tracer.set_output(span, response)
    """
    return CustomProviderTracer(provider="claude-desktop", tracer=tracer)


def trace_windsurf(
    model: str = "windsurf-cascade",
    tracer: Optional[trace.Tracer] = None,
):
    """
    Create tracer for Windsurf IDE.

    Args:
        model: Windsurf model name
        tracer: Optional custom tracer

    Returns:
        CustomProviderTracer configured for Windsurf
    """
    return CustomProviderTracer(provider="windsurf", tracer=tracer)


def trace_cursor(
    model: str = "cursor-auto",
    tracer: Optional[trace.Tracer] = None,
):
    """
    Create tracer for Cursor IDE.

    Args:
        model: Cursor model name
        tracer: Optional custom tracer

    Returns:
        CustomProviderTracer configured for Cursor
    """
    return CustomProviderTracer(provider="cursor", tracer=tracer)


def trace_custom_llm(
    provider: str,
    model: str,
    tracer: Optional[trace.Tracer] = None,
):
    """
    Create tracer for any custom LLM provider.

    Args:
        provider: Provider name
        model: Model name
        tracer: Optional custom tracer

    Returns:
        CustomProviderTracer

    Example:
        >>> tracer = trace_custom_llm("my-company", "my-model-v1")
        >>> with tracer.trace_llm_call(model="my-model-v1") as span:
        ...     response = my_llm.generate("Hello")
        ...     tracer.set_output(span, response["text"])
        ...     tracer.set_tokens(span, input_tokens=10, output_tokens=25)
    """
    return CustomProviderTracer(provider=provider, tracer=tracer)


# Example usage
if __name__ == "__main__":
    from observability.phoenix_config import initialize_phoenix

    # Initialize Phoenix
    tracer, config = initialize_phoenix(enable_console=True)

    # Test custom provider tracing
    print("\n=== Testing Custom Provider Tracer ===")

    # Example 1: Claude Desktop
    claude_tracer = trace_claude_desktop(tracer=tracer)

    with claude_tracer.trace_llm_call(
        model="claude-3-5-sonnet",
        operation="chat_completion"
    ) as span:
        # Simulate Claude Desktop API call
        input_text = "Explain async/await in Python"
        output_text = "Async/await in Python allows for asynchronous programming..."

        claude_tracer.set_input(span, input_text)
        claude_tracer.set_output(span, output_text)
        claude_tracer.set_tokens(span, input_tokens=8, output_tokens=42)
        claude_tracer.set_parameters(span, temperature=0.7, max_tokens=2048)

        print("✅ Traced Claude Desktop call")

    # Example 2: Windsurf IDE
    windsurf_tracer = trace_windsurf(tracer=tracer)

    with windsurf_tracer.trace_llm_call(
        model="windsurf-cascade",
        operation="code_generation"
    ) as span:
        # Simulate Windsurf code generation
        windsurf_tracer.set_input(span, "Generate a FastAPI endpoint")
        windsurf_tracer.set_output(span, "@app.get('/health')\\ndef health(): return {'status': 'ok'}")
        windsurf_tracer.set_tokens(span, input_tokens=5, output_tokens=18)
        windsurf_tracer.set_metadata(span, ide="windsurf", file="main.py")

        print("✅ Traced Windsurf code generation")

    # Example 3: Custom LLM
    custom_tracer = trace_custom_llm("my-company", "my-model-v1", tracer=tracer)

    with custom_tracer.trace_llm_call(
        model="my-model-v1",
        operation="embedding"
    ) as span:
        # Simulate custom embedding API
        custom_tracer.set_input(span, "Sample text for embedding")
        custom_tracer.set_tokens(span, input_tokens=4)
        custom_tracer.set_metadata(span, embedding_dim=1536)

        print("✅ Traced custom LLM embedding")

    print(f"\nView traces in Phoenix UI: {config.phoenix_endpoint}")
