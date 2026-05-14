#!/usr/bin/env python3
"""
Simple trace test - sends a manual trace to Phoenix using OpenTelemetry.
Tests that the OTLP endpoint is working without requiring LLM SDKs.
"""

import os
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

print("=" * 60)
print("Manual Trace Test - Phoenix OTLP Endpoint")
print("=" * 60)
print()

# Configure OpenTelemetry
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Service configuration
service_name = os.getenv("OTEL_SERVICE_NAME", "test-service")
phoenix_project = os.getenv("PHOENIX_PROJECT", "github-copilot")

print("📡 Configuring OpenTelemetry...")
print(f"   Service: {service_name}")
print(f"   Project: {phoenix_project}")
print("   Endpoint: http://localhost:6006/v1/traces")
print()

# Create resource with service metadata
resource = Resource(attributes={
    "service.name": service_name,
    "project.name": phoenix_project,
    "telemetry.sdk.name": "opentelemetry",
    "telemetry.sdk.language": "python",
    "test.type": "manual_trace"
})

# Set up trace provider
provider = TracerProvider(resource=resource)
otlp_exporter = OTLPSpanExporter(
    endpoint="http://localhost:6006/v1/traces",
)
processor = BatchSpanProcessor(otlp_exporter)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# Get tracer
tracer = trace.get_tracer(__name__)

print("✅ OpenTelemetry configured")
print()
print("📤 Creating and sending test span...")

# Create a test span
with tracer.start_as_current_span("test.manual_trace") as span:
    # Add attributes that Phoenix recognizes
    span.set_attribute("test.timestamp", datetime.now().isoformat())
    span.set_attribute("test.message", "This is a manual test trace")
    span.set_attribute("test.success", True)

    # Simulate LLM-like attributes (optional)
    span.set_attribute("llm.model_name", "test-model")
    span.set_attribute("input.value", "Test input for Phoenix")
    span.set_attribute("output.value", "Test output from manual span")
    span.set_attribute("llm.token_count.prompt", 10)
    span.set_attribute("llm.token_count.completion", 15)
    span.set_attribute("llm.token_count.total", 25)

    print("   ✅ Span created with test attributes")

# Force flush to ensure trace is sent
trace.get_tracer_provider().force_flush(timeout_millis=5000)

print("   ✅ Trace flushed to Phoenix")
print()
print("=" * 60)
print("✨ Test Complete!")
print()
print("🔍 Check Phoenix UI:")
print("   1. Open: http://localhost:6006")
print("   2. Select project: github-copilot")
print("   3. Look for span: 'test.manual_trace'")
print()
print("Expected attributes:")
print("   - test.message: This is a manual test trace")
print("   - llm.model_name: test-model")
print("   - Token counts: 10/15/25")
print("=" * 60)
