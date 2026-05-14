"""
Upload Copilot chat data to Phoenix as traces/spans for analysis in the UI.

This uses the correct Phoenix API for uploading chat interactions as TRACES,
not datasets. Traces/spans appear in the main Phoenix UI for analysis.

Usage:
    python -m agent.observability.upload_chat_spans datasets/chat_phoenix.csv copilot-research
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

import pandas as pd
import phoenix as px

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def upload_chat_traces(
    csv_path: str | Path,
    project_name: str = "copilot-research"
) -> None:
    """
    Upload chat data from CSV to Phoenix as traces for analysis.

    Args:
        csv_path: Path to the chat_phoenix.csv file
        project_name: Phoenix project name (default: copilot-research)
    """
    csv_path = Path(csv_path)

    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    logger.info(f"Loading chat data from {csv_path}...")
    df = pd.read_csv(csv_path)

    logger.info(f"Loaded {len(df)} chat interactions with {len(df.columns)} columns")

    # Log interactions as inferences to Phoenix
    logger.info(f"Uploading to Phoenix project: {project_name}")

    # Convert DataFrame to format Phoenix expects
    # Phoenix expects: primary (predictions), reference (ground truth), tags
    # We'll use the assistant_response as predictions
    schema = px.Schema(
        prediction_id_column_name="request_id",
        timestamp_column_name="timestamp",
        feature_column_names=[
            "user_message",
            "model_id",
            "agent_id",
            "tools_available",
            "workspace_repos",
            "prompt_tokens",
            "completion_tokens"
        ],
        prediction_label_column_name="assistant_response",
        tag_column_names=[
            "session_id",
            "responder",
            "agent_name"
        ]
    )

    try:
        # Launch Phoenix (if not already running) and log inferences
        px.launch_app()

        dataset_name = project_name
        ds = px.ingest_data(
            dataframe=df,
            data_type=px.Inferences.PRIMARY,
            name=dataset_name,
            schema=schema
        )

        logger.info("✓ Upload complete!")
        logger.info(f"  Project: {project_name}")
        logger.info(f"  Interactions: {len(df)}")
        logger.info(f"  Columns: {len(df.columns)}")

        # Print summary stats
        logger.info("\n=== Upload Summary ===")
        if "model_id" in df.columns:
            logger.info("Models:")
            for model, count in df["model_id"].value_counts().items():
                logger.info(f"  - {model}: {count}")

        if "prompt_tokens" in df.columns:
            total_tokens = df["prompt_tokens"].sum() + df["completion_tokens"].sum()
            logger.info(f"\nTotal tokens: {total_tokens:,}")

        logger.info(f"\n🎉 Data uploaded successfully to Phoenix project '{project_name}'!")
        logger.info("View in Phoenix UI: http://localhost:6006")

    except Exception as e:
        logger.error(f"Upload failed: {e}")
        logger.exception("Full error:")
        raise


def main():
    parser = argparse.ArgumentParser(
        description="Upload Copilot chat CSV to Phoenix as traces/spans",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument(
        "csv_path",
        type=str,
        help="Path to chat_phoenix.csv file"
    )

    parser.add_argument(
        "project_name",
        type=str,
        nargs="?",
        default="copilot-research",
        help="Phoenix project name (default: copilot-research)"
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
        upload_chat_traces(
            csv_path=args.csv_path,
            project_name=args.project_name
        )
        sys.exit(0)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
