"""Copilot to Phoenix Telemetry Proxy Server.

FastAPI server that receives GitHub Copilot telemetry from TZ extension
and forwards to Phoenix with OpenInference semantic conventions.

Architecture:
    VSCode + TZ Extension --> HTTP POST --> This Proxy --> Phoenix (OTLP)

Usage:
    python -m agent.observability.copilot_phoenix_proxy

Environment Variables:
    PHOENIX_COLLECTOR_ENDPOINT: Phoenix OTLP endpoint (default: http://localhost:6006/v1/traces)
    PHOENIX_PROJECT_NAME: Project name for Phoenix UI (default: copilot-research)
    PROXY_PORT: Server port (default: 8080)
    PROXY_HOST: Server host (default: 0.0.0.0)
    LOG_LEVEL: Logging level (default: INFO)
"""

from __future__ import annotations

import hashlib
import logging
import os
from typing import List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import Status, StatusCode
from pydantic import BaseModel, Field

# OpenInference semantic conventions
try:
    from openinference.semconv.resource import ResourceAttributes
    from openinference.semconv.trace import SpanAttributes
    OPENINFERENCE_AVAILABLE = True
except ImportError:
    OPENINFERENCE_AVAILABLE = False
    logging.warning("OpenInference not available. Using standard OpenTelemetry attributes.")

# ============================================================================
# CONFIGURATION
# ============================================================================

PHOENIX_ENDPOINT = os.getenv("PHOENIX_COLLECTOR_ENDPOINT", "http://localhost:6006/v1/traces")
PROJECT_NAME = os.getenv("PHOENIX_PROJECT_NAME", "copilot-research")
PROXY_PORT = int(os.getenv("PROXY_PORT", "8080"))
PROXY_HOST = os.getenv("PROXY_HOST", "0.0.0.0")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# OPENTELEMETRY SETUP
# ============================================================================

def initialize_tracing() -> trace.Tracer:
    """Initialize OpenTelemetry tracing with Phoenix backend."""
    # Create resource with project name
    resource_attrs = {"service.name": "copilot-telemetry-proxy"}
    if OPENINFERENCE_AVAILABLE:
        resource_attrs[ResourceAttributes.PROJECT_NAME] = PROJECT_NAME

    resource = Resource(attributes=resource_attrs)

    # Create tracer provider
    tracer_provider = TracerProvider(resource=resource)

    # Create OTLP exporter
    span_exporter = OTLPSpanExporter(endpoint=PHOENIX_ENDPOINT)

    # Add batch processor
    span_processor = BatchSpanProcessor(span_exporter)
    tracer_provider.add_span_processor(span_processor)

    # Set global tracer provider
    trace.set_tracer_provider(tracer_provider)

    logger.info(f"OpenTelemetry tracing initialized. Endpoint: {PHOENIX_ENDPOINT}")
    return trace.get_tracer(__name__)

tracer = initialize_tracing()

# ============================================================================
# PYDANTIC MODELS (TZ Extension Format)
# ============================================================================

class CopilotChatMessage(BaseModel):
    """Chat message from TZ extension."""
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None

class CopilotTelemetryEvent(BaseModel):
    """Telemetry event from TZ Copilot Collector extension."""
    event_type: str = Field(..., description="chat, completion, or error")
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    timestamp: Optional[str] = None

    # Chat-specific fields
    messages: Optional[List[CopilotChatMessage]] = None
    model: Optional[str] = None
    agent_role: Optional[str] = None

    # Completion-specific fields
    completion_text: Optional[str] = None
    language: Optional[str] = None
    file_path: Optional[str] = None

    # Token counts
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None

    # Timing
    latency_ms: Optional[int] = None

    # Context
    workspace: Optional[str] = None
    instructions: Optional[str] = None
    tools_available: Optional[List[str]] = None
    tools_used: Optional[List[str]] = None

    # User feedback
    feedback: Optional[str] = None  # "positive", "negative", or null

    # Error info
    error_message: Optional[str] = None
    error_code: Optional[str] = None

# ============================================================================
# FASTAPI APPLICATION
# ============================================================================

app = FastAPI(
    title="Copilot → Phoenix Telemetry Proxy",
    description="Receives GitHub Copilot telemetry and forwards to Phoenix",
    version="1.0.0"
)

# Add CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def hash_user_id(user_id: str) -> str:
    """Hash user ID for privacy."""
    return hashlib.sha256(user_id.encode()).hexdigest()[:16]

def extract_user_prompt(messages: List[CopilotChatMessage]) -> str:
    """Extract the last user message."""
    for msg in reversed(messages):
        if msg.role == "user":
            return msg.content
    return ""

def extract_assistant_response(messages: List[CopilotChatMessage]) -> str:
    """Extract the last assistant message."""
    for msg in reversed(messages):
        if msg.role == "assistant":
            return msg.content
    return ""

def set_openinference_attributes(span: trace.Span, event: CopilotTelemetryEvent):
    """Set OpenInference semantic attributes on span."""
    if not OPENINFERENCE_AVAILABLE:
        return

    # LLM attributes
    if event.model:
        span.set_attribute(SpanAttributes.LLM_MODEL_NAME, event.model)

    if event.input_tokens:
        span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_PROMPT, event.input_tokens)

    if event.output_tokens:
        span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_COMPLETION, event.output_tokens)

    if event.total_tokens:
        span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_TOTAL, event.total_tokens)

    # Input/Output
    if event.messages:
        user_prompt = extract_user_prompt(event.messages)
        assistant_response = extract_assistant_response(event.messages)

        if user_prompt:
            span.set_attribute(SpanAttributes.INPUT_VALUE, user_prompt)
        if assistant_response:
            span.set_attribute(SpanAttributes.OUTPUT_VALUE, assistant_response)

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "phoenix_endpoint": PHOENIX_ENDPOINT,
        "project_name": PROJECT_NAME,
        "openinference_available": OPENINFERENCE_AVAILABLE
    }

@app.post("/telemetry")
async def receive_telemetry(event: CopilotTelemetryEvent):
    """
    Receive telemetry from TZ Copilot Collector extension.

    This endpoint receives GitHub Copilot interactions and creates
    OpenTelemetry spans with OpenInference semantic conventions,
    then exports to Phoenix for analysis.
    """
    try:
        logger.debug(f"Received telemetry event: {event.event_type}")

        # Determine span name
        span_name = f"copilot.{event.event_type}"
        if event.agent_role:
            span_name = f"{span_name}.{event.agent_role}"

        # Create span
        with tracer.start_as_current_span(span_name) as span:
            # Basic attributes
            span.set_attribute("copilot.event_type", event.event_type)

            if event.session_id:
                span.set_attribute("session.id", hash_user_id(event.session_id))

            if event.request_id:
                span.set_attribute("request.id", event.request_id)

            if event.agent_role:
                span.set_attribute("copilot.agent_role", event.agent_role)

            if event.workspace:
                span.set_attribute("workspace.name", event.workspace)

            if event.instructions:
                span.set_attribute("copilot.instructions", event.instructions)

            # Tools
            if event.tools_available:
                span.set_attribute("copilot.tools.available", ",".join(event.tools_available))
                span.set_attribute("copilot.tools.available_count", len(event.tools_available))

            if event.tools_used:
                span.set_attribute("copilot.tools.used", ",".join(event.tools_used))
                span.set_attribute("copilot.tools.used_count", len(event.tools_used))

            # Timing
            if event.latency_ms:
                span.set_attribute("latency.ms", event.latency_ms)

            # Feedback
            if event.feedback:
                span.set_attribute("copilot.feedback", event.feedback)

            # Event-specific handling
            if event.event_type == "chat":
                # Set OpenInference attributes for chat
                set_openinference_attributes(span, event)

                # Code context
                if event.file_path:
                    span.set_attribute("code.file_path", event.file_path)
                if event.language:
                    span.set_attribute("code.language", event.language)

            elif event.event_type == "completion":
                if event.completion_text:
                    span.set_attribute("completion.text", event.completion_text)
                if event.file_path:
                    span.set_attribute("code.file_path", event.file_path)
                if event.language:
                    span.set_attribute("code.language", event.language)

            elif event.event_type == "error":
                if event.error_message:
                    span.set_attribute("error.message", event.error_message)
                if event.error_code:
                    span.set_attribute("error.code", event.error_code)
                span.set_status(Status(StatusCode.ERROR, event.error_message or "Unknown error"))

            # Mark successful events
            if event.event_type != "error":
                span.set_status(Status(StatusCode.OK))

        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "message": "Telemetry logged to Phoenix",
                "event_type": event.event_type,
                "request_id": event.request_id
            }
        )

    except Exception as e:
        logger.error(f"Error processing telemetry: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint with usage instructions."""
    return {
        "message": "Copilot → Phoenix Telemetry Proxy",
        "version": "1.0.0",
        "endpoints": {
            "POST /telemetry": "Receive Copilot telemetry",
            "GET /health": "Health check",
            "GET /stats": "Proxy statistics"
        },
        "phoenix_ui": f"{PHOENIX_ENDPOINT.replace('/v1/traces', '')}",
        "configuration": {
            "phoenix_endpoint": PHOENIX_ENDPOINT,
            "project_name": PROJECT_NAME,
            "openinference_enabled": OPENINFERENCE_AVAILABLE
        }
    }

# Track stats
request_count = 0
error_count = 0

@app.middleware("http")
async def track_requests(request: Request, call_next):
    """Middleware to track request statistics."""
    global request_count, error_count
    request_count += 1

    try:
        response = await call_next(request)
        if response.status_code >= 400:
            error_count += 1
        return response
    except Exception:
        error_count += 1
        raise

@app.get("/stats")
async def get_stats():
    """Get proxy statistics."""
    return {
        "requests_received": request_count,
        "errors": error_count,
        "success_rate": f"{((request_count - error_count) / request_count * 100):.2f}%"
                       if request_count > 0 else "0%"
    }

# ============================================================================
# MAIN
# ============================================================================

def main():
    """Start the proxy server."""
    logger.info("Starting Copilot → Phoenix Telemetry Proxy")
    logger.info(f"Server: http://{PROXY_HOST}:{PROXY_PORT}")
    logger.info(f"Phoenix endpoint: {PHOENIX_ENDPOINT}")
    logger.info(f"Project: {PROJECT_NAME}")

    uvicorn.run(
        app,
        host=PROXY_HOST,
        port=PROXY_PORT,
        log_level=LOG_LEVEL.lower()
    )

if __name__ == "__main__":
    main()
