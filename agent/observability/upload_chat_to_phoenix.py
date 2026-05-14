"""
Upload Copilot chat data to Phoenix datasets for analysis and experimentation.

This script properly uploads the parsed chat_phoenix.csv data to Phoenix using
the correct datasets API (create_dataset, not upload_dataset).

Usage:
    python -m agent.observability.upload_chat_to_phoenix datasets/chat_phoenix.csv copilot-research
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path
from typing import Optional

import pandas as pd
from phoenix.client import Client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def upload_chat_dataset(
    csv_path: str | Path,
    dataset_name: str = "copilot-research",
    description: Optional[str] = None
) -> None:
    """
    Upload chat data from CSV to Phoenix dataset.

    Args:
        csv_path: Path to the chat_phoenix.csv file
        dataset_name: Name for the Phoenix dataset (default: copilot-research)
        description: Optional description for the dataset
    """
    csv_path = Path(csv_path)

    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    logger.info(f"Loading chat data from {csv_path}...")
    df = pd.read_csv(csv_path)

    logger.info(f"Loaded {len(df)} chat interactions with {len(df.columns)} columns")

    # Define which columns are inputs, outputs, and metadata
    input_keys = [
        "user_message",
        "request_id",
        "session_id",
        "model_id",
        "agent_id",
        "agent_name",
        "workspace_repos",
        "prompt_files",
        "attached_files",
        "tools_available",
        "turn_index",
        "request_message_length"
    ]

    output_keys = [
        "assistant_response",
        "thinking",
        "response_id",
        "tools_invoked",
        "tool_call_rounds_count",
        "tool_calls_detail",
        "response_kind_counts",
        "code_blocks_count",
        "code_languages",
        "files_edited",
        "inline_references",
        "response_text_length"
    ]

    metadata_keys = [
        "responder",
        "timestamp",
        "prompt_tokens",
        "completion_tokens",
        "latency_first_progress_ms",
        "latency_total_ms",
        "time_spent_waiting_ms",
        "token_pct_system_instructions",
        "token_pct_tool_definitions",
        "token_pct_messages",
        "token_pct_files",
        "token_pct_tool_results",
        "mcp_servers_started",
        "mcp_tools_available",
        "had_confirmation_prompt",
        "max_tool_calls_exceeded"
    ]

    # Verify all keys exist in the DataFrame
    missing_keys = []
    for key_list, key_type in [
        (input_keys, "input"),
        (output_keys, "output"),
        (metadata_keys, "metadata")
    ]:
        for key in key_list:
            if key not in df.columns:
                missing_keys.append(f"{key_type}:{key}")

    if missing_keys:
        logger.warning(f"Missing columns: {', '.join(missing_keys)}")
        logger.info("Available columns:")
        for col in df.columns:
            logger.info(f"  - {col}")

    # Filter to only existing keys
    input_keys = [k for k in input_keys if k in df.columns]
    output_keys = [k for k in output_keys if k in df.columns]
    metadata_keys = [k for k in metadata_keys if k in df.columns]

    logger.info(f"Input keys ({len(input_keys)}): {', '.join(input_keys[:5])}...")
    logger.info(f"Output keys ({len(output_keys)}): {', '.join(output_keys[:5])}...")
    logger.info(f"Metadata keys ({len(metadata_keys)}): {', '.join(metadata_keys[:5])}...")

    # Connect to Phoenix
    logger.info("Connecting to Phoenix...")
    px_client = Client()

    # Create dataset
    # Note: description parameter is not supported by Phoenix datasets API

    logger.info(f"Creating dataset '{dataset_name}' in Phoenix...")

    try:
        dataset = px_client.datasets.create_dataset(
            dataframe=df,
            dataset_name=dataset_name,
            output_keys=output_keys,
            metadata_keys=metadata_keys
        )

        logger.info("✓ Dataset created successfully!")
        logger.info(f"  Dataset name: {dataset_name}")
        logger.info(f"  Examples: {len(df)}")
        logger.info(f"  Total columns: {len(df.columns)}")
        logger.info(f"    - Input fields: {len(input_keys)}")
        logger.info(f"    - Output fields: {len(output_keys)}")
        logger.info(f"    - Metadata fields: {len(metadata_keys)}")

        # Print distribution summary
        logger.info("\n=== Dataset Summary ===")
        if "model_id" in df.columns:
            logger.info("Models used:")
            for model, count in df["model_id"].value_counts().items():
                logger.info(f"  - {model}: {count} interactions")

        if "tool_call_rounds_count" in df.columns:
            avg_rounds = df["tool_call_rounds_count"].mean()
            logger.info(f"\nAverage tool call rounds: {avg_rounds:.2f}")

        if "prompt_tokens" in df.columns and "completion_tokens" in df.columns:
            total_prompt = df["prompt_tokens"].sum()
            total_completion = df["completion_tokens"].sum()
            logger.info("\nTotal tokens:")
            logger.info(f"  - Prompt: {total_prompt:,}")
            logger.info(f"  - Completion: {total_completion:,}")
            logger.info(f"  - Total: {total_prompt + total_completion:,}")

        return dataset

    except Exception as e:
        logger.error(f"Failed to create dataset: {e}")
        logger.exception("Full error:")
        raise


def main():
    parser = argparse.ArgumentParser(
        description="Upload Copilot chat CSV to Phoenix dataset",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument(
        "csv_path",
        type=str,
        help="Path to chat_phoenix.csv file"
    )

    parser.add_argument(
        "dataset_name",
        type=str,
        nargs="?",
        default="copilot-research",
        help="Name for the Phoenix dataset (default: copilot-research)"
    )

    parser.add_argument(
        "--description",
        type=str,
        help="Optional dataset description"
    )

    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default="INFO",
        help="Set logging level"
    )

    args = parser.parse_args()

    # Set log level
    logging.getLogger().setLevel(getattr(logging, args.log_level))

    try:
        upload_chat_dataset(
            csv_path=args.csv_path,
            dataset_name=args.dataset_name,
            description=args.description
        )
        sys.exit(0)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
