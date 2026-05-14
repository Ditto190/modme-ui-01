#!/usr/bin/env python3
"""
GitHub Copilot Tracing Demo with Phoenix
Adapted from VS Code AI Toolkit documentation to work with Phoenix.

This demonstrates how to instrument any LLM application to send traces to Phoenix.
While this example uses Azure AI Inference SDK, the same pattern works for:
- OpenAI SDK
- Anthropic SDK
- LangChain
- Any framework with OpenTelemetry support

Original source: https://code.visualstudio.com/docs/intelligentapps/tracing
"""

import os

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

### Set up for OpenTelemetry tracing ###
# Enable detailed content recording
os.environ["AZURE_TRACING_GEN_AI_CONTENT_RECORDING_ENABLED"] = "true"
os.environ["AZURE_SDK_TRACING_IMPLEMENTATION"] = "opentelemetry"

from opentelemetry import _events, trace
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk._events import EventLoggerProvider
from opentelemetry.sdk._logs import LoggerProvider
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Configure service name and project
service_name = os.getenv("OTEL_SERVICE_NAME", "github-copilot")
phoenix_project = os.getenv("PHOENIX_PROJECT", "github-copilot")

# Create resource with service identification
resource = Resource(attributes={
    "service.name": service_name,
    "project.name": phoenix_project,
    "telemetry.sdk.name": "opentelemetry",
    "telemetry.sdk.language": "python"
})

# Set up trace provider with Phoenix endpoint
provider = TracerProvider(resource=resource)

# ⭐ KEY CHANGE: Point to Phoenix instead of AI Toolkit
otlp_exporter = OTLPSpanExporter(
    endpoint="http://localhost:6006/v1/traces",  # Phoenix OTLP endpoint
)

processor = BatchSpanProcessor(otlp_exporter)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# Set up logging (optional, but recommended)
logger_provider = LoggerProvider(resource=resource)
logger_provider.add_log_record_processor(
    BatchLogRecordProcessor(
        OTLPLogExporter(endpoint="http://localhost:6006/v1/logs")
    )
)
_events.set_event_logger_provider(EventLoggerProvider(logger_provider))

# Instrument Azure AI Inference SDK (or any other SDK)
# For OpenAI: from openinference.instrumentation.openai import OpenAIInstrumentor
# For Anthropic: from openinference.instrumentation.anthropic import AnthropicInstrumentor
# For LangChain: from openinference.instrumentation.langchain import LangChainInstrumentor

try:
    from azure.ai.inference.tracing import AIInferenceInstrumentor
    AIInferenceInstrumentor().instrument()
    print("✅ Azure AI Inference instrumentation enabled")
except ImportError:
    print("⚠️  Azure AI Inference SDK not installed")
    print("   pip install azure-ai-inference[opentelemetry]")

### Set up for OpenTelemetry tracing ###

def demo_chat_completion():
    """
    Demo function showing traced LLM interaction.
    Replace with your actual LLM SDK calls.
    """
    print("\n📡 Sending traced request to LLM...")
    print("   Traces will appear in Phoenix: http://localhost:6006")
    print(f"   Project: {phoenix_project}")
    print()

    # Example with Azure AI (replace with your preferred SDK)
    try:
        from azure.ai.inference import ChatCompletionsClient
        from azure.ai.inference.models import TextContentItem, UserMessage
        from azure.core.credentials import AzureKeyCredential

        github_token = os.getenv("GITHUB_TOKEN")
        if not github_token:
            print("⚠️  GITHUB_TOKEN not set, skipping API call")
            print("   Set GITHUB_TOKEN to use GitHub Models (free)")
            return

        client = ChatCompletionsClient(
            endpoint="https://models.inference.ai.azure.com",
            credential=AzureKeyCredential(github_token),
            api_version="2024-08-01-preview",
        )

        response = client.complete(
            messages=[
                UserMessage(content=[
                    TextContentItem(text="What is the capital of France?"),
                ]),
            ],
            model="gpt-4o",
            temperature=0.7,
        )

        print(f"Response: {response.choices[0].message.content}")
        print()
        print("✅ Trace sent to Phoenix!")
        print("   View it at: http://localhost:6006")

    except ImportError:
        print("💡 Azure AI SDK not installed. Install with:")
        print("   pip install azure-ai-inference[opentelemetry]")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("Phoenix Tracing Demo")
    print("=" * 60)

    demo_chat_completion()

    print()
    print("=" * 60)
    print("✨ Demo complete!")
    print()
    print("🔍 Check Phoenix UI:")
    print("   → http://localhost:6006")
    print(f"   → Select project: {phoenix_project}")
    print("   → View the trace with full details")
    print("=" * 60)
