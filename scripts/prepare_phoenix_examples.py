"""
Upload Copilot chat data to Phoenix using add-dataset-examples MCP tool.

This properly formats the CSV data and adds it to the copilot-research dataset.
"""
import sys

import pandas as pd


def prepare_examples(csv_path: str, max_rows: int = None):
    """Convert CSV to Phoenix-compatible examples format."""
    df = pd.read_csv(csv_path)

    if max_rows:
        df = df.head(max_rows)

    examples = []
    for _, row in df.iterrows():
        # Handle NaN values
        example = {
            "input": {
                "user_message": str(row.get("user_message", ""))[:500],
                "model": str(row.get("model_id", "")),
                "tools_available": str(row.get("tools_available", "0")),
            },
            "output": {
                "assistant_response": str(row.get("assistant_response", ""))[:500],
                "thinking": str(row.get("thinking", ""))[:300] if pd.notna(row.get("thinking")) else "",
            },
            "metadata": {
                "request_id": str(row.get("request_id", "")),
                "session_id": str(row.get("session_id", "")),
                "timestamp": str(row.get("timestamp", "")),
                "prompt_tokens": int(row.get("prompt_tokens", 0)) if pd.notna(row.get("prompt_tokens")) else 0,
                "completion_tokens": int(row.get("completion_tokens", 0)) if pd.notna(row.get("completion_tokens")) else 0,
                "latency_ms": int(row.get("latency_total_ms", 0)) if pd.notna(row.get("latency_total_ms")) else 0,
            }
        }
        examples.append(example)

    return examples

if __name__ == "__main__":
    csv_path = sys.argv[1] if len(sys.argv) > 1 else "datasets/chat_phoenix.csv"
    max_rows = int(sys.argv[2]) if len(sys.argv) > 2 else None

    print(f"Loading and preparing examples from {csv_path}...")
    examples = prepare_examples(csv_path, max_rows)

    print(f"✓ Prepared {len(examples)} examples")
    print("\\nExample structure (first item):")
    import json
    print(json.dumps(examples[0], indent=2))

    print("\\nTo upload to Phoenix, use:")
    print('  mcp_phoenix_add-dataset-examples with datasetName="copilot-research" and these examples')
