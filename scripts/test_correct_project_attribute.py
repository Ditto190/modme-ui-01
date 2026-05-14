"""
Test OpenTelemetry trace ingestion to Phoenix with correct resource attributes.

Based on Phoenix documentation:
https://arize.com/docs/phoenix/sdk-api-reference/python/arize-phoenix-otel

Key fix: Use 'openinference.project.name' instead of 'project.name'
"""
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor

# Create resource with correct OpenInference project name attribute
resource = Resource(attributes={
    "service.name": "github-copilot",
    "openinference.project.name": "github-copilot",  # CORRECT attribute name
})

# Set up the tracer provider with the resource
tracer_provider = TracerProvider(resource=resource)

# Add OTLP HTTP exporter
endpoint = "http://localhost:6006/v1/traces"
exporter = OTLPSpanExporter(endpoint=endpoint)
tracer_provider.add_span_processor(SimpleSpanProcessor(span_exporter=exporter))

# Set as global tracer provider
trace.set_tracer_provider(tracer_provider)

# Create a tracer
tracer = trace.get_tracer("test-tracer", "1.0.0")

# Create a test span simulating a GitHub Copilot completion
with tracer.start_as_current_span("github-copilot.completion") as span:
    # Set LLM attributes following OpenInference semantic conventions
    span.set_attribute("llm.model_name", "gpt-4-turbo")
    span.set_attribute("llm.input_messages", '[{"role": "user", "content": "Write a function"}]')
    span.set_attribute("llm.output_messages", '[{"role": "assistant", "content": "def example():"}]')
    span.set_attribute("llm.token_count.prompt", 5)
    span.set_attribute("llm.token_count.completion", 6)
    span.set_attribute("llm.token_count.total", 11)

    print("✅ Span created with correct resource attributes:")
    print("   - service.name: github-copilot")
    print("   - openinference.project.name: github-copilot")
    print(f"   - Endpoint: {endpoint}")

# Force flush to ensure traces are sent
print("\n🔄 Flushing traces to Phoenix...")
trace.get_tracer_provider().force_flush(timeout_millis=10000)
print("✅ Flush complete with correct project attribute!")
