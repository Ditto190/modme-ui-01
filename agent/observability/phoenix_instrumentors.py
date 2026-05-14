"""
Phoenix Provider Instrumentations

Auto-instrumentation for AI providers using OpenInference semantic conventions.
Supports Anthropic, Google Generative AI, and OpenAI SDKs.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class ProviderInstrumentor:
    """Base class for provider auto-instrumentation"""

    def __init__(self):
        self.is_instrumented = False

    def instrument(self):
        """Instrument the provider SDK"""
        raise NotImplementedError

    def uninstrument(self):
        """Remove instrumentation"""
        raise NotImplementedError


class AnthropicInstrumentor(ProviderInstrumentor):
    """Auto-instrument Anthropic SDK with OpenInference"""

    def instrument(self):
        """
        Instrument Anthropic SDK for tracing.

        Captures:
        - Model name and parameters
        - Token usage (input/output)
        - Latency and errors
        - Message content (if enabled)
        """
        try:
            from openinference.instrumentation.anthropic import AnthropicInstrumentor

            instrumentor = AnthropicInstrumentor()
            if not instrumentor.is_instrumented_by_opentelemetry:
                instrumentor.instrument()
                self.is_instrumented = True
                logger.info("[Phoenix] Anthropic instrumentation enabled")
        except ImportError:
            logger.warning(
                "[Phoenix] openinference-instrumentation-anthropic not installed"
            )

    def uninstrument(self):
        """Remove Anthropic instrumentation"""
        if self.is_instrumented:
            try:
                from openinference.instrumentation.anthropic import (
                    AnthropicInstrumentor,
                )

                AnthropicInstrumentor().uninstrument()
                self.is_instrumented = False
            except ImportError:
                pass


class OpenAIInstrumentor(ProviderInstrumentor):
    """Auto-instrument OpenAI SDK with OpenInference"""

    def instrument(self):
        """
        Instrument OpenAI SDK for tracing.

        Captures:
        - Model name, temperature, max_tokens
        - Token usage and cost estimation
        - Function/tool calls
        - Streaming responses
        """
        try:
            from openinference.instrumentation.openai import OpenAIInstrumentor

            instrumentor = OpenAIInstrumentor()
            if not instrumentor.is_instrumented_by_opentelemetry:
                instrumentor.instrument()
                self.is_instrumented = True
                logger.info("[Phoenix] OpenAI instrumentation enabled")
        except ImportError:
            logger.warning(
                "[Phoenix] openinference-instrumentation-openai not installed"
            )

    def uninstrument(self):
        """Remove OpenAI instrumentation"""
        if self.is_instrumented:
            try:
                from openinference.instrumentation.openai import OpenAIInstrumentor

                OpenAIInstrumentor().uninstrument()
                self.is_instrumented = False
            except ImportError:
                pass


class GoogleGenerativeAIInstrumentor(ProviderInstrumentor):
    """Auto-instrument Google Generative AI SDK with OpenInference"""

    def instrument(self):
        """
        Instrument Google Generative AI SDK for tracing.

        Captures:
        - Model name (e.g., gemini-2.0-flash)
        - Token counts
        - Safety ratings
        - Function calling
        """
        try:
            from openinference.instrumentation.google_generativeai import (
                GoogleGenerativeAIInstrumentor,
            )

            instrumentor = GoogleGenerativeAIInstrumentor()
            if not instrumentor.is_instrumented_by_opentelemetry:
                instrumentor.instrument()
                self.is_instrumented = True
                logger.info("[Phoenix] Google Generative AI instrumentation enabled")
        except ImportError:
            logger.warning(
                "[Phoenix] openinference-instrumentation-google-generativeai not installed"
            )

    def uninstrument(self):
        """Remove Google Generative AI instrumentation"""
        if self.is_instrumented:
            try:
                from openinference.instrumentation.google_generativeai import (
                    GoogleGenerativeAIInstrumentor,
                )

                GoogleGenerativeAIInstrumentor().uninstrument()
                self.is_instrumented = False
            except ImportError:
                pass


class VSCodeCopilotInstrumentor(ProviderInstrumentor):
    """
    Manual instrumentor for GitHub Copilot via VSCode extension.

    This instrumentor provides telemetry integration for GitHub Copilot
    when used in VSCode. Unlike SDK-based providers, Copilot requires
    a custom VSCode extension to capture telemetry events.

    See: agent/observability/vscode_copilot_telemetry.py
         docs/VSCODE_COPILOT_EXTENSION.md
    """

    def __init__(self):
        super().__init__()
        self.adapter = None

    def instrument(self):
        """
        Enable VSCode Copilot telemetry adapter.

        Note: This requires a custom VSCode extension to send telemetry
        events to the agent's HTTP endpoint.
        """
        try:
            from observability.vscode_copilot_telemetry import (
                get_vscode_copilot_adapter,
            )

            self.adapter = get_vscode_copilot_adapter()
            self.is_instrumented = True
            logger.info("[Phoenix] VSCode Copilot telemetry adapter enabled")
            logger.info("[Phoenix] Note: Requires VSCode extension to send events")
        except ImportError as e:
            logger.warning(f"[Phoenix] VSCode Copilot telemetry not available: {e}")

    def uninstrument(self):
        """Disable VSCode Copilot telemetry adapter"""
        if self.is_instrumented:
            self.adapter = None
            self.is_instrumented = False
            logger.info("[Phoenix] VSCode Copilot telemetry adapter disabled")


def instrument_all_providers() -> dict[str, ProviderInstrumentor]:
    """
    Instrument all available AI providers.

    Returns:
        Dictionary of provider name to instrumentor instance
    """
    instrumentors = {
        "anthropic": AnthropicInstrumentor(),
        "openai": OpenAIInstrumentor(),
        "google": GoogleGenerativeAIInstrumentor(),
        "vscode-copilot": VSCodeCopilotInstrumentor(),
    }

    for name, instrumentor in instrumentors.items():
        try:
            instrumentor.instrument()
        except Exception as e:
            logger.warning(f"[Phoenix] Failed to instrument {name}: {e}")

    return instrumentors


def uninstrument_all_providers(instrumentors: dict[str, ProviderInstrumentor]):
    """
    Remove instrumentation from all providers.

    Args:
        instrumentors: Dictionary of instrumentors from instrument_all_providers()
    """
    for name, instrumentor in instrumentors.items():
        try:
            instrumentor.uninstrument()
        except Exception as e:
            logger.warning(f"[Phoenix] Failed to uninstrument {name}: {e}")


def add_llm_span_attributes(span, provider: str, model: str, **kwargs):
    """
    Add OpenInference semantic attributes to a span.

    Args:
        span: OpenTelemetry span
        provider: Provider name (e.g., "anthropic", "openai", "google")
        model: Model name (e.g., "claude-3-5-sonnet-20241022")
        **kwargs: Additional attributes (tokens, latency, etc.)

    Example:
        >>> with tracer.start_as_current_span("llm_call") as span:
        ...     add_llm_span_attributes(
        ...         span,
        ...         provider="anthropic",
        ...         model="claude-3-5-sonnet",
        ...         input_tokens=100,
        ...         output_tokens=50
        ...     )
    """
    # OpenInference semantic conventions
    span.set_attribute("llm.provider", provider)
    span.set_attribute("llm.model", model)

    # Optional attributes
    if "input_tokens" in kwargs:
        span.set_attribute("llm.token_count.prompt", kwargs["input_tokens"])
    if "output_tokens" in kwargs:
        span.set_attribute("llm.token_count.completion", kwargs["output_tokens"])
    if "latency_ms" in kwargs:
        span.set_attribute("llm.latency_ms", kwargs["latency_ms"])
    if "temperature" in kwargs:
        span.set_attribute("llm.temperature", kwargs["temperature"])
    if "max_tokens" in kwargs:
        span.set_attribute("llm.max_tokens", kwargs["max_tokens"])
