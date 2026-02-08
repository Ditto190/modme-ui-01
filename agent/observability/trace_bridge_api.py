"""
Universal Chat Trace Bridge — JSON → OTLP Protobuf → Phoenix.

Phoenix only accepts protobuf OTLP on its HTTP endpoint (/v1/traces).
This bridge accepts JSON from n8n (or any HTTP client), then uses the
Python OTel SDK to serialize and forward as protobuf.

Endpoints:
    GET  /health       — Health check
    POST /upload       — Legacy: accepts raw Copilot chat.json (backward-compatible)
    POST /upload-file  — Legacy: accepts multipart file upload
    POST /ingest       — Universal: accepts normalized UniversalTurnPayload from n8n pipeline

The /ingest endpoint is format-agnostic. The n8n pipeline handles detection
and normalization; this bridge only handles OTLP serialization.

Usage:
    # Start the bridge (default port 8787)
    python -m agent.observability.trace_bridge_api

    # Custom port
    BRIDGE_PORT=9000 python -m agent.observability.trace_bridge_api

    # Universal ingest (from n8n pipeline):
    curl -X POST http://localhost:8787/ingest \
      -H "Content-Type: application/json" \
      -d '{"format": "copilot-chat", "agent": "GitHub Copilot", "turns": [...]}'

    # Legacy upload (backward-compatible):
    curl -X POST http://localhost:8787/upload \
      -H "Content-Type: application/json" \
      -d '{"projectName": "my-project", "chatData": {...}}'
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

# Import the existing uploader
from agent.observability.upload_chat_traces import (
    upload_chat_json,
    init_tracer,
    upload_turn_as_trace,
    PHOENIX_ENDPOINT,
    PROJECT_NAME,
    HAS_OPENINFERENCE,
)
from opentelemetry import trace

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Universal Chat → Phoenix Trace Bridge",
    description=(
        "Accepts chat data via HTTP and uploads as OTLP traces to Phoenix. "
        "Supports both legacy Copilot-specific format (/upload) and "
        "universal normalized format (/ingest) from the n8n pipeline."
    ),
    version="2.0.0",
)


def upload_chat_data(
    chat_data: dict,
    project_name: str = PROJECT_NAME,
    endpoint: str = PHOENIX_ENDPOINT,
) -> Dict[str, Any]:
    """Upload chat data directly (no file needed).

    This mirrors upload_chat_json() but accepts a dict instead of a file path.
    """
    start = time.monotonic()

    responder = chat_data.get("responderUsername", "unknown")
    requests_list = chat_data.get("requests", [])
    session_id = ""

    if not requests_list:
        return {"status": "error", "message": "No requests/turns found in chat data"}

    logger.info(f"Processing {len(requests_list)} turns, responder={responder}")

    tracer, provider = init_tracer(project_name=project_name, endpoint=endpoint)

    uploaded = 0
    skipped = 0

    for idx, req in enumerate(requests_list):
        if not session_id:
            session_id = (
                req.get("result", {}).get("metadata", {}).get("sessionId", "")
            )

        ok = upload_turn_as_trace(
            tracer,
            req,
            turn_index=idx,
            responder=responder,
            session_id=session_id,
        )
        if ok:
            uploaded += 1
        else:
            skipped += 1

    # Flush all pending spans
    logger.info("Flushing spans to Phoenix...")
    provider.force_flush(timeout_millis=30_000)
    provider.shutdown()

    elapsed = time.monotonic() - start

    summary = {
        "status": "success",
        "project": project_name,
        "endpoint": endpoint,
        "total_turns": len(requests_list),
        "uploaded": uploaded,
        "skipped": skipped,
        "session_id": session_id,
        "elapsed_seconds": round(elapsed, 2),
    }

    logger.info(
        f"Done: {uploaded} traces uploaded, {skipped} skipped "
        f"in {elapsed:.1f}s → project={project_name}"
    )
    return summary


# ============================================================================
# UNIVERSAL TURN INGESTION — format-agnostic, pre-normalized by n8n pipeline
# ============================================================================


def upload_universal_turns(
    payload: dict,
    endpoint: str = PHOENIX_ENDPOINT,
) -> Dict[str, Any]:
    """Upload pre-normalized turns from the Universal Turn Format.

    This is the format-agnostic counterpart to upload_chat_data().
    The n8n pipeline has already handled detection + normalization;
    we just map to OTLP spans.

    Expected payload shape (UniversalTurnPayload):
        {
            "format": "copilot-chat",
            "agent": "GitHub Copilot",
            "projectName": "chat-traces",
            "sessionId": "abc-123",
            "responder": "user@example.com",
            "turns": [
                {
                    "index": 0,
                    "userMessage": "Help me...",
                    "assistantResponse": "Here's...",
                    "model": "claude-sonnet-4.5",
                    "timestampMs": 1770501001707,
                    "latencyMs": 3200,
                    "tokens": {"prompt": 1500, "completion": 800},
                    "toolCalls": [{"name": "read_file", "input": "...", "output": "..."}],
                    "thinking": "...",
                    "metadata": {}
                }
            ]
        }
    """
    start = time.monotonic()

    format_id = payload.get("format", "unknown")
    agent_name = payload.get("agent", "unknown")
    project_name = payload.get("projectName", PROJECT_NAME)
    session_id = payload.get("sessionId", "")
    responder = payload.get("responder", "unknown")
    turns = payload.get("turns", [])

    if not turns:
        return {"status": "error", "message": "No turns in payload"}

    logger.info(
        f"[/ingest] Processing {len(turns)} universal turns — "
        f"format={format_id} agent={agent_name} project={project_name}"
    )

    tracer, provider = init_tracer(project_name=project_name, endpoint=endpoint)

    uploaded = 0
    skipped = 0
    errors_list = []

    for turn in turns:
        try:
            ok = _upload_universal_turn(
                tracer, turn,
                agent_name=agent_name,
                responder=responder,
                session_id=session_id,
                format_id=format_id,
            )
            if ok:
                uploaded += 1
            else:
                skipped += 1
        except Exception as e:
            errors_list.append(f"Turn {turn.get('index', '?')}: {e}")
            skipped += 1

    logger.info("Flushing spans to Phoenix...")
    provider.force_flush(timeout_millis=30_000)
    provider.shutdown()

    elapsed = time.monotonic() - start

    summary = {
        "status": "success" if uploaded > 0 else "error",
        "format": format_id,
        "agent": agent_name,
        "project": project_name,
        "endpoint": endpoint,
        "total_turns": len(turns),
        "uploaded": uploaded,
        "skipped": skipped,
        "session_id": session_id,
        "elapsed_seconds": round(elapsed, 2),
    }
    if errors_list:
        summary["errors"] = errors_list[:20]  # Cap error list

    logger.info(
        f"[/ingest] Done: {uploaded} traces uploaded, {skipped} skipped "
        f"in {elapsed:.1f}s → project={project_name}"
    )
    return summary


def _upload_universal_turn(
    tracer,
    turn: dict,
    agent_name: str,
    responder: str,
    session_id: str,
    format_id: str,
) -> bool:
    """Create a full trace (AGENT → LLM → TOOL×N) from a universal turn.

    This mirrors upload_turn_as_trace() but works with the normalized format
    instead of Copilot-specific structure.
    """
    from opentelemetry.trace import Status, StatusCode

    idx = turn.get("index", 0)
    user_text = turn.get("userMessage", "")
    if not user_text.strip():
        return False

    assistant_text = turn.get("assistantResponse", "")
    model_id = turn.get("model", "unknown")
    timestamp_ms = turn.get("timestampMs")
    latency_ms = turn.get("latencyMs", 0) or 0
    tokens = turn.get("tokens", {})
    prompt_tokens = tokens.get("prompt", 0)
    completion_tokens = tokens.get("completion", 0)
    total_tokens = prompt_tokens + completion_tokens
    tool_calls = turn.get("toolCalls", [])
    thinking = turn.get("thinking", "")
    metadata = turn.get("metadata", {})

    # Compute timestamps in nanoseconds
    if timestamp_ms:
        turn_start_ns = int(timestamp_ms) * 1_000_000
    else:
        turn_start_ns = int(time.time() * 1e9)

    turn_end_ns = turn_start_ns + int(latency_ms * 1_000_000) if latency_ms else turn_start_ns + 1_000_000_000

    # ── AGENT SPAN (root) ──────────────────────────────────────
    agent_span = tracer.start_span(
        name=f"{format_id}-turn-{idx}",
        start_time=turn_start_ns,
    )

    agent_span.set_attribute("openinference.span.kind", "AGENT")
    agent_span.set_attribute("input.value", user_text[:4000])
    agent_span.set_attribute("output.value", assistant_text[:4000])
    agent_span.set_attribute("session.id", session_id)
    agent_span.set_attribute("metadata.turn_index", idx)
    agent_span.set_attribute("metadata.responder", responder)
    agent_span.set_attribute("metadata.model_id", model_id)
    agent_span.set_attribute("metadata.format", format_id)
    agent_span.set_attribute("metadata.agent_name", agent_name)

    if thinking:
        agent_span.set_attribute("metadata.thinking", thinking[:4000])

    # Preserve any extra metadata from the normalizer
    for key, value in metadata.items():
        if isinstance(value, (str, int, float, bool)):
            agent_span.set_attribute(f"metadata.{key}", value)

    agent_ctx = trace.set_span_in_context(agent_span)

    # ── LLM SPAN (child of AGENT) ─────────────────────────────
    llm_start_ns = turn_start_ns + 100_000_000  # 100ms into the turn
    llm_end_ns = turn_end_ns - 1_000_000

    llm_span = tracer.start_span(
        name=f"llm:{model_id}",
        context=agent_ctx,
        start_time=llm_start_ns,
    )

    llm_span.set_attribute("openinference.span.kind", "LLM")

    if HAS_OPENINFERENCE:
        from openinference.semconv.trace import SpanAttributes
        llm_span.set_attribute(SpanAttributes.LLM_MODEL_NAME, model_id)
        llm_span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_PROMPT, prompt_tokens)
        llm_span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_COMPLETION, completion_tokens)
        llm_span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_TOTAL, total_tokens)
        llm_span.set_attribute(SpanAttributes.INPUT_VALUE, user_text[:4000])
        llm_span.set_attribute(SpanAttributes.OUTPUT_VALUE, assistant_text[:4000])
    else:
        llm_span.set_attribute("llm.model_name", model_id)
        llm_span.set_attribute("llm.token_count.prompt", prompt_tokens)
        llm_span.set_attribute("llm.token_count.completion", completion_tokens)
        llm_span.set_attribute("llm.token_count.total", total_tokens)
        llm_span.set_attribute("input.value", user_text[:4000])
        llm_span.set_attribute("output.value", assistant_text[:4000])

    # LLM messages (OpenInference format)
    llm_span.set_attribute("llm.input_messages.0.message.role", "user")
    llm_span.set_attribute("llm.input_messages.0.message.content", user_text[:4000])
    llm_span.set_attribute("llm.output_messages.0.message.role", "assistant")
    llm_span.set_attribute("llm.output_messages.0.message.content", assistant_text[:4000])

    llm_span.set_status(Status(StatusCode.OK))

    # ── TOOL SPANS (children of LLM) ──────────────────────────
    llm_ctx = trace.set_span_in_context(llm_span)
    total_tools = len(tool_calls)

    if total_tools > 0:
        tool_duration_ns = int(latency_ms * 1_000_000 * 0.6 / max(total_tools, 1))
        current_ns = llm_start_ns + int(latency_ms * 1_000_000 * 0.1)

        for tc in tool_calls:
            tool_name = tc.get("name", "unknown_tool")
            tool_start = current_ns
            tool_end = current_ns + tool_duration_ns

            tool_span = tracer.start_span(
                name=f"tool:{tool_name}",
                context=llm_ctx,
                start_time=tool_start,
            )
            tool_span.set_attribute("openinference.span.kind", "TOOL")
            tool_span.set_attribute("tool.name", tool_name)

            tool_input = tc.get("input", "")
            if tool_input:
                tool_span.set_attribute("input.value", str(tool_input)[:2000])

            tool_output = tc.get("output", "")
            if tool_output:
                tool_span.set_attribute("output.value", str(tool_output)[:2000])

            if tc.get("round") is not None:
                tool_span.set_attribute("tool.call_round", tc["round"])

            tool_span.set_status(Status(StatusCode.OK))
            tool_span.end(end_time=tool_end)

            current_ns = tool_end + 1_000_000

    # Finalise spans
    llm_span.end(end_time=llm_end_ns)
    agent_span.set_status(Status(StatusCode.OK))
    agent_span.end(end_time=turn_end_ns)

    logger.debug(
        f"Turn {idx}: model={model_id} tokens={total_tokens} tools={total_tools}"
    )
    return True


# ============================================================================
# HTTP ENDPOINTS
# ============================================================================


@app.get("/health")
async def health():
    return {"status": "ok", "service": "trace-bridge", "version": "2.0.0"}


@app.post("/upload")
async def upload_traces(request: Request):
    """Accept chat.json data and upload as traces to Phoenix.

    Expected JSON body:
        {
            "projectName": "copilot-research",  // optional
            "phoenixUrl": "http://...",          // optional override
            "chatData": { ... }                  // the VS Code chat.json content
        }

    Or just send the raw chat.json content directly as the body.
    """
    try:
        body = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")

    # Support both wrapped and raw formats
    if "chatData" in body:
        chat_data = body["chatData"]
        project_name = body.get("projectName", PROJECT_NAME)
        endpoint = body.get("phoenixUrl", PHOENIX_ENDPOINT)
    elif "requests" in body:
        # Raw chat.json sent directly
        chat_data = body
        project_name = PROJECT_NAME
        endpoint = PHOENIX_ENDPOINT
    else:
        raise HTTPException(
            status_code=400,
            detail="Body must contain 'chatData' (wrapped) or 'requests' (raw chat.json)",
        )

    try:
        result = upload_chat_data(
            chat_data=chat_data,
            project_name=project_name,
            endpoint=endpoint,
        )
    except Exception as e:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail=str(e))

    return JSONResponse(content=result)


@app.post("/upload-file")
async def upload_file(request: Request):
    """Accept a chat.json file upload (multipart form) and upload as traces.

    Usage:
        curl -X POST http://localhost:8787/upload-file \
          -F "file=@datasets/chat.json" \
          -F "projectName=copilot-research"
    """
    form = await request.form()
    file = form.get("file")
    if not file:
        raise HTTPException(status_code=400, detail="No 'file' field in form data")

    project_name = form.get("projectName", PROJECT_NAME)

    # Read file content
    content = await file.read()
    try:
        chat_data = json.loads(content)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON file: {e}")

    try:
        result = upload_chat_data(
            chat_data=chat_data,
            project_name=project_name,
        )
    except Exception as e:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail=str(e))

    return JSONResponse(content=result)


@app.post("/ingest")
async def ingest_universal(request: Request):
    """Accept pre-normalized UniversalTurnPayload and upload as traces.

    This is the format-agnostic endpoint used by the n8n Universal Chat
    Ingestion pipeline. The n8n pipeline handles:
      1. Agent detection (fingerprinting)
      2. Schema-based extraction
      3. Normalization to UniversalTurnPayload

    This endpoint handles:
      4. OTLP span creation
      5. Protobuf serialization
      6. Upload to Phoenix

    Expected JSON body (UniversalTurnPayload):
        {
            "format": "copilot-chat",        // detected format ID
            "agent": "GitHub Copilot",        // agent display name
            "projectName": "chat-traces",     // Phoenix project
            "sessionId": "abc-123",           // optional
            "responder": "user@example.com",  // optional
            "turns": [                        // normalized turns
                {
                    "index": 0,
                    "userMessage": "...",
                    "assistantResponse": "...",
                    "model": "claude-sonnet-4.5",
                    "timestampMs": 1770501001707,
                    "latencyMs": 3200,
                    "tokens": {"prompt": 1500, "completion": 800},
                    "toolCalls": [{"name": "read_file", ...}],
                    "thinking": "...",
                    "metadata": {}
                }
            ]
        }
    """
    try:
        body = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}")

    # Validate required fields
    if "turns" not in body or not isinstance(body["turns"], list):
        raise HTTPException(
            status_code=400,
            detail="Body must contain 'turns' array (UniversalTurnPayload format)",
        )

    if not body.get("format"):
        raise HTTPException(
            status_code=400,
            detail="Body must contain 'format' field identifying the source agent format",
        )

    endpoint = body.get("phoenixUrl", PHOENIX_ENDPOINT)

    try:
        result = upload_universal_turns(payload=body, endpoint=endpoint)
    except Exception as e:
        logger.exception("[/ingest] Upload failed")
        raise HTTPException(status_code=500, detail=str(e))

    return JSONResponse(content=result)


@app.get("/formats")
async def list_formats():
    """List which formats the bridge supports.

    The bridge itself is format-agnostic (it processes UniversalTurnPayload),
    but this endpoint documents what the n8n pipeline can detect.
    """
    return {
        "note": "The bridge is format-agnostic. Detection happens in the n8n pipeline.",
        "endpoints": {
            "/upload": "Legacy Copilot-specific format (backward-compatible)",
            "/upload-file": "Legacy file upload (Copilot format)",
            "/ingest": "Universal normalized format (from n8n pipeline)",
        },
        "universal_turn_schema": {
            "format": "string (detected format ID)",
            "agent": "string (agent display name)",
            "projectName": "string (Phoenix project)",
            "sessionId": "string? (session ID)",
            "responder": "string? (user identity)",
            "turns": [
                {
                    "index": "int",
                    "userMessage": "string",
                    "assistantResponse": "string",
                    "model": "string",
                    "timestampMs": "int?",
                    "latencyMs": "int?",
                    "tokens": {"prompt": "int", "completion": "int"},
                    "toolCalls": [{"name": "string", "input": "string?", "output": "string?"}],
                    "thinking": "string?",
                    "metadata": "object?",
                }
            ],
        },
    }


if __name__ == "__main__":
    port = int(os.getenv("BRIDGE_PORT", "8787"))
    logger.info(f"Starting trace bridge on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
