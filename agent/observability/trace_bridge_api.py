"""
Lightweight FastAPI bridge for uploading VS Code Copilot Chat JSON as traces.

Phoenix only accepts protobuf OTLP on its HTTP endpoint (/v1/traces).
This bridge accepts JSON from n8n (or any HTTP client), then uses the
Python OTel SDK to serialize and forward as protobuf.

Usage:
    # Start the bridge (default port 8787)
    python -m agent.observability.trace_bridge_api

    # Custom port
    BRIDGE_PORT=9000 python -m agent.observability.trace_bridge_api

    # Then POST from n8n or curl:
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
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Copilot Chat → Phoenix Trace Bridge",
    description="Accepts chat.json data via HTTP and uploads as OTLP traces to Phoenix",
    version="1.0.0",
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


@app.get("/health")
async def health():
    return {"status": "ok", "service": "trace-bridge"}


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


if __name__ == "__main__":
    port = int(os.getenv("BRIDGE_PORT", "8787"))
    logger.info(f"Starting trace bridge on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
