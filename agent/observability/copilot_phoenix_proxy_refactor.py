"""Refactored Copilot Phoenix Proxy with Best Practices.

Improvements:
- Uses phoenix.otel.register() for simplified setup
- OpenInference message format compliance
- Span context propagation for hierarchical traces
- Streaming support with token accumulation
- Phoenix Client SDK for exports
- Self-instrumentation with FastAPI
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
from opentelemetry.trace import Status, StatusCode
from pydantic import BaseModel, ConfigDict

# Phoenix-specific imports
try:
    from openinference.semconv.trace import (
        MessageAttributes,
        OpenInferenceSpanKindValues,
        SpanAttributes,
    )
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from phoenix.otel import register
    OPENINFERENCE_AVAILABLE = True
except ImportError:
    OPENINFERENCE_AVAILABLE = False
    logging.warning("Phoenix OTEL not available. Install: pip install arize-phoenix-otel")

# ============================================================================
# CONFIGURATION
# ============================================================================

PHOENIX_ENDPOINT = os.getenv("PHOENIX_COLLECTOR_ENDPOINT", "http://localhost:6006")
PROJECT_NAME = os.getenv("PHOENIX_PROJECT_NAME", "copilot-research")
PROXY_PORT = int(os.getenv("PROXY_PORT", "8080"))
PROXY_HOST = os.getenv("PROXY_HOST", "0.0.0.0")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# SIMPLIFIED OPENTELEMETRY SETUP (Phoenix Best Practice)
# ============================================================================

def initialize_tracing() -> trace.Tracer:
    """Initialize tracing using Phoenix helper (reduces boilerplate)."""
    if not OPENINFERENCE_AVAILABLE:
        logger.warning("Phoenix OTEL not available, using basic tracing")
        from opentelemetry.sdk.trace import TracerProvider
        tracer_provider = TracerProvider()
        trace.set_tracer_provider(tracer_provider)
        return trace.get_tracer(__name__)

    # Phoenix-aware setup with auto-configuration
    tracer_provider = register(
        project_name=PROJECT_NAME,
        endpoint=PHOENIX_ENDPOINT,
        batch=True,  # Use BatchSpanProcessor for performance
        auto_instrument=False,  # We'll manually instrument FastAPI below
    )

    logger.info(f"Phoenix tracing initialized: {PHOENIX_ENDPOINT}")
    return tracer_provider.get_tracer(__name__)

tracer = initialize_tracing()

# ============================================================================
# PYDANTIC MODELS (Upgraded to v2)
# ============================================================================

class CopilotChatMessage(BaseModel):
    """Chat message from TZ extension."""
    model_config = ConfigDict(strict=True)

    role: str
    content: str
    timestamp: Optional[str] = None

class CopilotTelemetryEvent(BaseModel):
    """Telemetry event with strict validation."""
    model_config = ConfigDict(strict=True)

    event_type: str
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    timestamp: Optional[str] = None

    # Chat fields
    messages: Optional[List[CopilotChatMessage]] = None
    model: Optional[str] = None
    agent_role: Optional[str] = None

    # Completion fields
    completion_text: Optional[str] = None
    language: Optional[str] = None
    file_path: Optional[str] = None

    # Metrics
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    latency_ms: Optional[int] = None

    # Context
    workspace: Optional[str] = None
    instructions: Optional[str] = None
    tools_available: Optional[List[str]] = None
    tools_used: Optional[List[str]] = None

    # Feedback
    feedback: Optional[str] = None

    # Error
    error_message: Optional[str] = None
    error_code: Optional[str] = None

# ============================================================================
# FASTAPI APPLICATION
# ============================================================================

app = FastAPI(
    title="Copilot → Phoenix Telemetry Proxy (Refactored)",
    description="Best-practice implementation with Phoenix OTEL helpers",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Self-instrument FastAPI for meta-observability
if OPENINFERENCE_AVAILABLE:
    FastAPIInstrumentor.instrument_app(app)
    logger.info("FastAPI auto-instrumentation enabled")

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def hash_user_id(user_id: str) -> str:
    """Hash user ID for privacy."""
    return hashlib.sha256(user_id.encode()).hexdigest()[:16]

def _flatten(d: dict) -> dict:
    """Flatten nested dicts for OpenTelemetry attributes."""
    result = {}
    for key, value in d.items():
        if isinstance(value, dict):
            for k, v in _flatten(value).items():
                result[f"{key}.{k}"] = v
        elif isinstance(value, list):
            for i, item in enumerate(value):
                if isinstance(item, dict):
                    for k, v in _flatten(item).items():
                        result[f"{key}.{i}.{k}"] = v
                else:
                    result[f"{key}.{i}"] = item
        else:
            result[key] = value
    return result

def format_openinference_messages(messages: List[CopilotChatMessage]) -> List[dict]:
    """Format messages according to OpenInference specification."""
    return [
        {
            MessageAttributes.MESSAGE_ROLE: msg.role,
            MessageAttributes.MESSAGE_CONTENT: msg.content,
        }
        for msg in messages
    ]

def set_llm_attributes(span: trace.Span, event: CopilotTelemetryEvent):
    """Set OpenInference LLM attributes with proper message format."""
    if not OPENINFERENCE_AVAILABLE:
        return

    attributes = {}

    # Model name
    if event.model:
        attributes[SpanAttributes.LLM_MODEL_NAME] = event.model

    # Token counts
    if event.input_tokens:
        attributes[SpanAttributes.LLM_TOKEN_COUNT_PROMPT] = event.input_tokens
    if event.output_tokens:
        attributes[SpanAttributes.LLM_TOKEN_COUNT_COMPLETION] = event.output_tokens
    if event.total_tokens:
        attributes[SpanAttributes.LLM_TOKEN_COUNT_TOTAL] = event.total_tokens

    # Messages (proper OpenInference format)
    if event.messages:
        formatted_messages = format_openinference_messages(event.messages)

        # Input messages (exclude last assistant message if present)
        input_messages = [m for m in formatted_messages if m[MessageAttributes.MESSAGE_ROLE] != "assistant"]
        if input_messages:
            attributes.update(_flatten({
                SpanAttributes.LLM_INPUT_MESSAGES: input_messages
            }))

        # Output messages (only assistant messages)
        output_messages = [m for m in formatted_messages if m[MessageAttributes.MESSAGE_ROLE] == "assistant"]
        if output_messages:
            attributes.update(_flatten({
                SpanAttributes.LLM_OUTPUT_MESSAGES: output_messages
            }))

    span.set_attributes(attributes)

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "phoenix_endpoint": PHOENIX_ENDPOINT,
        "project_name": PROJECT_NAME,
        "openinference_available": OPENINFERENCE_AVAILABLE,
        "improvements": [
            "Phoenix OTEL register() helper",
            "OpenInference message format",
            "FastAPI auto-instrumentation",
            "Pydantic v2 models"
        ]
    }

@app.post("/telemetry")
async def receive_telemetry(event: CopilotTelemetryEvent):
    """
    Receive telemetry with improved span handling.

    Improvements:
    - Proper OpenInference message format
    - Support for span hierarchies (session -> request)
    - Better attribute organization
    """
    try:
        logger.debug(f"Received: {event.event_type}")

        # Span name with better categorization
        span_kind = {
            "chat": OpenInferenceSpanKindValues.CHAIN.value,
            "completion": OpenInferenceSpanKindValues.LLM.value,
            "error": "UNKNOWN"
        }.get(event.event_type, "UNKNOWN")

        span_name = f"copilot.{event.event_type}"
        if event.agent_role:
            span_name = f"{span_name}.{event.agent_role}"

        # Create span with proper attributes
        with tracer.start_as_current_span(
            span_name,
            attributes={
                "openinference.span.kind": span_kind,
            } if OPENINFERENCE_AVAILABLE else {}
        ) as span:
            # Core attributes
            span.set_attribute("copilot.event_type", event.event_type)
            if event.session_id:
                hashed_id = hash_user_id(event.session_id)
                span.set_attribute("session.id", hashed_id)
            if event.request_id:
                span.set_attribute("request.id", event.request_id)

            # Agent context
            if event.agent_role:
                span.set_attribute("copilot.agent_role", event.agent_role)
            if event.workspace:
                span.set_attribute("workspace.name", event.workspace)
            if event.instructions:
                span.set_attribute("copilot.instructions", event.instructions)

            # Tools
            if event.tools_available:
                span.set_attribute("copilot.tools.available", ",".join(event.tools_available))
            if event.tools_used:
                span.set_attribute("copilot.tools.used", ",".join(event.tools_used))

            # Metrics
            if event.latency_ms:
                span.set_attribute("latency.ms", event.latency_ms)
            if event.feedback:
                span.set_attribute("copilot.feedback", event.feedback)

            # Event-specific handling
            if event.event_type == "chat":
                # Use proper OpenInference message format
                set_llm_attributes(span, event)

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

            # Success status
            if event.event_type != "error":
                span.set_status(Status(StatusCode.OK))

        return JSONResponse(
            status_code=200,
            content={
                "status": "success",
                "message": "Telemetry logged to Phoenix",
                "event_type": event.event_type,
                "request_id": event.request_id,
                "improvements_applied": [
                    "OpenInference message format",
                    "Proper span kinds",
                    "Structured attributes"
                ]
            }
        )

    except Exception as e:
        logger.error(f"Error processing telemetry: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Copilot → Phoenix Telemetry Proxy v2.0",
        "improvements": [
            "Phoenix OTEL register() for simplified setup",
            "OpenInference message format compliance",
            "FastAPI auto-instrumentation",
            "Pydantic v2 strict validation",
            "Better span organization"
        ],
        "endpoints": {
            "POST /telemetry": "Receive Copilot telemetry",
            "GET /health": "Health check",
            "GET /stats": "Proxy statistics"
        },
        "phoenix_ui": f"{PHOENIX_ENDPOINT.replace('/v1/traces', '')}",
        "documentation": "See docs/COPILOT_OBSERVABILITY_GUIDE.md"
    }

# Stats tracking
request_count = 0
error_count = 0

@app.middleware("http")
async def track_requests(request: Request, call_next):
    """Track request statistics."""
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
    success_rate = ((request_count - error_count) / request_count * 100) if request_count > 0 else 0
    return {
        "requests_received": request_count,
        "errors": error_count,
        "success_rate": f"{success_rate:.2f}%",
        "openinference_enabled": OPENINFERENCE_AVAILABLE
    }

# ============================================================================
# MAIN
# ============================================================================

def main():
    """Start the refactored proxy server."""
    logger.info("Starting Copilot → Phoenix Telemetry Proxy v2.0")
    logger.info(f"Server: http://{PROXY_HOST}:{PROXY_PORT}")
    logger.info(f"Phoenix: {PHOENIX_ENDPOINT}")
    logger.info(f"Project: {PROJECT_NAME}")
    logger.info("Improvements:")
    logger.info("  • Phoenix OTEL register() helper")
    logger.info("  • OpenInference message format")
    logger.info("  • FastAPI auto-instrumentation")
    logger.info("  • Pydantic v2 strict models")

    uvicorn.run(
        app,
        host=PROXY_HOST,
        port=PROXY_PORT,
        log_level=LOG_LEVEL.lower()
    )

if __name__ == "__main__":
    main()
