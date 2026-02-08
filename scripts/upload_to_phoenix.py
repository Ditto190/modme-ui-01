"""
Upload Copilot chat examples to Phoenix dataset.

This script:
1. Parses the full chat.json file using copilot_chat_parser
2. Converts DataFrame rows to Phoenix example format (input/output/metadata)
3. Uploads examples to Phoenix dataset in batches using Phoenix client library

Usage:
    # Upload full chat.json
    python scripts/upload_to_phoenix.py datasets/chat.json

    # Custom batch size and dataset name
    python scripts/upload_to_phoenix.py datasets/chat.json --batch-size 20 --dataset copilot-research-full

    # Dry run to see what would be uploaded
    python scripts/upload_to_phoenix.py datasets/chat.json --dry-run

    # Upload with custom Phoenix endpoint
    python scripts/upload_to_phoenix.py datasets/chat.json --phoenix-endpoint http://localhost:6006
"""
import argparse
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import the chat parser
from agent.observability.copilot_chat_parser import (
    INPUT_COLUMNS,
    METADATA_COLUMNS,
    OUTPUT_COLUMNS,
    parse_chat_json,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def dataframe_to_phoenix_examples(df: "pd.DataFrame") -> List[Dict[str, Any]]:
    """
    Convert DataFrame rows to Phoenix example format.

    Each example has:
    - input: dict with INPUT_COLUMNS
    - output: dict with OUTPUT_COLUMNS
    - metadata: dict with METADATA_COLUMNS
    """
    import pandas as pd

    examples = []

    for idx, row in df.iterrows():
        example = {
            "input": {},
            "output": {},
            "metadata": {},
        }

        # Extract input fields
        for col in INPUT_COLUMNS:
            if col in row:
                value = row[col]
                # Convert NaN to empty string
                if pd.isna(value):
                    value = ""
                example["input"][col] = str(value) if value else ""

        # Extract output fields
        for col in OUTPUT_COLUMNS:
            if col in row:
                value = row[col]
                if pd.isna(value):
                    value = ""
                example["output"][col] = str(value) if value else ""

        # Extract metadata fields
        for col in METADATA_COLUMNS:
            if col in row:
                value = row[col]
                # Keep None/NaN as null for metadata
                if pd.isna(value):
                    example["metadata"][col] = None
                else:
                    # Convert to native Python types
                    if isinstance(value, (pd.Timestamp, pd.Timedelta)):
                        example["metadata"][col] = str(value)
                    else:
                        example["metadata"][col] = value

        examples.append(example)

    return examples


def convert_examples_to_dataframe(examples: List[Dict[str, Any]]) -> "pd.DataFrame":
    """
    Convert Phoenix examples back to DataFrame format for upload.

    Phoenix create_dataset expects a DataFrame, so we need to flatten
    the input/output/metadata structure back to a single row dict.

    Args:
        examples: List of Phoenix example dicts with input, output, metadata

    Returns:
        pandas DataFrame with all columns flattened
    """
    import pandas as pd

    rows = []
    for ex in examples:
        row = {}
        row.update(ex['input'])
        row.update(ex['output'])
        row.update(ex['metadata'])
        rows.append(row)

    return pd.DataFrame(rows)


def main():
    parser = argparse.ArgumentParser(
        description="Upload Copilot chat examples to Phoenix dataset",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Upload full chat.json with default settings
  python scripts/upload_to_phoenix.py datasets/chat.json

  # Custom batch size and dataset name
  python scripts/upload_to_phoenix.py datasets/chat.json --batch-size 20 --dataset copilot-research-full

  # Dry run to preview what will be uploaded
  python scripts/upload_to_phoenix.py datasets/chat.json --dry-run

  # Custom Phoenix endpoint
  python scripts/upload_to_phoenix.py datasets/chat.json --phoenix-endpoint http://localhost:6006
        """,
    )
    parser.add_argument(
        "input_file",
        type=str,
        help="Path to VS Code Copilot Chat JSON file (chat.json)",
    )
    parser.add_argument(
        "--dataset",
        default="copilot-research",
        help="Phoenix dataset name (default: copilot-research)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Number of examples per batch (default: 50)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and preview data without uploading",
    )
    parser.add_argument(
        "--phoenix-endpoint",
        type=str,
        default=None,
        help="Phoenix server URL (default: $PHOENIX_ENDPOINT or http://localhost:6006)",
    )
    parser.add_argument(
        "--include-empty",
        action="store_true",
        help="Include turns with empty user messages",
    )
    parser.add_argument(
        "--max-examples",
        type=int,
        default=None,
        help="Maximum number of examples to upload (for testing)",
    )

    args = parser.parse_args()

    # Check if input file exists
    input_path = Path(args.input_file)
    if not input_path.exists():
        logger.error(f"Input file not found: {input_path}")
        return 1

    # Step 1: Parse chat.json
    logger.info(f"Parsing {input_path}...")
    try:
        df = parse_chat_json(input_path, include_empty_turns=args.include_empty)
    except Exception as e:
        logger.error(f"Failed to parse chat.json: {e}")
        return 1

    logger.info(f"Parsed {len(df)} turns")

    # Apply max examples limit if specified
    if args.max_examples and args.max_examples < len(df):
        logger.info(f"Limiting to first {args.max_examples} examples")
        df = df.head(args.max_examples)

    # Step 2: Convert to Phoenix example format
    logger.info("Converting to Phoenix example format...")
    try:
        examples = dataframe_to_phoenix_examples(df)
    except Exception as e:
        logger.error(f"Failed to convert to Phoenix format: {e}")
        return 1

    logger.info(f"Created {len(examples)} Phoenix examples")

    # Preview first example
    if examples:
        logger.info("\nFirst example preview:")
        first = examples[0]
        logger.info(f"  Input: user_message = {first['input']['user_message'][:100]}...")
        logger.info(f"  Output: assistant_response = {first['output']['assistant_response'][:100]}...")
        logger.info(f"  Metadata: model_id = {first['metadata'].get('model_id', 'N/A')}")
        logger.info(f"  Metadata: prompt_tokens = {first['metadata'].get('prompt_tokens', 'N/A')}")

    # Dry run mode - just show preview
    if args.dry_run:
        logger.info("\n=== DRY RUN MODE - No upload will be performed ===")
        logger.info(f"\nWould upload {len(examples)} examples to dataset '{args.dataset}'")
        logger.info(f"Batch size: {args.batch_size}")
        logger.info(f"Number of batches: {(len(examples) + args.batch_size - 1) // args.batch_size}")

        # Show sample of examples
        logger.info("\nSample examples (first 3):")
        for i, ex in enumerate(examples[:3], 1):
            logger.info(f"\n{i}. User: {ex['input']['user_message'][:80]}...")
            logger.info(f"   Model: {ex['metadata'].get('model_id', 'N/A')}")
            logger.info(f"   Response: {ex['output']['assistant_response'][:80]}...")

        return 0

    # Step 3: Initialize Phoenix client
    logger.info("\nInitializing Phoenix client...")
    try:
        from phoenix.client import Client

        # Set endpoint if provided
        endpoint = args.phoenix_endpoint or os.getenv("PHOENIX_ENDPOINT", "http://localhost:6006")

        # Parse endpoint to set environment variables
        if endpoint:
            from urllib.parse import urlparse
            parsed = urlparse(endpoint)
            os.environ["PHOENIX_HOST"] = parsed.hostname or "localhost"
            os.environ["PHOENIX_PORT"] = str(parsed.port or 6006)

        client = Client()
        logger.info(f"Connected to Phoenix at {endpoint}")

    except ImportError:
        logger.error("Phoenix client not found. Install with: pip install arize-phoenix-client")
        return 1
    except Exception as e:
        logger.error(f"Failed to connect to Phoenix: {e}")
        return 1

    # Step 4: Check if dataset exists, create if needed
    try:
        datasets = client.datasets.list_datasets()
        dataset_names = [ds.name for ds in datasets]

        if args.dataset not in dataset_names:
            logger.info(f"Dataset '{args.dataset}' not found, will be created on first upload")
        else:
            logger.info(f"Dataset '{args.dataset}' exists")
    except Exception as e:
        logger.warning(f"Could not check dataset status: {e}")

# Step 5: Upload all examples in one operation
    # Note: Phoenix create_dataset uploads all examples at once, not in batches
    # Batching is only for processing/memory management, not upload
    logger.info(f"\nUploading {len(examples)} examples to Phoenix...")
    logger.info("Note: All examples will be uploaded in one operation to create the dataset")

    try:
        import pandas as pd
        from phoenix.client import Client

        # Create client if not already connected
        if 'client' not in locals():
            client = Client()

        # Convert all examples back to DataFrame
        rows = []
        for ex in examples:
            row = {}
            row.update(ex['input'])
            row.update(ex['output'])
            row.update(ex['metadata'])
            rows.append(row)

        df = pd.DataFrame(rows)

        logger.info(f"Creating dataset with {len(df)} examples...")

        # Upload entire dataset in one call
        dataset = client.datasets.create_dataset(
            name=args.dataset,
            dataframe=df,
            input_keys=INPUT_COLUMNS,
            output_keys=OUTPUT_COLUMNS,
            metadata_keys=METADATA_COLUMNS,
        )

        logger.info(f"✅ Dataset '{args.dataset}' created successfully!")
        logger.info(f"   Dataset ID: {dataset.id if hasattr(dataset, 'id') else 'N/A'}")

        total_uploaded = len(examples)
        total_failed =0

    except Exception as e:
        logger.error(f"❌ Upload failed: {e}")
        import traceback
        traceback.print_exc()
        total_uploaded = 0
        total_failed = len(examples)

    # Summary
    logger.info("\n" + "="*60)
    logger.info("UPLOAD SUMMARY")
    logger.info("="*60)
    logger.info(f"Total examples: {len(examples)}")
    logger.info(f"Successfully uploaded: {total_uploaded}")
    logger.info(f"Failed: {total_failed}")
    logger.info(f"Dataset: {args.dataset}")
    logger.info("="*60)

    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
