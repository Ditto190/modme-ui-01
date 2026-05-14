"""
Load all chat examples and add them to Phoenix copilot-research dataset.
"""
import json

import pandas as pd

# Load CSV
df = pd.read_csv("datasets/chat_phoenix.csv")

# Prepare ALL examples (excluding the first one already uploaded)
examples = []
for idx, row in df.iloc[1:].iterrows():  # Skip first row (already uploaded)
    example = {
        "input": {
            "user_message": str(row.get("user_message", ""))[:1000],
            "model": str(row.get("model_id", "")),
            "turn": int(row.get("turn_index", 0)) if pd.notna(row.get("turn_index")) else 0,
        },
        "output": {
            "assistant_response": str(row.get("assistant_response", ""))[:1000],
            "thinking": str(row.get("thinking", ""))[:500] if pd.notna(row.get("thinking")) else "",
        },
        "metadata": {
            "request_id": str(row.get("request_id", "")),
            "session_id": str(row.get("session_id", "")),
            "timestamp": str(row.get("timestamp", "")),
            "prompt_tokens": int(row.get("prompt_tokens", 0)) if pd.notna(row.get("prompt_tokens")) else 0,
            "completion_tokens": int(row.get("completion_tokens", 0)) if pd.notna(row.get("completion_tokens")) else 0,
            "latency_ms": int(row.get("latency_total_ms", 0)) if pd.notna(row.get("latency_total_ms")) else 0,
            "tools_invoked": int(row.get("tool_call_rounds_count", 0)) if pd.notna(row.get("tool_call_rounds_count")) else 0,
        }
    }
    examples.append(example)

# Save to JSON file
with open("phoenix_remaining_examples.json", "w") as f:
    json.dump(examples, f, indent=2)

print(f"Prepared {len(examples)} remaining examples")
print("Saved to phoenix_remaining_examples.json")
print(f"Total size: {len(json.dumps(examples))} bytes")
