"""
Conversation Ingestion Pipeline - Import historical AI conversations into GreptimeDB
Supports multiple formats: JSON, CSV, plain text
"""

from __future__ import annotations

import csv
import json
import logging
import os
import re
import sys
import uuid
from datetime import datetime
from io import StringIO
from typing import Any, Dict, List, Literal

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from observability.greptime_logger import GreptimeLogger

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class ConversationIngestion:
    """
    Ingest historical conversations from various formats into GreptimeDB.

    Supports:
    - JSON format (structured data)
    - CSV format (tabular data)
    - Plain text format (chat transcripts)
    """

    def __init__(self, greptime_logger: GreptimeLogger | None = None):
        """Initialize ingestion pipeline."""
        self.greptime = greptime_logger or GreptimeLogger()

    def ingest_json(
        self,
        json_data: str | List[Dict[str, Any]],
        provider: str = "imported",
        conversation_id: str | None = None,
    ) -> Dict[str, Any]:
        """
        Ingest conversations from JSON format.

        Expected JSON structure (array):
        [
          {
            "user_query": "What is Python?",
            "agent_response": "Python is a programming language...",
            "timestamp": "2026-01-01T10:00:00Z",  # optional
            "tool_calls": [{"name": "search", "params": {...}}],  # optional
            "tokens_used": 500,  # optional
            "latency_ms": 1234  # optional
          }
        ]

        Or single object:
        {
          "user_query": "...",
          "agent_response": "..."
        }
        """
        try:
            # Parse JSON if string
            if isinstance(json_data, str):
                data = json.loads(json_data)
            else:
                data = json_data

            # Convert to list if single object
            if isinstance(data, dict):
                data = [data]

            if not isinstance(data, list):
                return {"status": "error", "message": "JSON must be array or object"}

            # Generate conversation ID if multi-turn
            conv_id = conversation_id or str(uuid.uuid4())

            # Process each turn
            ingested = 0
            errors = []

            for idx, turn in enumerate(data):
                try:
                    message_id = turn.get("message_id", str(uuid.uuid4()))
                    timestamp = turn.get("timestamp", datetime.utcnow().isoformat())

                    # Validate required fields
                    if "user_query" not in turn or "agent_response" not in turn:
                        errors.append(f"Turn {idx}: Missing user_query or agent_response")
                        continue

                    # Log to GreptimeDB
                    self.greptime.log_conversation(
                        conversation_id=conv_id,
                        message_id=message_id,
                        timestamp=timestamp,
                        provider=provider,
                        user_query=turn["user_query"],
                        agent_response=turn["agent_response"],
                        model=turn.get("model", "unknown"),
                        tool_calls=turn.get("tool_calls"),
                        prompt_tokens=turn.get("prompt_tokens", 0),
                        completion_tokens=turn.get("completion_tokens", 0),
                        total_tokens=turn.get("tokens_used") or turn.get("total_tokens", 0),
                        latency_ms=turn.get("latency_ms", 0),
                        cost_usd=turn.get("cost_usd"),
                    )

                    ingested += 1

                except Exception as e:
                    errors.append(f"Turn {idx}: {str(e)}")

            return {
                "status": "success",
                "ingested": ingested,
                "errors": errors if errors else None,
                "conversation_id": conv_id,
            }

        except json.JSONDecodeError as e:
            return {"status": "error", "message": f"Invalid JSON: {str(e)}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def ingest_csv(
        self,
        csv_data: str,
        provider: str = "imported",
        conversation_id: str | None = None,
    ) -> Dict[str, Any]:
        """
        Ingest conversations from CSV format.

        Expected CSV columns:
        user_query,agent_response,timestamp,model,tokens_used,latency_ms

        Optional columns: tool_calls (JSON string), message_id, cost_usd
        """
        try:
            # Parse CSV
            csv_reader = csv.DictReader(StringIO(csv_data))
            rows = list(csv_reader)

            if not rows:
                return {"status": "error", "message": "CSV is empty"}

            # Generate conversation ID
            conv_id = conversation_id or str(uuid.uuid4())

            ingested = 0
            errors = []

            for idx, row in enumerate(rows):
                try:
                    # Parse tool_calls if present
                    tool_calls = None
                    if "tool_calls" in row and row["tool_calls"]:
                        try:
                            tool_calls = json.loads(row["tool_calls"])
                        except json.JSONDecodeError:
                            errors.append(f"Row {idx+1}: Invalid tool_calls JSON")

                    # Log to GreptimeDB
                    self.greptime.log_conversation(
                        conversation_id=conv_id,
                        message_id=row.get("message_id", str(uuid.uuid4())),
                        timestamp=row.get("timestamp", datetime.utcnow().isoformat()),
                        provider=provider,
                        user_query=row["user_query"],
                        agent_response=row["agent_response"],
                        model=row.get("model", "unknown"),
                        tool_calls=tool_calls,
                        total_tokens=int(row.get("tokens_used") or row.get("total_tokens", 0)),
                        latency_ms=int(row.get("latency_ms", 0)),
                        cost_usd=float(row["cost_usd"]) if row.get("cost_usd") else None,
                    )

                    ingested += 1

                except KeyError as e:
                    errors.append(f"Row {idx+1}: Missing required column: {str(e)}")
                except Exception as e:
                    errors.append(f"Row {idx+1}: {str(e)}")

            return {
                "status": "success",
                "ingested": ingested,
                "errors": errors if errors else None,
                "conversation_id": conv_id,
            }

        except Exception as e:
            return {"status": "error", "message": str(e)}

    def ingest_plain_text(
        self,
        text: str,
        provider: str = "imported",
        conversation_id: str | None = None,
        format_pattern: Literal["auto", "user_agent", "role_prefix"] = "auto",
    ) -> Dict[str, Any]:
        """
        Ingest conversations from plain text chat format.

        Supported patterns:

        1. User/Agent prefix:
           User: What is Python?
           Agent: Python is a programming language...

        2. Role prefix:
           [User]: What is Python?
           [Assistant]: Python is a programming language...

        3. Auto-detect (tries multiple patterns)
        """
        try:
            # Auto-detect format
            if format_pattern == "auto":
                if re.search(r'^(User|Human|Q):', text, re.MULTILINE | re.IGNORECASE):
                    format_pattern = "user_agent"
                elif re.search(r'^\[(User|Human|Assistant|Agent)\]:', text, re.MULTILINE | re.IGNORECASE):
                    format_pattern = "role_prefix"
                else:
                    return {"status": "error", "message": "Could not detect text format. Use user_agent or role_prefix."}

            # Parse based on format
            turns = []

            if format_pattern == "user_agent":
                # Split by User:/Agent: pattern
                pattern = r'(?:^|\n)(User|Human|Q|Agent|Assistant|AI|A):\s*(.+?)(?=\n(?:User|Human|Q|Agent|Assistant|AI|A):|$)'
                matches = re.findall(pattern, text, re.DOTALL | re.MULTILINE | re.IGNORECASE)

                current_user_query = None
                for role, content in matches:
                    content = content.strip()

                    if role.lower() in ["user", "human", "q"]:
                        current_user_query = content
                    elif role.lower() in ["agent", "assistant", "ai", "a"] and current_user_query:
                        turns.append({
                            "user_query": current_user_query,
                            "agent_response": content,
                        })
                        current_user_query = None

            elif format_pattern == "role_prefix":
                # Split by [Role]: pattern
                pattern = r'\[(User|Human|Assistant|Agent)\]:\s*(.+?)(?=\n\[(?:User|Human|Assistant|Agent)\]:|$)'
                matches = re.findall(pattern, text, re.DOTALL | re.MULTILINE | re.IGNORECASE)

                current_user_query = None
                for role, content in matches:
                    content = content.strip()

                    if role.lower() in ["user", "human"]:
                        current_user_query = content
                    elif role.lower() in ["assistant", "agent"] and current_user_query:
                        turns.append({
                            "user_query": current_user_query,
                            "agent_response": content,
                        })
                        current_user_query = None

            if not turns:
                return {"status": "error", "message": "No conversation turns found in text"}

            # Ingest as JSON
            return self.ingest_json(turns, provider=provider, conversation_id=conversation_id)

        except Exception as e:
            return {"status": "error", "message": str(e)}

    def ingest_auto(
        self,
        data: str,
        provider: str = "imported",
        conversation_id: str | None = None,
    ) -> Dict[str, Any]:
        """
        Auto-detect format and ingest.

        Tries: JSON → CSV → Plain Text
        """
        # Try JSON first
        try:
            json.loads(data)
            logger.info("Detected JSON format")
            return self.ingest_json(data, provider=provider, conversation_id=conversation_id)
        except json.JSONDecodeError:
            pass

        # Try CSV
        try:
            csv.Sniffer().sniff(data[:1024])
            logger.info("Detected CSV format")
            return self.ingest_csv(data, provider=provider, conversation_id=conversation_id)
        except (csv.Error, Exception):
            pass

        # Fallback to plain text
        logger.info("Detected plain text format")
        return self.ingest_plain_text(data, provider=provider, conversation_id=conversation_id)


def main():
    """CLI entry point for manual ingestion."""
    import argparse

    parser = argparse.ArgumentParser(description="Ingest historical AI conversations")
    parser.add_argument("--file", "-f", type=str, help="Path to file (JSON/CSV/TXT)")
    parser.add_argument("--provider", "-p", type=str, default="imported", help="Provider name")
    parser.add_argument("--format", type=str, choices=["auto", "json", "csv", "text"], default="auto")
    parser.add_argument("--conversation-id", type=str, help="Conversation ID (auto-generated if omitted)")

    args = parser.parse_args()

    if not args.file:
        print("Error: --file required")
        sys.exit(1)

    # Read file
    with open(args.file, "r", encoding="utf-8") as f:
        data = f.read()

    # Ingest
    ingestion = ConversationIngestion()

    if args.format == "auto":
        result = ingestion.ingest_auto(data, provider=args.provider, conversation_id=args.conversation_id)
    elif args.format == "json":
        result = ingestion.ingest_json(data, provider=args.provider, conversation_id=args.conversation_id)
    elif args.format == "csv":
        result = ingestion.ingest_csv(data, provider=args.provider, conversation_id=args.conversation_id)
    elif args.format == "text":
        result = ingestion.ingest_plain_text(data, provider=args.provider, conversation_id=args.conversation_id)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
