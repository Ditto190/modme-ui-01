"""Automated batch processing pipeline for VS Code Copilot chat.json exports.

This module provides end-to-end processing: parse -> categorize -> annotate -> upload to Phoenix.

Features:
    - Parse chat.json using copilot_chat_parser (40-column schema)
    - Auto-categorize across 5 dimensions (task type, complexity, outcome, MCP usage, response type)
    - Auto-annotate with 4 quality scores (latency, tool efficiency, token budget, response completeness)
    - Upload to Phoenix as dataset with proper input/output/metadata keys
    - Support for batch processing multiple chat.json files

Usage:
    # Parse and upload single file
    python -m agent.observability.process_chat_json datasets/chat.json copilot-session-01

    # Parse multiple files
    python -m agent.observability.process_chat_json datasets/chat*.json copilot-batch

    # Parse only (no upload)
    python -m agent.observability.process_chat_json datasets/chat.json --no-upload --output processed.csv

    # With categorization and annotation
    python -m agent.observability.process_chat_json datasets/chat.json copilot-annotated --categorize --annotate

Environment:
    PHOENIX_API_KEY: Phoenix API key (if cloud deployment)
    PHOENIX_ENDPOINT: Phoenix endpoint URL (default: http://localhost:6006)
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd

# Import the existing parser
from agent.observability.copilot_chat_parser import (
    parse_chat_json,
    upload_to_phoenix,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# AUTO-CATEGORIZATION LOGIC (5 Dimensions)
# ============================================================================

def categorize_task_type(row: pd.Series) -> str:
    """Categorize interaction by task type based on tools used.

    Args:
        row: DataFrame row with tools_invoked, language, files_edited

    Returns:
        Category: code_editing, data_analysis, Q&A, debugging, refactoring, documentation
    """
    tools = row.get('tools_invoked', [])
    if not tools:
        return "Q&A"

    # Convert to lowercase for matching
    tools_lower = [t.lower() if isinstance(t, str) else '' for t in tools]

    # Code editing indicators
    if any('edit' in t or 'write' in t or 'create' in t for t in tools_lower):
        return "code_editing"

    # Data analysis indicators
    if any('analyze' in t or 'data' in t or 'stat' in t for t in tools_lower):
        return "data_analysis"

    # Debugging indicators
    if any('debug' in t or 'error' in t or 'test' in t for t in tools_lower):
        return "debugging"

    # Documentation indicators
    if any('doc' in t or 'comment' in t or 'readme' in t for t in tools_lower):
        return "documentation"

    # Refactoring indicators
    if any('refactor' in t or 'rename' in t or 'move' in t for t in tools_lower):
        return "refactoring"

    # Default to Q&A if tools don't match patterns
    return "Q&A"


def categorize_complexity(row: pd.Series) -> str:
    """Categorize interaction by complexity.

    Args:
        row: DataFrame row with tool_call_rounds_count, tools_invoked, response word count

    Returns:
        Category: simple, moderate, complex
    """
    rounds = row.get('tool_call_rounds_count', 0)
    tools_count = len(row.get('tools_invoked', []))
    response_length = len(str(row.get('assistant_response', '')).split())

    # Complex: 3+ rounds, or 5+ tools, or 500+ word response
    if rounds >= 3 or tools_count >= 5 or response_length >= 500:
        return "complex"

    # Simple: 1 round or no tools, short response
    if rounds <= 1 and tools_count <= 1 and response_length < 100:
        return "simple"

    # Moderate: everything else
    return "moderate"


def categorize_outcome(row: pd.Series) -> str:
    """Categorize interaction by outcome.

    Args:
        row: DataFrame row with max_tool_calls_exceeded, latency_ms, response

    Returns:
        Category: success, partial_success, failure, timeout
    """
    # Check for explicit failure indicators
    if row.get('max_tool_calls_exceeded', False):
        return "failure"

    # Check latency for timeout (>30s)
    latency = row.get('latency_ms', 0)
    if latency > 30000:
        return "timeout"

    # Check response for error patterns
    response = str(row.get('assistant_response', '')).lower()
    if any(err in response for err in ['error', 'failed', 'unable to', 'cannot']):
        return "partial_success"

    # Default to success
    return "success"


def categorize_mcp_usage(row: pd.Series) -> str:
    """Categorize interaction by MCP server usage.

    Args:
        row: DataFrame row with mcp_servers_started, mcp_tools_available

    Returns:
        Category: mcp_heavy (3+ servers), mcp_light (1-2 servers), no_mcp
    """
    servers = row.get('mcp_servers_started', [])
    if not servers:
        return "no_mcp"

    server_count = len(servers) if isinstance(servers, list) else 0

    if server_count >= 3:
        return "mcp_heavy"
    elif server_count >= 1:
        return "mcp_light"

    return "no_mcp"


def categorize_response_type(row: pd.Series) -> str:
    """Categorize interaction by dominant response type.

    Args:
        row: DataFrame row with response_kind_counts (JSON)

    Returns:
        Category: code_dominant, text_dominant, mixed, tool_only
    """
    kind_counts_str = row.get('response_kind_counts', '{}')

    try:
        kind_counts = json.loads(kind_counts_str) if isinstance(kind_counts_str, str) else kind_counts_str
    except (json.JSONDecodeError, TypeError):
        kind_counts = {}

    if not kind_counts:
        return "text_dominant"

    # Count code-related responses
    code_kinds = kind_counts.get('codeblockUri', 0) + kind_counts.get('textEditGroup', 0)
    text_kinds = kind_counts.get('text', 0)
    tool_kinds = kind_counts.get('toolInvocationSerialized', 0)

    total = sum(kind_counts.values())

    if total == 0:
        return "text_dominant"

    # Code dominant: >50% code responses
    if code_kinds / total > 0.5:
        return "code_dominant"

    # Tool only: 100% tool invocations
    if tool_kinds == total:
        return "tool_only"

    # Mixed: neither code nor text dominant
    if code_kinds > 0 and text_kinds > 0:
        return "mixed"

    # Default to text
    return "text_dominant"


def add_categorization(df: pd.DataFrame) -> pd.DataFrame:
    """Add all 5 categorization dimensions to DataFrame.

    Args:
        df: Parsed DataFrame from copilot_chat_parser

    Returns:
        DataFrame with 5 new category columns
    """
    logger.info("Adding auto-categorization (5 dimensions)...")

    df['category_task'] = df.apply(categorize_task_type, axis=1)
    df['category_complexity'] = df.apply(categorize_complexity, axis=1)
    df['category_outcome'] = df.apply(categorize_outcome, axis=1)
    df['category_mcp_usage'] = df.apply(categorize_mcp_usage, axis=1)
    df['category_response_type'] = df.apply(categorize_response_type, axis=1)

    logger.info(f"Categorization complete: {len(df)} rows")
    return df


# ============================================================================
# AUTO-ANNOTATION LOGIC (4 Quality Scores)
# ============================================================================

def annotate_latency_score(row: pd.Series) -> Dict[str, Any]:
    """Score latency quality.

    Args:
        row: DataFrame row with latency_ms

    Returns:
        Annotation dict with name, score, label, explanation
    """
    latency = row.get('latency_ms', 0)

    # Score: 0-1, higher is better
    if latency < 2000:  # <2s
        score = 1.0
        label = "excellent"
        explanation = "Response time under 2 seconds"
    elif latency < 5000:  # 2-5s
        score = 0.8
        label = "good"
        explanation = "Response time 2-5 seconds"
    elif latency < 10000:  # 5-10s
        score = 0.6
        label = "acceptable"
        explanation = "Response time 5-10 seconds"
    elif latency < 20000:  # 10-20s
        score = 0.4
        label = "slow"
        explanation = "Response time 10-20 seconds"
    else:  # >20s
        score = 0.2
        label = "very_slow"
        explanation = f"Response time {latency/1000:.1f} seconds"

    return {
        "name": "latency_score",
        "score": score,
        "label": label,
        "explanation": explanation,
        "annotator_kind": "CODE"
    }


def annotate_tool_efficiency(row: pd.Series) -> Dict[str, Any]:
    """Score tool execution efficiency.

    Args:
        row: DataFrame row with tool_call_rounds_count, tools_invoked, outcome

    Returns:
        Annotation dict with name, score, label, explanation
    """
    rounds = row.get('tool_call_rounds_count', 0)
    _tools_count = len(row.get('tools_invoked', []))  # Reserved for future scoring logic
    outcome = row.get('category_outcome', 'success')

    if rounds == 0:
        # No tools used
        score = 1.0
        label = "no_tools"
        explanation = "No tool calls needed"
    elif rounds == 1 and outcome == 'success':
        # One-shot success
        score = 1.0
        label = "excellent"
        explanation = "Single round tool execution with success"
    elif rounds <= 2 and outcome == 'success':
        # 2 rounds, successful
        score = 0.8
        label = "good"
        explanation = f"{rounds} rounds to completion"
    elif rounds <= 3:
        # 3 rounds or failed
        score = 0.6
        label = "acceptable"
        explanation = f"{rounds} rounds, multiple attempts"
    else:
        # 4+ rounds
        score = 0.4
        label = "inefficient"
        explanation = f"{rounds} rounds, many retries"

    return {
        "name": "tool_efficiency",
        "score": score,
        "label": label,
        "explanation": explanation,
        "annotator_kind": "CODE"
    }


def annotate_token_budget_health(row: pd.Series) -> Dict[str, Any]:
    """Score token budget usage.

    Args:
        row: DataFrame row with token_pct_messages

    Returns:
        Annotation dict with name, score, label, explanation
    """
    user_pct = row.get('token_pct_messages', 0)

    # Score: higher user content percentage is better
    if user_pct >= 15:
        score = 1.0
        label = "healthy"
        explanation = f"User content {user_pct}% of prompt (good balance)"
    elif user_pct >= 10:
        score = 0.8
        label = "acceptable"
        explanation = f"User content {user_pct}% of prompt"
    elif user_pct >= 5:
        score = 0.6
        label = "tight"
        explanation = f"User content {user_pct}% of prompt (high overhead)"
    else:
        score = 0.4
        label = "critical"
        explanation = f"User content only {user_pct}% of prompt (94%+ overhead)"

    return {
        "name": "token_budget_health",
        "score": score,
        "label": label,
        "explanation": explanation,
        "annotator_kind": "CODE"
    }


def annotate_response_completeness(row: pd.Series) -> Dict[str, Any]:
    """Score response completeness.

    Args:
        row: DataFrame row with assistant_response, thinking, files_edited

    Returns:
        Annotation dict with name, score, label, explanation
    """
    response = str(row.get('assistant_response', ''))
    thinking = str(row.get('thinking', ''))
    files_edited = row.get('files_edited', [])

    word_count = len(response.split())
    has_thinking = len(thinking.strip()) > 0
    has_edits = len(files_edited) > 0 if isinstance(files_edited, list) else False

    # Score based on completeness indicators
    if word_count > 100 and (has_thinking or has_edits):
        score = 1.0
        label = "complete"
        explanation = "Detailed response with reasoning or edits"
    elif word_count > 50:
        score = 0.8
        label = "good"
        explanation = f"{word_count} word response"
    elif word_count > 20:
        score = 0.6
        label = "brief"
        explanation = f"{word_count} word response (brief)"
    else:
        score = 0.4
        label = "minimal"
        explanation = f"{word_count} word response (too short)"

    return {
        "name": "response_completeness",
        "score": score,
        "label": label,
        "explanation": explanation,
        "annotator_kind": "CODE"
    }


def add_annotations(df: pd.DataFrame) -> pd.DataFrame:
    """Add all 4 quality score annotations to DataFrame.

    Args:
        df: Categorized DataFrame

    Returns:
        DataFrame with 4 new annotation JSON columns
    """
    logger.info("Adding auto-annotations (4 quality scores)...")

    df['annotation_latency'] = df.apply(lambda row: json.dumps(annotate_latency_score(row)), axis=1)
    df['annotation_tool_efficiency'] = df.apply(lambda row: json.dumps(annotate_tool_efficiency(row)), axis=1)
    df['annotation_token_budget'] = df.apply(lambda row: json.dumps(annotate_token_budget_health(row)), axis=1)
    df['annotation_response_completeness'] = df.apply(lambda row: json.dumps(annotate_response_completeness(row)), axis=1)

    logger.info(f"Annotation complete: {len(df)} rows")
    return df


# ============================================================================
# MAIN PIPELINE
# ============================================================================

def process_and_upload(
    chat_json_path: str,
    dataset_name: str,
    categorize: bool = True,
    annotate: bool = True,
    upload: bool = True,
    output_path: Optional[str] = None
) -> pd.DataFrame:
    """Complete pipeline: parse → categorize → annotate → upload.

    Args:
        chat_json_path: Path to chat.json file
        dataset_name: Phoenix dataset name
        categorize: Whether to add categorization columns
        annotate: Whether to add annotation columns
        upload: Whether to upload to Phoenix
        output_path: Optional CSV output path

    Returns:
        Processed DataFrame
    """
    logger.info(f"Processing {chat_json_path}...")

    # Step 1: Parse
    df = parse_chat_json(chat_json_path)
    logger.info(f"Parsed {len(df)} interactions")

    # Step 2: Categorize
    if categorize:
        df = add_categorization(df)

    # Step 3: Annotate
    if annotate:
        df = add_annotations(df)

    # Step 4: Save to CSV (optional)
    if output_path:
        df.to_csv(output_path, index=False)
        logger.info(f"Saved to {output_path}")

    # Step 5: Upload to Phoenix
    if upload:
        logger.info(f"Uploading to Phoenix dataset: {dataset_name}")
        upload_to_phoenix(df, dataset_name=dataset_name)
        logger.info("Upload complete")

    return df


# ============================================================================
# CLI
# ============================================================================

def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Process VS Code Copilot chat.json exports for Phoenix",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Parse and upload with categorization + annotation
    python -m agent.observability.process_chat_json datasets/chat.json my-dataset

    # Parse only (no upload)
    python -m agent.observability.process_chat_json datasets/chat.json --no-upload --output processed.csv

    # Skip categorization and annotation
    python -m agent.observability.process_chat_json datasets/chat.json my-dataset --no-categorize --no-annotate
        """
    )

    parser.add_argument(
        'chat_json_path',
        type=str,
        help='Path to chat.json file'
    )

    parser.add_argument(
        'dataset_name',
        type=str,
        nargs='?',
        default='copilot-chat',
        help='Phoenix dataset name (default: copilot-chat)'
    )

    parser.add_argument(
        '--no-categorize',
        action='store_true',
        help='Skip auto-categorization'
    )

    parser.add_argument(
        '--no-annotate',
        action='store_true',
        help='Skip auto-annotation'
    )

    parser.add_argument(
        '--no-upload',
        action='store_true',
        help='Skip Phoenix upload'
    )

    parser.add_argument(
        '--output',
        type=str,
        help='Output CSV path'
    )

    parser.add_argument(
        '--log-level',
        type=str,
        default='INFO',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        help='Logging level'
    )

    args = parser.parse_args()

    # Configure logging
    logging.getLogger().setLevel(getattr(logging, args.log_level))

    # Validate input file
    if not Path(args.chat_json_path).exists():
        logger.error(f"File not found: {args.chat_json_path}")
        sys.exit(1)

    try:
        # Run pipeline
        df = process_and_upload(
            chat_json_path=args.chat_json_path,
            dataset_name=args.dataset_name,
            categorize=not args.no_categorize,
            annotate=not args.no_annotate,
            upload=not args.no_upload,
            output_path=args.output
        )

        logger.info(f"✓ Processing complete: {len(df)} interactions")

        # Print summary
        if not args.no_categorize:
            logger.info("\nCategory distribution:")
            for col in ['category_task', 'category_complexity', 'category_outcome']:
                if col in df.columns:
                    logger.info(f"  {col}:")
                    for k, v in df[col].value_counts().items():
                        logger.info(f"    {k}: {v}")

    except Exception as e:
        logger.error(f"Processing failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
