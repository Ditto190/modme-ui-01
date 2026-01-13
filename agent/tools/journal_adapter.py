from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any, Dict, Optional

from google.adk.tools import ToolContext


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def _current_timestamp_parts() -> Dict[str, Any]:
    now = datetime.utcnow()
    date = now.strftime("%Y-%m-%d")
    time = now.strftime("%H-%M-%S-%f")
    human = now.strftime("%I:%M:%S %p - %B %d, %Y")
    iso = now.isoformat() + "Z"
    return {"date": date, "time_key": time, "human": human, "iso": iso}


def process_feelings(
    tool_context: ToolContext, diary_entry: str, journal_path: Optional[str] = None
) -> Dict[str, str]:
    """
    Write a diary entry using a modified format (JSON metadata + text).

    Args:
        tool_context: MCP ToolContext (unused but kept for signature compatibility)
        diary_entry: The text of the diary entry
        journal_path: Optional override for journal root directory

    Returns:
        dict with status and path information
    """
    try:
        # Default location mirrors spec: cwd/.private-journal
        root = journal_path or os.path.join(os.getcwd(), ".private-journal")
        parts = _current_timestamp_parts()
        date_dir = os.path.join(root, parts["date"]) 
        _ensure_dir(date_dir)

        filename = f"{parts['time_key']}.json"
        filepath = os.path.join(date_dir, filename)

        # Custom format: JSON object with metadata and entry text
        payload = {
            "format_version": "v2",
            "timestamp_iso": parts["iso"],
            "timestamp_human": parts["human"],
            "entry": diary_entry,
        }

        # Write atomically
        tmp_path = filepath + ".tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, filepath)

        return {
            "status": "success",
            "message": "Entry written",
            "path": filepath,
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
