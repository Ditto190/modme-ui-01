"""
Copilot Chat JSON → Phoenix Dataset Parser

Parses VS Code GitHub Copilot Chat export files (chat.json) into flat
Phoenix-compatible DataFrames for dataset creation, experiments, and evals.

Handles the deeply nested, polymorphic VS Code chat format including:
- 9 response kinds (thinking, toolInvocation, textEdit, codeblock, etc.)
- 6 variable kinds (workspace, promptFile, promptText, file, tool, toolset)
- Nested tool call rounds with rich text node trees
- MCP server events and tool invocation tracking

Output columns map directly to Phoenix's create_dataset() API:
    input_keys  = ["user_message"]
    output_keys = ["assistant_response", "thinking"]
    metadata_keys = everything else (model, tokens, tools, latency, etc.)

Usage:
    # As a library
    from agent.observability.copilot_chat_parser import parse_chat_json
    df = parse_chat_json("datasets/chat.json")

    # Upload to Phoenix
    from phoenix.client import Client
    client = Client()
    client.datasets.create_dataset(
        dataframe=df,
        name="copilot-chat-session",
        input_keys=["user_message"],
        output_keys=["assistant_response"],
        metadata_keys=[...],  # see METADATA_COLUMNS
    )

    # CLI
    python -m agent.observability.copilot_chat_parser datasets/chat.json
    python -m agent.observability.copilot_chat_parser datasets/chat.json --upload --dataset-name my-session
"""

from __future__ import annotations

import argparse
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ============================================================================
# COLUMN DEFINITIONS — what the final DataFrame contains
# ============================================================================

INPUT_COLUMNS = ["user_message"]

OUTPUT_COLUMNS = ["assistant_response", "thinking"]

METADATA_COLUMNS = [
    # Identity
    "request_id",
    "response_id",
    "session_id",
    "model_id",
    "agent_id",
    "agent_name",
    "responder",
    "timestamp",
    # Tokens & performance
    "prompt_tokens",
    "completion_tokens",
    "latency_first_progress_ms",
    "latency_total_ms",
    "time_spent_waiting_ms",
    # Token breakdown
    "token_pct_system_instructions",
    "token_pct_tool_definitions",
    "token_pct_messages",
    "token_pct_files",
    "token_pct_tool_results",
    # Context: variables attached
    "workspace_repos",
    "prompt_files",
    "attached_files",
    # Tools & MCP
    "tools_available",
    "tools_invoked",
    "tool_call_rounds_count",
    "tool_calls_detail",
    "mcp_servers_started",
    "mcp_tools_available",
    # Response composition
    "response_kind_counts",
    "code_blocks_count",
    "code_languages",
    "files_edited",
    "inline_references",
    # Conversation flow
    "turn_index",
    "had_confirmation_prompt",
    "max_tool_calls_exceeded",
    "request_message_length",
    "response_text_length",
]


# ============================================================================
# EXTRACTION HELPERS — pull data from the nested chat.json structures
# ============================================================================


def _extract_text_from_rich_node(node: Any) -> str:
    """Recursively extract plain text from VS Code rich text node trees.

    Tool call results contain VS Code's MarkdownString serialization format:
    nodes with {type, ctorName, children[], text, props, references}.
    This walks the tree to collect all .text leaves.
    """
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


def _extract_tool_result_text(result_value: Any) -> str:
    """Extract readable text from a tool call result value.

    Results can be:
    - str: plain text (e.g. file contents)
    - dict with .node: rich text tree from VS Code
    """
    if isinstance(result_value, str):
        return result_value[:500]  # cap for metadata sanity
    if isinstance(result_value, dict) and "node" in result_value:
        text = _extract_text_from_rich_node(result_value["node"])
        return text[:500] if text else ""
    return ""


def _extract_response_text(responses: List[Dict]) -> str:
    """Concatenate all text-bearing response parts into the assistant response.

    Walks the polymorphic response[] array and pulls text from:
    - thinking.value (chain-of-thought)
    - toolInvocationSerialized.invocationMessage / pastTenseMessage
    - progressTaskSerialized.content.value
    - unknown (bare markdown value)
    """
    text_parts: list[str] = []

    for resp in responses:
        kind = resp.get("kind", "")

        if kind == "thinking":
            # Thinking text is part of the output separately, skip here
            continue

        elif kind == "toolInvocationSerialized":
            # These show up as "Running readFile..." in the UI
            msg = resp.get("pastTenseMessage") or resp.get("invocationMessage") or ""
            if msg:
                text_parts.append(f"[Tool] {msg}")

        elif kind == "progressTaskSerialized":
            content = resp.get("content", {})
            if isinstance(content, dict) and "value" in content:
                text_parts.append(content["value"])

        elif kind == "inlineReference":
            name = resp.get("name", "")
            if name:
                text_parts.append(f"[Ref: {name}]")

        elif kind == "textEditGroup":
            uri = resp.get("uri", {})
            path = uri.get("fsPath") or uri.get("path", "")
            if path:
                text_parts.append(f"[Edited: {Path(path).name}]")

        elif kind == "codeblockUri":
            uri = resp.get("uri", {})
            path = uri.get("fsPath") or uri.get("path", "")
            edit_marker = " (edit)" if resp.get("isEdit") else ""
            if path:
                text_parts.append(f"[Code: {Path(path).name}{edit_marker}]")

        elif kind in ("mcpServersStarting", "undoStop", "confirmation"):
            # Structural events, not content
            continue

        else:
            # Bare markdown or unknown kind with .value
            val = resp.get("value", "")
            if isinstance(val, str) and val.strip():
                text_parts.append(val)

    return "\n".join(text_parts)


def _extract_thinking(responses: List[Dict]) -> str:
    """Pull all thinking/chain-of-thought blocks from responses."""
    parts = []
    for resp in responses:
        if resp.get("kind") == "thinking" and resp.get("value"):
            parts.append(resp["value"])
    return "\n---\n".join(parts) if parts else ""


def _extract_summary_text(metadata: Dict) -> str:
    """Get the final summary text from result.metadata.summary."""
    summary = metadata.get("summary", {})
    return summary.get("text", "") if isinstance(summary, dict) else ""


def _extract_workspace_repos(variables: List[Dict]) -> str:
    """Comma-separated list of workspace repo names."""
    repos = []
    for var in variables:
        if var.get("kind") == "workspace":
            repos.append(var.get("name", ""))
    return ", ".join(r for r in repos if r)


def _extract_prompt_files(variables: List[Dict]) -> str:
    """Comma-separated list of instruction/prompt file names."""
    files = []
    for var in variables:
        if var.get("kind") == "promptFile":
            files.append(var.get("name", ""))
    return ", ".join(f for f in files if f)


def _extract_attached_files(variables: List[Dict]) -> str:
    """Comma-separated list of explicitly attached file names."""
    files = []
    for var in variables:
        if var.get("kind") == "file":
            files.append(var.get("name", ""))
    return ", ".join(f for f in files if f)


def _extract_tools_available(variables: List[Dict]) -> str:
    """Comma-separated list of tools available in the request context."""
    tools = []
    for var in variables:
        if var.get("kind") == "tool":
            tools.append(var.get("name") or var.get("id", ""))
    return ", ".join(t for t in tools if t)


def _extract_mcp_tools_available(variables: List[Dict]) -> str:
    """Extract MCP toolset tools from variables.

    Toolset variables contain a .value list of tool objects.
    """
    mcp_tools: list[str] = []
    for var in variables:
        if var.get("kind") == "toolset":
            toolset_name = var.get("name", "unknown")
            tool_list = var.get("value", [])
            if isinstance(tool_list, list):
                for tool in tool_list:
                    if isinstance(tool, dict):
                        tool_name = tool.get("name") or tool.get("id", "")
                        if tool_name:
                            mcp_tools.append(f"{toolset_name}/{tool_name}")
                    elif isinstance(tool, str):
                        mcp_tools.append(f"{toolset_name}/{tool}")
    return ", ".join(mcp_tools)


def _extract_tools_invoked(responses: List[Dict]) -> str:
    """List of tools actually invoked during this turn."""
    tools = []
    for resp in responses:
        if resp.get("kind") == "toolInvocationSerialized":
            tool_id = resp.get("toolId", "")
            source_label = resp.get("source", {}).get("label", "")
            if tool_id:
                entry = tool_id
                if source_label and source_label != "Built-In":
                    entry = f"{tool_id} ({source_label})"
                tools.append(entry)
    # Deduplicate while preserving order
    seen = set()
    unique = []
    for t in tools:
        if t not in seen:
            seen.add(t)
            unique.append(t)
    return ", ".join(unique)


def _extract_tool_calls_detail(metadata: Dict) -> str:
    """JSON string of tool call rounds: [{round, name, arguments_preview}]."""
    rounds = metadata.get("toolCallRounds", [])
    if not rounds:
        return "[]"

    details = []
    for round_idx, round_data in enumerate(rounds):
        for tc in round_data.get("toolCalls", []):
            args_str = tc.get("arguments", "")
            # Truncate arguments for metadata sanity
            args_preview = args_str[:200] if isinstance(args_str, str) else str(args_str)[:200]
            details.append({
                "round": round_idx,
                "name": tc.get("name", ""),
                "arguments_preview": args_preview,
            })
    return json.dumps(details, ensure_ascii=False)


def _extract_mcp_servers_started(responses: List[Dict]) -> str:
    """Comma-separated list of MCP server IDs that started."""
    servers = []
    for resp in responses:
        if resp.get("kind") == "mcpServersStarting":
            for sid in resp.get("didStartServerIds", []):
                if sid and sid not in servers:
                    servers.append(sid)
    return ", ".join(servers)


def _extract_response_kind_counts(responses: List[Dict]) -> str:
    """JSON dict of {kind: count} for response composition analysis."""
    counts: dict[str, int] = {}
    for resp in responses:
        kind = resp.get("kind", "unknown")
        counts[kind] = counts.get(kind, 0) + 1
    return json.dumps(counts, ensure_ascii=False)


def _extract_code_blocks(metadata: Dict) -> tuple[int, str]:
    """Count code blocks and collect their languages."""
    blocks = metadata.get("codeBlocks", [])
    languages = set()
    for block in blocks:
        lang = block.get("language", "")
        if lang:
            languages.add(lang)
    return len(blocks), ", ".join(sorted(languages))


def _extract_files_edited(responses: List[Dict]) -> str:
    """List of files edited during this turn."""
    files = set()
    for resp in responses:
        if resp.get("kind") == "textEditGroup":
            uri = resp.get("uri", {})
            path = uri.get("fsPath") or uri.get("path", "")
            if path:
                files.add(Path(path).name)
        elif resp.get("kind") == "codeblockUri" and resp.get("isEdit"):
            uri = resp.get("uri", {})
            path = uri.get("fsPath") or uri.get("path", "")
            if path:
                files.add(Path(path).name)
    return ", ".join(sorted(files))


def _extract_inline_references(responses: List[Dict]) -> str:
    """List of inline file references in the response."""
    refs = []
    for resp in responses:
        if resp.get("kind") == "inlineReference":
            name = resp.get("name", "")
            if name:
                refs.append(name)
    return ", ".join(refs)


def _extract_token_pct(usage: Dict, label: str) -> Optional[int]:
    """Extract a specific token percentage from promptTokenDetails."""
    for detail in usage.get("promptTokenDetails", []):
        if detail.get("label") == label:
            return detail.get("percentageOfPrompt")
    return None


# ============================================================================
# MAIN PARSER
# ============================================================================


def parse_request(
    request: Dict[str, Any],
    turn_index: int,
    responder: str,
) -> Dict[str, Any]:
    """Flatten a single request/response turn into a Phoenix-compatible row.

    Args:
        request: One element from chat.json.requests[]
        turn_index: 0-based turn number in the conversation
        responder: Top-level responderUsername

    Returns:
        Flat dictionary with keys from INPUT/OUTPUT/METADATA_COLUMNS
    """
    message = request.get("message", {})
    responses = request.get("response", [])
    variables = request.get("variableData", {}).get("variables", [])
    result = request.get("result", {})
    result_meta = result.get("metadata", {})
    usage = result.get("usage", {})
    timings = result.get("timings", {})
    agent = request.get("agent", {})

    # --- Input ---
    user_text = message.get("text", "")

    # --- Output ---
    # Prefer the summary text (final consolidated response) when available,
    # fall back to reconstructing from response parts
    summary_text = _extract_summary_text(result_meta)
    assistant_text = summary_text if summary_text else _extract_response_text(responses)
    thinking_text = _extract_thinking(responses)

    # --- Code blocks ---
    code_block_count, code_languages = _extract_code_blocks(result_meta)

    # --- Build the row ---
    row: Dict[str, Any] = {
        # Input
        "user_message": user_text,
        # Output
        "assistant_response": assistant_text,
        "thinking": thinking_text,
        # Identity
        "request_id": request.get("requestId", ""),
        "response_id": request.get("responseId", ""),
        "session_id": result_meta.get("sessionId", ""),
        "model_id": request.get("modelId", ""),
        "agent_id": result_meta.get("agentId") or agent.get("id", ""),
        "agent_name": agent.get("fullName") or agent.get("name", ""),
        "responder": responder,
        "timestamp": _format_timestamp(request.get("timestamp")),
        # Tokens & performance
        "prompt_tokens": usage.get("promptTokens") or result_meta.get("promptTokens"),
        "completion_tokens": usage.get("completionTokens") or result_meta.get("outputTokens"),
        "latency_first_progress_ms": timings.get("firstProgress"),
        "latency_total_ms": timings.get("totalElapsed"),
        "time_spent_waiting_ms": request.get("timeSpentWaiting"),
        # Token breakdown
        "token_pct_system_instructions": _extract_token_pct(usage, "System Instructions"),
        "token_pct_tool_definitions": _extract_token_pct(usage, "Tool Definitions"),
        "token_pct_messages": _extract_token_pct(usage, "Messages"),
        "token_pct_files": _extract_token_pct(usage, "Files"),
        "token_pct_tool_results": _extract_token_pct(usage, "Tool Results"),
        # Context
        "workspace_repos": _extract_workspace_repos(variables),
        "prompt_files": _extract_prompt_files(variables),
        "attached_files": _extract_attached_files(variables),
        # Tools & MCP
        "tools_available": _extract_tools_available(variables),
        "tools_invoked": _extract_tools_invoked(responses),
        "tool_call_rounds_count": len(result_meta.get("toolCallRounds", [])),
        "tool_calls_detail": _extract_tool_calls_detail(result_meta),
        "mcp_servers_started": _extract_mcp_servers_started(responses),
        "mcp_tools_available": _extract_mcp_tools_available(variables),
        # Response composition
        "response_kind_counts": _extract_response_kind_counts(responses),
        "code_blocks_count": code_block_count,
        "code_languages": code_languages,
        "files_edited": _extract_files_edited(responses),
        "inline_references": _extract_inline_references(responses),
        # Conversation flow
        "turn_index": turn_index,
        "had_confirmation_prompt": any(
            r.get("kind") == "confirmation" for r in responses
        ),
        "max_tool_calls_exceeded": result_meta.get("maxToolCallsExceeded", False),
        "request_message_length": len(user_text),
        "response_text_length": len(assistant_text),
    }

    return row


def _format_timestamp(ts: Any) -> Optional[str]:
    """Convert Unix timestamp (ms or s) to ISO format string."""
    if ts is None:
        return None
    try:
        ts_int = int(ts)
        # Heuristic: if > 10^12, it's milliseconds
        if ts_int > 1e12:
            ts_int = ts_int // 1000
        return datetime.fromtimestamp(ts_int, tz=timezone.utc).isoformat()
    except (ValueError, OSError):
        return str(ts)


def parse_chat_json(
    file_path: str | Path,
    include_empty_turns: bool = False,
) -> "pd.DataFrame":
    """Parse a VS Code Copilot Chat JSON export into a Phoenix DataFrame.

    Args:
        file_path: Path to the chat.json file
        include_empty_turns: If True, include turns with empty user messages

    Returns:
        pandas DataFrame ready for Phoenix create_dataset()
    """
    import pandas as pd

    file_path = Path(file_path)
    logger.info(f"Parsing {file_path} ({file_path.stat().st_size / 1024:.1f} KB)")

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    responder = data.get("responderUsername", "unknown")
    requests = data.get("requests", [])

    logger.info(f"Found {len(requests)} request turns, responder={responder}")

    rows = []
    for idx, req in enumerate(requests):
        row = parse_request(req, turn_index=idx, responder=responder)

        if not include_empty_turns and not row["user_message"].strip():
            logger.debug(f"Skipping turn {idx}: empty user message")
            continue

        rows.append(row)

    df = pd.DataFrame(rows)

    # Ensure column ordering: inputs first, then outputs, then metadata
    all_cols = INPUT_COLUMNS + OUTPUT_COLUMNS + METADATA_COLUMNS
    # Add any columns present in df but not in our spec (future-proofing)
    extra_cols = [c for c in df.columns if c not in all_cols]
    ordered_cols = [c for c in all_cols if c in df.columns] + extra_cols
    df = df[ordered_cols]

    logger.info(f"Parsed {len(df)} turns into {len(df.columns)} columns")
    return df


def upload_to_phoenix(
    df: "pd.DataFrame",
    dataset_name: str = "copilot-chat",
    phoenix_endpoint: Optional[str] = None,
) -> Any:
    """Upload the parsed DataFrame to Phoenix as a dataset.

    Args:
        df: DataFrame from parse_chat_json()
        dataset_name: Name for the Phoenix dataset
        phoenix_endpoint: Phoenix server URL (default from env)

    Returns:
        Phoenix dataset object
    """
    from phoenix.client import Client

    endpoint = phoenix_endpoint or os.getenv("PHOENIX_ENDPOINT", "http://localhost:6006")

    # Phoenix Client uses environment variables PHOENIX_HOST and PHOENIX_PORT
    # or we can pass them directly
    if endpoint != "http://localhost:6006":
        logger.warning(f"Custom endpoint {endpoint} specified, but Phoenix Client may use default localhost:6006")

    client = Client()  # Phoenix Client uses PHOENIX_HOST/PHOENIX_PORT env vars
# ============================================================================
# CLI
# ============================================================================


def main():
    parser = argparse.ArgumentParser(
        description="Parse VS Code Copilot Chat JSON exports for Phoenix ingestion",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Parse and save as CSV
  python -m agent.observability.copilot_chat_parser datasets/chat.json

  # Parse and upload directly to Phoenix
  python -m agent.observability.copilot_chat_parser datasets/chat.json --upload

  # Custom output and dataset name
  python -m agent.observability.copilot_chat_parser datasets/chat.json \\
      --output datasets/parsed_chat.csv \\
      --upload --dataset-name "my-copilot-session"
        """,
    )
    parser.add_argument(
        "input_file",
        type=str,
        nargs="?",
        default=None,
        help="Path to VS Code Copilot Chat JSON file",
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        help="Output file path (.csv, .jsonl, or .parquet). Default: <input>_phoenix.csv",
    )
    parser.add_argument(
        "--format", "-f",
        choices=["csv", "jsonl", "parquet"],
        default="csv",
        help="Output format (default: csv)",
    )
    parser.add_argument(
        "--upload",
        action="store_true",
        help="Upload directly to Phoenix after parsing",
    )
    parser.add_argument(
        "--dataset-name",
        type=str,
        default="copilot-chat",
        help="Phoenix dataset name (default: copilot-chat)",
    )
    parser.add_argument(
        "--phoenix-endpoint",
        type=str,
        help="Phoenix server URL (default: $PHOENIX_ENDPOINT or http://localhost:6006)",
    )
    parser.add_argument(
        "--include-empty",
        action="store_true",
        help="Include turns with empty user messages",
    )
    parser.add_argument(
        "--print-schema",
        action="store_true",
        help="Print the column schema and exit",
    )

    args = parser.parse_args()

    # Schema-only mode
    if args.print_schema:
        print("\n=== Phoenix Dataset Schema ===\n")
        print("INPUT COLUMNS (input_keys):")
        for c in INPUT_COLUMNS:
            print(f"  - {c}")
        print("\nOUTPUT COLUMNS (output_keys):")
        for c in OUTPUT_COLUMNS:
            print(f"  - {c}")
        print("\nMETADATA COLUMNS (metadata_keys):")
        for c in METADATA_COLUMNS:
            print(f"  - {c}")
        return

    if not args.input_file:
        parser.error("input_file is required (unless using --print-schema)")

    # Parse
    df = parse_chat_json(args.input_file, include_empty_turns=args.include_empty)

    # Summary
    print(f"\nParsed {len(df)} turns from {args.input_file}")
    print(f"Columns: {len(df.columns)}")
    print("\nSample (first row):")
    if not df.empty:
        first = df.iloc[0]
        print(f"  user_message:     {str(first.get('user_message', ''))[:80]}...")
        print(f"  assistant_response: {str(first.get('assistant_response', ''))[:80]}...")
        print(f"  model_id:         {first.get('model_id', '')}")
        print(f"  prompt_tokens:    {first.get('prompt_tokens', '')}")
        print(f"  tools_invoked:    {first.get('tools_invoked', '')}")
        print(f"  mcp_tools_available: {str(first.get('mcp_tools_available', ''))[:80]}...")

    # Save to file
    input_path = Path(args.input_file)
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = input_path.parent / f"{input_path.stem}_phoenix.{args.format}"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    if args.format == "csv":
        df.to_csv(output_path, index=False)
    elif args.format == "jsonl":
        df.to_json(output_path, orient="records", lines=True, force_ascii=False)
    elif args.format == "parquet":
        df.to_parquet(output_path, engine="pyarrow", compression="snappy")

    print(f"\nSaved to: {output_path}")

    # Upload to Phoenix
    if args.upload:
        try:
            dataset = upload_to_phoenix(
                df,
                dataset_name=args.dataset_name,
                phoenix_endpoint=args.phoenix_endpoint,
            )
            print(f"Uploaded to Phoenix as dataset '{args.dataset_name}'")
        except ImportError:
            print("Error: phoenix.client not available. Install with: pip install arize-phoenix-client")
        except Exception as e:
            print(f"Error uploading to Phoenix: {e}")


if __name__ == "__main__":
    main()
