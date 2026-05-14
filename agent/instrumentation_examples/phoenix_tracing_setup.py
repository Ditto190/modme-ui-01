#!/usr/bin/env python3
"""
Phoenix Tracing Setup - Adapted from VS Code AI Toolkit
Shows how to instrument any Python LLM app to send traces to Phoenix.
Based on: https://code.visualstudio.com/docs/intelligentapps/tracing
"""

import os

from dotenv import load_dotenv

# Load .env file
load_dotenv()

print("Setting up OpenTelemetry tracing to Phoenix...")

### OpenTelemetry Setup ###
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

# Service configuration
service_name = os.getenv("OTEL_SERVICE_NAME", "github-copilot")
phoenix_project = os.getenv("PHOENIX_PROJECT", "github-copilot")

# Resource attributes
resource = Resource(attributes={
    "service.name": service_name,
    "project.name": phoenix_project,
    "telemetry.sdk.name": "opentelemetry",
    "telemetry.sdk.language": "python"
})

# Trace provider configuration
provider = TracerProvider(resource=resource)

# KEY CHANGE: Phoenix endpoint instead of AI Toolkit (port 6006 not 4318)
otlp_exporter = OTLPSpanExporter(
    endpoint="http://localhost:6006/v1/traces",
)

processor = BatchSpanProcessor(otlp_exporter)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# Log provider (optional)
logger_provider = LoggerProvider(resource=resource)
logger_provider.add_log_record_processor(
    BatchLogRecordProcessor(
        OTLPLogExporter(endpoint="http://localhost:6006/v1/logs")
    )
)
_events.set_event_logger_provider(EventLoggerProvider(logger_provider))

print("Tracing configured for Phoenix at http://localhost:6006")
print(f"Project: {phoenix_project}")

# Instrument your SDK (choose one or more):

# For Azure AI Inference:
try:
    from azure.ai.inference.tracing import AIInferenceInstrumentor
    AIInferenceInstrumentor().instrument()
    print("Azure AI Inference instrumented")
except ImportError:
    pass

# For OpenAI:
# from openinference.instrumentation.openai import OpenAIInstrumentor
# OpenAIInstrumentor().instrument()

# For Anthropic:
# from openinference.instrumentation.anthropic import AnthropicInstrumentor
# AnthropicInstrumentor().instrument()

# For LangChain:
# from openinference.instrumentation.langchain import LangChainInstrumentor
# LangChainInstrumentor().instrument()

### Your LLM Code Here ###

# Example: Azure AI chat
def example_chat():
    """Example traced chat completion."""
    try:
        from azure.ai.inference import ChatCompletionsClient
        from azure.ai.inference.models import TextContentItem, UserMessage
        from azure.core.credentials import AzureKeyCredential

        github_token = os.getenv("GITHUB_TOKEN")
        if not github_token:
            print("Set GITHUB_TOKEN to test (GitHub Models is free)")
            return

        client = ChatCompletionsClient(
            endpoint="https://models.inference.ai.azure.com",
            credential=AzureKeyCredential(github_token),
            api_version="2024-08-01-preview",
        )

        print("\nSending traced request...")
        response = client.complete(
            messages=[
                UserMessage(content=[
                    TextContentItem(text="Hi! What is 2+2?"),
                ]),
            ],
            model="gpt-4o",
        )

        print(f"Response: {response.choices[0].message.content}")
        print("\nTrace sent! View at: http://localhost:6006")

    except ImportError:
        print("Install: pip install azure-ai-inference[opentelemetry]")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Phoenix Tracing Demo")
    print("=" * 60 + "\n")

    example_chat()

    print("\n" + "=" * 60)
    print("Check Phoenix: http://localhost:6006")
    print(f"Project: {phoenix_project}")
    print("=" * 60)
