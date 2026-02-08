"""
Upload VS Code Copilot Chat JSON as OpenTelemetry Traces to Phoenix.

Reads a chat.json export and creates a trace per conversation turn using
OpenInference semantic conventions so Phoenix renders them as rich LLM traces.

Trace hierarchy per turn:
    AGENT  (root)  – full turn context, user input → assistant output
    └─ LLM         – model inference (tokens, latency, messages)
       └─ TOOL × N – each tool invocation from toolCallRounds[]

Timestamps are back-dated to the original chat timestamps so Phoenix
displays them at the correct time, not at upload time.

Usage:
    # Upload a single chat.json
    python -m agent.observability.upload_chat_traces datasets/chat.json

    # Custom project name
    python -m agent.observability.upload_chat_traces datasets/chat.json \
        --project copilot-research

    # Dry run (parse + print, no upload)
    python -m agent.observability.upload_chat_traces datasets/chat.json --dry-run

Environment Variables:
    PHOENIX_COLLECTOR_ENDPOINT: Phoenix OTLP endpoint (default: http://localhost:6006/v1/traces)
    PHOENIX_PROJECT_NAME: Project name (default: copilot-research)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import Status, StatusCode

# OpenInference semantic conventions
try:
    from openinference.semconv.resource import ResourceAttributes
    from openinference.semconv.trace import SpanAttributes
    HAS_OPENINFERENCE = True
except ImportError:
    HAS_OPENINFERENCE = False

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION
# ============================================================================

PHOENIX_ENDPOINT = os.getenv(
    "PHOENIX_COLLECTOR_ENDPOINT", "http://localhost:6006/v1/traces"
)
PROJECT_NAME = os.getenv("PHOENIX_PROJECT_NAME", "copilot-research")

# ============================================================================
# OTEL INITIALISATION
# ============================================================================


def init_tracer(
    project_name: str = PROJECT_NAME,
    endpoint: str = PHOENIX_ENDPOINT,
) -> trace.Tracer:
    """Create a TracerProvider wired to Phoenix via OTLP HTTP."""
    resource_attrs: Dict[str, str] = {
        "service.name": "copilot-chat-import",
    }
    if HAS_OPENINFERENCE:
        resource_attrs[ResourceAttributes.PROJECT_NAME] = project_name

    resource = Resource(attributes=resource_attrs)
    provider = TracerProvider(resource=resource)

    exporter = OTLPSpanExporter(endpoint=endpoint)
    processor = BatchSpanProcessor(exporter)
    provider.add_span_processor(processor)

    # Don't clobber the global provider — keep this isolated
    logger.info(f"Tracer ready → {endpoint}  project={project_name}")
    return provider.get_tracer("copilot-chat-import"), provider


# ============================================================================
# HELPERS — shared with copilot_chat_parser.py
# ============================================================================


def _ts_to_ns(ts: Any) -> Optional[int]:
    """Convert a chat.json timestamp (ms or s) to nanoseconds since epoch.

    OpenTelemetry span start/end times are in nanoseconds.
    """
    if ts is None:
        return None
    try:
        ts_int = int(ts)
        if ts_int > 1e12:
            # Already milliseconds → convert to nanoseconds
            return ts_int * 1_000_000
        else:
            # Seconds → nanoseconds
            return ts_int * 1_000_000_000
    except (ValueError, TypeError):
        return None


def _ts_to_iso(ts: Any) -> Optional[str]:
    """Convert timestamp to ISO string for attribute values."""
    if ts is None:
        return None
    try:
        ts_int = int(ts)
        if ts_int > 1e12:
            ts_int = ts_int // 1000
        return datetime.fromtimestamp(ts_int, tz=timezone.utc).isoformat()
    except (ValueError, OSError):
        return str(ts)


def _extract_text_from_rich_node(node: Any) -> str:
    """Recursively extract plain text from VS Code rich text node trees."""
    if isinstance(node, str):
        return node
    if not isinstance(node, dict):
        return ""
    parts: list[str] = []
    if "text" in node and isinstance(node["text"], str):
        parts.append(node["text"])
    for child in node.get("children", []):
        parts.append(_extract_text_from_rich_node(child))
    return " ".join(p for p in parts if p).strip()


def _extract_response_text(responses: List[Dict]) -> str:
    """Concatenate text-bearing response parts into assistant output."""
    text_parts: list[str] = []
    for resp in responses:
        kind = resp.get("kind", "")
        if kind == "thinking":
            continue
        elif kind == "toolInvocationSerialized":
            msg = resp.get("pastTenseMessage") or resp.get("invocationMessage") or ""
            if isinstance(msg, dict):
                msg = msg.get("value", "")
            if msg:
                text_parts.append(f"[Tool] {msg}")
        elif kind == "progressTaskSerialized":
            content = resp.get("content", {})
            if isinstance(content, dict) and "value" in content:
                text_parts.append(content["value"])
        elif kind in ("mcpServersStarting", "undoStop", "confirmation"):
            continue
        else:
            val = resp.get("value", "")
            if isinstance(val, str) and val.strip():
                text_parts.append(val)
    return "\n".join(text_parts)


def _extract_thinking(responses: List[Dict]) -> str:
    """Pull thinking/chain-of-thought blocks."""
    parts = [r["value"] for r in responses if r.get("kind") == "thinking" and r.get("value")]
    return "\n---\n".join(parts) if parts else ""


def _extract_tools_invoked(responses: List[Dict]) -> List[str]:
    """Unique tool IDs actually invoked during this turn."""
    seen = set()
    tools = []
    for resp in responses:
        if resp.get("kind") == "toolInvocationSerialized":
            tid = resp.get("toolId", "")
            if tid and tid not in seen:
                seen.add(tid)
                tools.append(tid)
    return tools


# ============================================================================
# SPAN BUILDERS
# ============================================================================


def _safe_set(span, key: str, value: Any) -> None:
    """Set a span attribute only if value is not None/empty."""
    if value is None:
        return
    if isinstance(value, str) and not value.strip():
        return
    if isinstance(value, list) and not value:
        return
    span.set_attribute(key, value)


def _build_tool_spans(
    tracer: trace.Tracer,
    parent_context,
    metadata: Dict,
    responses: List[Dict],
    turn_start_ns: int,
    turn_latency_ms: int,
) -> int:
    """Create TOOL child spans from toolCallRounds[].

    Returns the number of tool spans created.
    """
    rounds = metadata.get("toolCallRounds", [])
    if not rounds:
        return 0

    total_tools = sum(len(r.get("toolCalls", [])) for r in rounds)
    if total_tools == 0:
        return 0

    # Distribute tool call time evenly across the turn duration
    # (we don't have per-tool timing, so spread them out)
    tool_duration_ns = int(turn_latency_ms * 1_000_000 * 0.6 / max(total_tools, 1))

    tool_offset_ns = int(turn_latency_ms * 1_000_000 * 0.1)  # tools start 10% into turn
    current_ns = turn_start_ns + tool_offset_ns

    count = 0
    for round_idx, round_data in enumerate(rounds):
        for tc in round_data.get("toolCalls", []):
            tool_name = tc.get("name", "unknown_tool")
            tool_args = tc.get("arguments", "")

            tool_start = current_ns
            tool_end = current_ns + tool_duration_ns

            tool_span = tracer.start_span(
                name=f"tool:{tool_name}",
                context=parent_context,
                start_time=tool_start,
            )

            # Required: span kind
            tool_span.set_attribute("openinference.span.kind", "TOOL")
            _safe_set(tool_span, "tool.name", tool_name)

            # Tool input (arguments)
            if isinstance(tool_args, str):
                _safe_set(tool_span, "input.value", tool_args[:2000])
            elif isinstance(tool_args, dict):
                _safe_set(tool_span, "input.value", json.dumps(tool_args)[:2000])

            # Tool result
            result_val = tc.get("result", "")
            if isinstance(result_val, dict) and "node" in result_val:
                result_text = _extract_text_from_rich_node(result_val["node"])
                _safe_set(tool_span, "output.value", result_text[:2000])
            elif isinstance(result_val, str):
                _safe_set(tool_span, "output.value", result_val[:2000])

            # Metadata
            tool_span.set_attribute("tool.call_round", round_idx)

            tool_span.set_status(Status(StatusCode.OK))
            tool_span.end(end_time=tool_end)

            current_ns = tool_end + 1_000_000  # 1ms gap between tools
            count += 1

    return count


def upload_turn_as_trace(
    tracer: trace.Tracer,
    request: Dict[str, Any],
    turn_index: int,
    responder: str,
    session_id: str,
) -> bool:
    """Create a full trace (AGENT → LLM → TOOL×N) for one conversation turn.

    Returns True on success, False on failure.
    """
    try:
        message = request.get("message", {})
        responses = request.get("response", [])
        variables = request.get("variableData", {}).get("variables", [])
        result = request.get("result", {})
        result_meta = result.get("metadata", {})
        usage = result.get("usage", {})
        timings = result.get("timings", {})
        agent = request.get("agent", {})

        user_text = message.get("text", "")
        if not user_text.strip():
            logger.debug(f"Turn {turn_index}: skipping empty user message")
            return False

        assistant_text = _extract_response_text(responses)
        thinking_text = _extract_thinking(responses)

        model_id = request.get("modelId", "unknown")
        prompt_tokens = usage.get("promptTokens") or result_meta.get("promptTokens", 0) or 0
        completion_tokens = usage.get("completionTokens") or result_meta.get("outputTokens", 0) or 0
        total_tokens = prompt_tokens + completion_tokens
        latency_ms = timings.get("totalElapsed", 0) or 0
        first_progress_ms = timings.get("firstProgress", 0) or 0

        # Timestamps
        turn_start_ns = _ts_to_ns(request.get("timestamp"))
        if turn_start_ns is None:
            logger.warning(f"Turn {turn_index}: no timestamp, using now")
            turn_start_ns = int(time.time() * 1e9)

        turn_end_ns = turn_start_ns + int(latency_ms * 1_000_000) if latency_ms else turn_start_ns + 1_000_000_000

        # ── AGENT SPAN (root) ──────────────────────────────────────────
        agent_span = tracer.start_span(
            name=f"copilot-turn-{turn_index}",
            start_time=turn_start_ns,
        )

        agent_span.set_attribute("openinference.span.kind", "AGENT")
        _safe_set(agent_span, "input.value", user_text)
        _safe_set(agent_span, "output.value", assistant_text)
        _safe_set(agent_span, "session.id", session_id or result_meta.get("sessionId", ""))
        _safe_set(agent_span, "metadata.turn_index", turn_index)
        _safe_set(agent_span, "metadata.responder", responder)
        _safe_set(agent_span, "metadata.model_id", model_id)
        _safe_set(agent_span, "metadata.timestamp_iso", _ts_to_iso(request.get("timestamp")))

        # Agent identity
        agent_id = result_meta.get("agentId") or agent.get("id", "")
        agent_name = agent.get("fullName") or agent.get("name", "")
        _safe_set(agent_span, "metadata.agent_id", agent_id)
        _safe_set(agent_span, "metadata.agent_name", agent_name)

        # Thinking / CoT
        if thinking_text:
            _safe_set(agent_span, "metadata.thinking", thinking_text[:4000])

        # Context variables
        workspace_repos = [v.get("name", "") for v in variables if v.get("kind") == "workspace"]
        tools_available = [v.get("name") or v.get("id", "") for v in variables if v.get("kind") == "tool"]
        tools_invoked = _extract_tools_invoked(responses)

        _safe_set(agent_span, "metadata.workspace_repos", json.dumps(workspace_repos))
        _safe_set(agent_span, "metadata.tools_available", json.dumps(tools_available))
        _safe_set(agent_span, "metadata.tools_invoked", json.dumps(tools_invoked))
        _safe_set(agent_span, "metadata.tool_call_rounds", len(result_meta.get("toolCallRounds", [])))

        # MCP tracking
        mcp_servers = []
        mcp_tools = []
        for resp in responses:
            if resp.get("kind") == "mcpServersStarting":
                for sid in resp.get("didStartServerIds", []):
                    if sid and sid not in mcp_servers:
                        mcp_servers.append(sid)
        for var in variables:
            if var.get("kind") == "toolset":
                toolset_name = var.get("name", "unknown")
                for tool in var.get("value", []):
                    tname = tool.get("name") or tool.get("id", "") if isinstance(tool, dict) else str(tool)
                    if tname:
                        mcp_tools.append(f"{toolset_name}/{tname}")

        _safe_set(agent_span, "metadata.mcp_servers_started", json.dumps(mcp_servers))
        _safe_set(agent_span, "metadata.mcp_tools_available", json.dumps(mcp_tools))

        # Get the agent span context for child spans
        agent_ctx = trace.set_span_in_context(agent_span)

        # ── LLM SPAN (child of AGENT) ─────────────────────────────────
        llm_start_ns = turn_start_ns + int(first_progress_ms * 500_000)  # LLM starts partway through
        llm_end_ns = turn_end_ns - 1_000_000  # End just before agent ends

        llm_span = tracer.start_span(
            name=f"llm:{model_id}",
            context=agent_ctx,
            start_time=llm_start_ns,
        )

        llm_span.set_attribute("openinference.span.kind", "LLM")

        if HAS_OPENINFERENCE:
            _safe_set(llm_span, SpanAttributes.LLM_MODEL_NAME, model_id)
            llm_span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_PROMPT, prompt_tokens)
            llm_span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_COMPLETION, completion_tokens)
            llm_span.set_attribute(SpanAttributes.LLM_TOKEN_COUNT_TOTAL, total_tokens)
            _safe_set(llm_span, SpanAttributes.INPUT_VALUE, user_text[:4000])
            _safe_set(llm_span, SpanAttributes.OUTPUT_VALUE, assistant_text[:4000])
        else:
            _safe_set(llm_span, "llm.model_name", model_id)
            llm_span.set_attribute("llm.token_count.prompt", prompt_tokens)
            llm_span.set_attribute("llm.token_count.completion", completion_tokens)
            llm_span.set_attribute("llm.token_count.total", total_tokens)
            _safe_set(llm_span, "input.value", user_text[:4000])
            _safe_set(llm_span, "output.value", assistant_text[:4000])

        # LLM input messages (OpenInference flattened format)
        llm_span.set_attribute("llm.input_messages.0.message.role", "user")
        llm_span.set_attribute("llm.input_messages.0.message.content", user_text[:4000])

        # LLM output messages
        llm_span.set_attribute("llm.output_messages.0.message.role", "assistant")
        llm_span.set_attribute("llm.output_messages.0.message.content", assistant_text[:4000])

        # Token breakdown (custom metadata)
        for label, key in [
            ("System Instructions", "token_pct_system"),
            ("Tool Definitions", "token_pct_tools"),
            ("Messages", "token_pct_messages"),
            ("Files", "token_pct_files"),
            ("Tool Results", "token_pct_tool_results"),
        ]:
            for detail in usage.get("promptTokenDetails", []):
                if detail.get("label") == label:
                    pct = detail.get("percentageOfPrompt")
                    if pct is not None:
                        llm_span.set_attribute(f"metadata.{key}", pct)

        llm_span.set_status(Status(StatusCode.OK))

        # ── TOOL SPANS (children of LLM) ──────────────────────────────
        llm_ctx = trace.set_span_in_context(llm_span)
        tool_count = _build_tool_spans(
            tracer, llm_ctx, result_meta, responses,
            turn_start_ns=llm_start_ns,
            turn_latency_ms=latency_ms,
        )

        # Finalise LLM span
        llm_span.end(end_time=llm_end_ns)

        # Finalise AGENT span
        agent_span.set_status(Status(StatusCode.OK))
        agent_span.end(end_time=turn_end_ns)

        logger.info(
            f"Turn {turn_index}: "
            f"model={model_id} "
            f"tokens={total_tokens} "
            f"tools={tool_count} "
            f"latency={latency_ms}ms"
        )
        return True

    except Exception as e:
        logger.error(f"Turn {turn_index}: failed to create trace: {e}", exc_info=True)
        return False


# ============================================================================
# MAIN PIPELINE
# ============================================================================


def upload_chat_json(
    file_path: str | Path,
    project_name: str = PROJECT_NAME,
    endpoint: str = PHOENIX_ENDPOINT,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """Parse chat.json and upload all turns as traces to Phoenix.

    Args:
        file_path: Path to VS Code Copilot Chat export
        project_name: Phoenix project name
        endpoint: Phoenix OTLP endpoint
        dry_run: If True, parse only, don't upload

    Returns:
        Summary dict with counts and errors
    """
    file_path = Path(file_path)
    logger.info(f"Loading {file_path} ({file_path.stat().st_size / 1024:.1f} KB)")

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    responder = data.get("responderUsername", "unknown")
    requests_list = data.get("requests", [])
    session_id = ""  # Will use first request's sessionId

    logger.info(f"Found {len(requests_list)} turns, responder={responder}")

    if dry_run:
        for idx, req in enumerate(requests_list):
            msg = req.get("message", {}).get("text", "")[:80]
            model = req.get("modelId", "?")
            usage = req.get("result", {}).get("usage", {})
            tok = usage.get("promptTokens", 0) or 0
            logger.info(f"  Turn {idx}: [{model}] {msg}... ({tok} prompt tokens)")
        return {"status": "dry_run", "turns": len(requests_list)}

    # Initialise tracer
    tracer, provider = init_tracer(project_name=project_name, endpoint=endpoint)

    uploaded = 0
    skipped = 0
    errors = []

    for idx, req in enumerate(requests_list):
        # Grab session ID from first successful request
        if not session_id:
            session_id = req.get("result", {}).get("metadata", {}).get("sessionId", "")

        ok = upload_turn_as_trace(
            tracer, req, turn_index=idx,
            responder=responder, session_id=session_id,
        )
        if ok:
            uploaded += 1
        else:
            skipped += 1

    # Flush all pending spans
    logger.info("Flushing spans to Phoenix...")
    provider.force_flush(timeout_millis=30_000)
    provider.shutdown()

    summary = {
        "status": "success",
        "file": str(file_path),
        "project": project_name,
        "total_turns": len(requests_list),
        "uploaded": uploaded,
        "skipped": skipped,
        "session_id": session_id,
    }

    logger.info(
        f"Done: {uploaded} traces uploaded, {skipped} skipped "
        f"→ project={project_name}"
    )
    return summary


# ============================================================================
# CLI
# ============================================================================


def main():
    parser = argparse.ArgumentParser(
        description="Upload VS Code Copilot Chat JSON as traces to Phoenix",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Upload chat.json to Phoenix
  python -m agent.observability.upload_chat_traces datasets/chat.json

  # Custom project name
  python -m agent.observability.upload_chat_traces datasets/chat.json \\
      --project my-copilot-analysis

  # Dry run (parse only)
  python -m agent.observability.upload_chat_traces datasets/chat.json --dry-run
        """,
    )
    parser.add_argument(
        "input_file",
        type=str,
        help="Path to VS Code Copilot Chat JSON file",
    )
    parser.add_argument(
        "--project", "-p",
        type=str,
        default=PROJECT_NAME,
        help=f"Phoenix project name (default: {PROJECT_NAME})",
    )
    parser.add_argument(
        "--endpoint", "-e",
        type=str,
        default=PHOENIX_ENDPOINT,
        help=f"Phoenix OTLP endpoint (default: {PHOENIX_ENDPOINT})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and print summary without uploading",
    )

    args = parser.parse_args()

    result = upload_chat_json(
        file_path=args.input_file,
        project_name=args.project,
        endpoint=args.endpoint,
        dry_run=args.dry_run,
    )

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
