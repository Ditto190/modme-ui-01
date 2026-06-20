"""
GreptimeDB Observability Configuration

Configures OpenTelemetry with GreptimeDB backend for metrics, logs, and traces.
Supports both local development and production deployments.
"""

import base64
import os
from typing import Optional


class GreptimeDBConfig:
    """GreptimeDB observability configuration"""

    def __init__(
        self,
        host: Optional[str] = None,
        database: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        service_name: Optional[str] = None,
        service_version: Optional[str] = None,
    ):
        """
        Initialize GreptimeDB configuration.

        Args:
            host: GreptimeDB host (default: from GREPTIME_HOST env)
            database: Database name (default: from GREPTIME_DB env)
            username: Auth username (default: from GREPTIME_USERNAME env)
            password: Auth password (default: from GREPTIME_PASSWORD env)
            service_name: Service identifier (default: "modme-genui-agent")
            service_version: Service version (default: "0.1.0")
        """
        self.host = host or os.getenv("GREPTIME_HOST", "localhost:4000")
        self.database = database or os.getenv("GREPTIME_DB", "public")
        self.username = username or os.getenv("GREPTIME_USERNAME", "")
        self.password = password or os.getenv("GREPTIME_PASSWORD", "")
        self.service_name = service_name or "modme-genui-agent"
        self.service_version = service_version or "0.1.0"

        # Construct endpoints
        self.base_url = f"http://{self.host}/v1/otlp"
        self.metrics_endpoint = f"{self.base_url}/v1/metrics"
        self.logs_endpoint = f"{self.base_url}/v1/logs"
        self.traces_endpoint = f"{self.base_url}/v1/traces"

        # Generate auth header
        if self.username and self.password:
            credentials = f"{self.username}:{self.password}"
            self.auth_header = base64.b64encode(credentials.encode()).decode()
        else:
            self.auth_header = None

    def get_headers(self, table_name: Optional[str] = None) -> dict:
        """
        Generate headers for OTLP requests.

        Args:
            table_name: Optional table name for logs/traces

        Returns:
            Dictionary of HTTP headers
        """
        headers = {
            "X-Greptime-DB-Name": self.database,
        }

        if self.auth_header:
            headers["Authorization"] = f"Basic {self.auth_header}"

        if table_name:
            headers["X-Greptime-Log-Table-Name"] = table_name

        return headers

    def get_resource(self):
        """Create OpenTelemetry resource with service metadata."""
        from opentelemetry.sdk.resources import SERVICE_NAME, SERVICE_VERSION, Resource

        return Resource.create(
            {
                SERVICE_NAME: self.service_name,
                SERVICE_VERSION: self.service_version,
                "deployment.environment": os.getenv("ENVIRONMENT", "development"),
            }
        )


def setup_metrics(config: GreptimeDBConfig):
    """
    Configure OpenTelemetry metrics with GreptimeDB exporter.

    Args:
        config: GreptimeDB configuration

    Returns:
        Configured Meter instance
    """
    from opentelemetry import metrics
    from opentelemetry.exporter.otlp.proto.http.metric_exporter import (
        OTLPMetricExporter,
    )
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader

    # Create OTLP metric exporter
    exporter = OTLPMetricExporter(
        endpoint=config.metrics_endpoint,
        headers=config.get_headers(),
        timeout=5,  # 5 second timeout
    )

    # Create metric reader with 15 second export interval
    reader = PeriodicExportingMetricReader(
        exporter=exporter,
        export_interval_millis=15000,
    )

    # Create meter provider
    provider = MeterProvider(
        resource=config.get_resource(),
        metric_readers=[reader],
    )

    # Set global meter provider
    metrics.set_meter_provider(provider)

    # Return meter for creating instruments
    return metrics.get_meter(__name__)


def setup_tracing(config: GreptimeDBConfig):
    """
    Configure OpenTelemetry tracing with GreptimeDB exporter.

    Args:
        config: GreptimeDB configuration

    Returns:
        Configured Tracer instance
    """
    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    # Create OTLP trace exporter
    exporter = OTLPSpanExporter(
        endpoint=config.traces_endpoint,
        headers=config.get_headers(),
        timeout=5,
    )

    # Create span processor with batching
    processor = BatchSpanProcessor(exporter)

    # Create tracer provider
    provider = TracerProvider(resource=config.get_resource())
    provider.add_span_processor(processor)

    # Set global tracer provider
    trace.set_tracer_provider(provider)

    # Return tracer
    return trace.get_tracer(__name__)


def instrument_fastapi(app, config: GreptimeDBConfig):
    """
    Instrument FastAPI application with OpenTelemetry.

    Args:
        app: FastAPI application instance
        config: GreptimeDB configuration
    """
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

    FastAPIInstrumentor.instrument_app(app)


def initialize_observability(
    host: Optional[str] = None,
    database: Optional[str] = None,
    username: Optional[str] = None,
    password: Optional[str] = None,
):
    """
    Initialize complete observability stack with GreptimeDB.

    Args:
        host: GreptimeDB host
        database: Database name
        username: Auth username
        password: Auth password

    Returns:
        Tuple of (meter, tracer, config)

    Example:
        >>> meter, tracer, config = initialize_observability()
        >>> # Create metrics
        >>> counter = meter.create_counter("requests_total")
        >>> counter.add(1, {"endpoint": "/api/chat"})
        >>> # Create traces
        >>> with tracer.start_as_current_span("agent_execution"):
        ...     # Your code here
        ...     pass
    """
    config = GreptimeDBConfig(
        host=host, database=database, username=username, password=password
    )

    meter = setup_metrics(config)
    tracer = setup_tracing(config)

    print("[GreptimeDB] Observability initialized")
    print(f"[GreptimeDB] Metrics endpoint: {config.metrics_endpoint}")
    print(f"[GreptimeDB] Traces endpoint: {config.traces_endpoint}")
    print(f"[GreptimeDB] Database: {config.database}")

    return meter, tracer, config
