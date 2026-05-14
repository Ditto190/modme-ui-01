#!/usr/bin/env python3
"""
Test Phoenix OTLP endpoint with HTTP/protobuf format.
Phoenix requires protobuf, not JSON for OTLP.
"""

import os

from dotenv import load_dotenv

load_dotenv()

print("=" * 60)
print("Phoenix OTLP Protobuf Test")
print("=" * 60)
print()

# Import OpenTelemetry
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Configuration
service_name = os.getenv("OTEL_SERVICE_NAME", "github-copilot")
phoenix_project = os.getenv("PHOENIX_PROJECT", "github-copilot")
phoenix_endpoint = "http://localhost:6006/v1/traces"

print("Configuration:")
print(f"  Service: {service_name}")
print(f"  Project: {phoenix_project}")
print(f"  Endpoint: {phoenix_endpoint}")
print()

# Resource attributes
resource = Resource(attributes={
    "service.name": service_name,
    "project.name": phoenix_project,
})

# Create tracer provider
provider = TracerProvider(resource=resource)

# Create OTLP exporter with explicit configuration
# The default should be HTTP/protobuf
exporter = OTLPSpanExporter(
    endpoint=phoenix_endpoint,
    # headers={}, # Optional headers
)

print("📡 Created OTLP exporter")
print("   Protocol: HTTP/protobuf (default)")
print()

# Add processor
processor = BatchSpanProcessor(exporter)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# Create tracer
tracer = trace.get_tracer("test-tracer", "1.0.0")

print("📤 Creating test span...")

# Create span with LLM-like attributes
with tracer.start_as_current_span("github-copilot.completion") as span:
    span.set_attribute("llm.request.type", "chat")
    span.set_attribute("llm.model_name", "test-gpt-4")
    span.set_attribute("llm.provider", "test-provider")
    span.set_attribute("input.value", "What is 2+2?")
    span.set_attribute("output.value", "2+2 equals 4")
    span.set_attribute("llm.token_count.prompt", 5)
    span.set_attribute("llm.token_count.completion", 6)
    span.set_attribute("llm.token_count.total", 11)
    span.set_attribute("llm.temperature", 0.7)

    print("   ✅ Span attributes set")

# Force flush
print("   🔄 Flushing to Phoenix...")
trace.get_tracer_provider().force_flush(timeout_millis=10000)
print("   ✅ Flush complete")

print()
print("=" * 60)
print("Test Complete!")
print()
print("Next steps:")
print("  1. Open Phoenix: http://localhost:6006")
print("  2. Select project: github-copilot")
print("  3. Look for: 'github-copilot.completion' span")
print()
print("If no trace appears, check:")
print("  - Phoenix Docker container logs")
print("  - OTLP endpoint accepting protobuf format")
print("  - Project name matching")
print("=" * 60)
