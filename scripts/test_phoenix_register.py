"""
Test Phoenix OpenTelemetry using the recommended phoenix.otel.register() method.

This is the RECOMMENDED way to set up Phoenix tracing - it handles all configuration automatically.

Install: pip install arize-phoenix-otel
"""
from phoenix.otel import register

# The recommended way - handles all configuration automatically
print("🔧 Setting up Phoenix tracing with register()...")

tracer_provider = register(
    project_name="github-copilot",  # Automatically sets openinference.project.name
    endpoint="http://localhost:6006/v1/traces",  # Phoenix OTLP endpoint
    batch=False,  # Set to True in production for better performance
    # auto_instrument=True,  # Uncomment to auto-instrument installed libraries
)

print("✅ Phoenix tracer configured!")
print("\n📋 Configuration:")
print("   - Project: github-copilot")
print("   - Endpoint: http://localhost:6006/v1/traces")
print("   - Protocol: HTTP + protobuf")
print("   - Processor: SimpleSpanProcessor (batch=False)")

# Now create a test span
from opentelemetry import trace

tracer = trace.get_tracer("github-copilot-test", "1.0.0")

print("\n🎯 Creating test span...")
with tracer.start_as_current_span("github-copilot.completion") as span:
    # Set OpenInference semantic conventions for LLM spans
    span.set_attribute("openinference.span.kind", "LLM")
    span.set_attribute("llm.model_name", "gpt-4-turbo-preview")
    span.set_attribute("llm.input_messages", '[{"role": "user", "content": "Write a Python function"}]')
    span.set_attribute("llm.output_messages", '[{"role": "assistant", "content": "def example(): pass"}]')
    span.set_attribute("llm.token_count.prompt", 8)
    span.set_attribute("llm.token_count.completion", 7)
    span.set_attribute("llm.token_count.total", 15)

    print("✅ Span created with attributes:")
    print("   - Span kind: LLM")
    print("   - Model: gpt-4-turbo-preview")
    print("   - Total tokens: 15")

# Force flush to ensure traces are sent
print("\n🔄 Flushing traces to Phoenix...")
trace.get_tracer_provider().force_flush(timeout_millis=10000)
print("✅ Traces sent to Phoenix!")

print("\n🎉 Success! Check Phoenix UI at http://localhost:6006")
print("""
To query traces:
  $env:PHOENIX_HOST='http://localhost:6006'
  $env:PHOENIX_PROJECT='github-copilot'
  npx @arizeai/phoenix-cli traces --limit 5
""")
