"""
Phoenix + OpenInference Observability Configuration

Configures Phoenix for LLM observability with OpenInference semantic conventions.
Supports multi-provider instrumentation (Anthropic, Google, OpenAI) and dual-export
to both Phoenix and GreptimeDB.
"""

from __future__ import annotations

import os
from typing import Optional

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import SERVICE_NAME, SERVICE_VERSION, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter


class PhoenixConfig:
    """Phoenix observability configuration with OpenInference support"""

    def __init__(
        self,
        phoenix_endpoint: Optional[str] = None,
        collector_endpoint: Optional[str] = None,
        service_name: Optional[str] = None,
        service_version: Optional[str] = None,
        enable_console_export: bool = False,
        enable_greptime_export: bool = True,
    ):
        """
        Initialize Phoenix configuration.

        Args:
            phoenix_endpoint: Phoenix UI endpoint (default: http://localhost:6006)
            collector_endpoint: Phoenix OTLP collector (default: http://localhost:6006/v1/traces)
            service_name: Service identifier (default: "modme-agent")
            service_version: Service version (default: "0.1.0")
            enable_console_export: Export traces to console for debugging
            enable_greptime_export: Also export to GreptimeDB (default: True)
        """
        self.phoenix_endpoint = phoenix_endpoint or os.getenv(
            "PHOENIX_ENDPOINT", "http://localhost:6006"
        )
        self.collector_endpoint = collector_endpoint or os.getenv(
            "PHOENIX_COLLECTOR_ENDPOINT", "http://localhost:6006/v1/traces"
        )
        self.service_name = service_name or os.getenv("SERVICE_NAME", "modme-agent")
        self.service_version = service_version or "0.1.0"
        self.enable_console_export = enable_console_export
        self.enable_greptime_export = enable_greptime_export

    def get_resource(self) -> Resource:
        """Create OpenTelemetry resource with service metadata."""
        return Resource.create(
            {
                SERVICE_NAME: self.service_name,
                SERVICE_VERSION: self.service_version,
                "deployment.environment": os.getenv("ENVIRONMENT", "development"),
            }
        )


def setup_phoenix_tracing(
    config: PhoenixConfig, greptime_config: Optional[object] = None
) -> trace.Tracer:
    """
    Configure OpenTelemetry tracing with Phoenix and optional GreptimeDB export.

    Args:
        config: Phoenix configuration
        greptime_config: Optional GreptimeDB config for dual export

    Returns:
        Configured Tracer instance
    """
    # Create Phoenix OTLP exporter
    phoenix_exporter = OTLPSpanExporter(
        endpoint=config.collector_endpoint,
        timeout=10,
    )

    # Create tracer provider with resource
    provider = TracerProvider(resource=config.get_resource())

    # Add Phoenix span processor
    provider.add_span_processor(BatchSpanProcessor(phoenix_exporter))

    # Optional: Add console exporter for debugging
    if config.enable_console_export:
        console_exporter = ConsoleSpanExporter()
        provider.add_span_processor(BatchSpanProcessor(console_exporter))

    # Optional: Add GreptimeDB exporter for dual export
    if config.enable_greptime_export and greptime_config:
        try:
            from .greptime_config import setup_tracing as setup_greptime_tracing

            # GreptimeDB setup returns its own tracer, but we just need the processor
            greptime_exporter = OTLPSpanExporter(
                endpoint=greptime_config.traces_endpoint,
                headers=greptime_config.get_headers(),
                timeout=5,
            )
            provider.add_span_processor(BatchSpanProcessor(greptime_exporter))
            print(
                "[Phoenix] Dual export enabled: Phoenix + GreptimeDB"
            )
        except ImportError:
            print("[Phoenix] Warning: GreptimeDB config not available")

    # Set global tracer provider
    trace.set_tracer_provider(provider)

    print("[Phoenix] Tracing initialized")
    print(f"[Phoenix] UI: {config.phoenix_endpoint}")
    print(f"[Phoenix] Collector: {config.collector_endpoint}")

    # Return tracer
    return trace.get_tracer(__name__)


def initialize_phoenix(
    phoenix_endpoint: Optional[str] = None,
    collector_endpoint: Optional[str] = None,
    enable_greptime: bool = True,
    enable_console: bool = False,
) -> tuple[trace.Tracer, PhoenixConfig]:
    """
    Initialize complete Phoenix observability stack.

    Args:
        phoenix_endpoint: Phoenix UI endpoint
        collector_endpoint: Phoenix OTLP collector endpoint
        enable_greptime: Also export to GreptimeDB
        enable_console: Enable console debugging

    Returns:
        Tuple of (tracer, config)

    Example:
        >>> tracer, config = initialize_phoenix()
        >>> with tracer.start_as_current_span("llm_call") as span:
        ...     span.set_attribute("llm.model", "claude-3-5-sonnet")
        ...     span.set_attribute("llm.provider", "anthropic")
        ...     # Your LLM call here
    """
    config = PhoenixConfig(
        phoenix_endpoint=phoenix_endpoint,
        collector_endpoint=collector_endpoint,
        enable_console_export=enable_console,
        enable_greptime_export=enable_greptime,
    )

    # Import GreptimeDB config if needed
    greptime_config = None
    if enable_greptime:
        try:
            from .greptime_config import GreptimeDBConfig

            greptime_config = GreptimeDBConfig()
        except ImportError:
            print("[Phoenix] Warning: GreptimeDB not available for dual export")

    tracer = setup_phoenix_tracing(config, greptime_config)

    return tracer, config


def get_phoenix_ui_url(config: PhoenixConfig) -> str:
    """
    Get Phoenix UI URL for viewing traces.

    Args:
        config: Phoenix configuration

    Returns:
        Phoenix UI URL
    """
    return config.phoenix_endpoint
