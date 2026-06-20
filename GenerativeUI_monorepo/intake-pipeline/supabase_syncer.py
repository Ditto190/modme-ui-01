"""
Supabase syncer — batch upsert copilot_sessions, copilot_tool_calls, tool_metrics.

Uses supabase-py SDK when available, falls back to raw REST.
Requires SUPABASE_URL and SUPABASE_KEY env vars for live writes.
"""
from __future__ import annotations
import json
import os
from typing import Any

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

CHUNK_SIZE = 200  # rows per upsert batch


def _get_client():
    """Return supabase-py client or None if not installed."""
    try:
        from supabase import create_client
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except ImportError:
        return None


def _rest_upsert(table: str, rows: list[dict]) -> None:
    """Fallback: raw REST PATCH with Prefer:merge-duplicates."""
    import urllib.request
    endpoint = SUPABASE_URL.rstrip("/") + f"/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    payload = json.dumps(rows).encode()
    req = urllib.request.Request(endpoint, data=payload, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        if resp.status not in (200, 201, 204):
            raise RuntimeError(f"Supabase REST error {resp.status}: {resp.read().decode()[:500]}")


def _upsert_table(client: Any, table: str, rows: list[dict]) -> None:
    if not rows:
        return
    # Conflict column per table for proper upsert dedup
    conflict_cols = {
        "copilot_sessions": "session_id",
        "copilot_tool_calls": "tool_call_id",
        "tool_metrics": "tool_name,metric_date",
        "agent_skills": "skill_key",
    }
    on_conflict = conflict_cols.get(table)

    # chunk to avoid payload size limits
    for i in range(0, len(rows), CHUNK_SIZE):
        chunk = rows[i : i + CHUNK_SIZE]
        if client:
            q = client.table(table).upsert(chunk)
            if on_conflict:
                q = client.table(table).upsert(chunk, on_conflict=on_conflict)
            q.execute()
        else:
            _rest_upsert(table, chunk)
    print(f"  [supabase] upserted {len(rows)} rows -> {table}")


def upsert_batch(
    sessions: list[dict],
    tool_calls: list[dict],
    metrics: list[dict],
) -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in environment")

    client = _get_client()
    _upsert_table(client, "copilot_sessions", sessions)
    _upsert_table(client, "copilot_tool_calls", tool_calls)
    _upsert_table(client, "tool_metrics", metrics)
    print("Supabase upsert complete.")

