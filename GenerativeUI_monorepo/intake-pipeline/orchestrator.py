"""
Intake orchestrator — parse ~/.copilot/session-state/*/events.jsonl
→ extract SessionRecord + ToolCallRecord + ToolMetricRecord
→ write JSONL staging file (outgoing/)
→ upsert to Supabase (when SUPABASE_URL + SUPABASE_KEY set)

Usage:
    python orchestrator.py                          # auto-discover all session logs
    python orchestrator.py -i <path/to/events.jsonl>
    python orchestrator.py -i <dir/>                # all *.jsonl in dir
    python orchestrator.py --dry-run                # no Supabase write
"""
from __future__ import annotations
import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from metrics_schema import (
    RawEvent,
    SessionRecord,
    ToolCallRecord,
    ToolMetricRecord,
    ToolExecutionStartData,
    ToolExecutionCompleteData,
    SessionStartData,
)
from popularity_scorer import compute_tool_popularity
from supabase_syncer import upsert_batch

OUTDIR = Path(__file__).resolve().parent / "outgoing"
OUTDIR.mkdir(parents=True, exist_ok=True)

# Default search location for Copilot session logs
DEFAULT_LOG_ROOT = Path.home() / ".copilot" / "session-state"


# ── Parsing ──────────────────────────────────────────────────────────────────

def parse_events_file(path: Path) -> tuple[SessionRecord | None, list[ToolCallRecord]]:
    """Parse one events.jsonl → (SessionRecord, [ToolCallRecord])."""
    session: SessionRecord | None = None
    pending_starts: dict[str, dict[str, Any]] = {}   # toolCallId → start event data
    tool_calls: list[ToolCallRecord] = []

    with path.open("r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                raw = json.loads(line)
            except Exception:
                continue

            ev_type = raw.get("type", "")
            data = raw.get("data", {})
            ts = raw.get("timestamp")

            if ev_type == "session.start":
                try:
                    sd = SessionStartData(**data)
                except Exception:
                    continue
                ctx = sd.context or {}
                session = SessionRecord(
                    session_id=sd.sessionId,
                    started_at=sd.startTime or ts,
                    model=sd.selectedModel,
                    reasoning_effort=sd.reasoningEffort,
                    branch=ctx.get("branch"),
                    repository=ctx.get("repository"),
                    cwd=ctx.get("cwd"),
                    host_type=ctx.get("hostType"),
                    producer=sd.producer,
                    copilot_version=sd.copilotVersion,
                )

            elif ev_type == "session.end":
                if session:
                    session.ended_at = ts
                    if session.started_at and ts:
                        try:
                            s = datetime.fromisoformat(session.started_at.replace("Z", "+00:00"))
                            e = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                            session.duration_ms = int((e - s).total_seconds() * 1000)
                        except Exception:
                            pass

            elif ev_type == "tool.execution_start":
                try:
                    sd = ToolExecutionStartData(**data)
                except Exception:
                    continue
                pending_starts[sd.toolCallId] = {
                    "tool_name": sd.toolName,
                    "turn_id": sd.turnId,
                    "interaction_id": sd.interactionId,
                    "model": sd.model,
                    "arguments": sd.arguments,
                    "started_at": ts,
                    "session_id": session.session_id if session else path.parent.name,
                }

            elif ev_type == "tool.execution_complete":
                try:
                    cd = ToolExecutionCompleteData(**data)
                except Exception:
                    continue
                start_info = pending_starts.pop(cd.toolCallId, {})
                completed_at = ts
                duration_ms: int | None = None
                if start_info.get("started_at") and completed_at:
                    try:
                        s = datetime.fromisoformat(start_info["started_at"].replace("Z", "+00:00"))
                        e = datetime.fromisoformat(completed_at.replace("Z", "+00:00"))
                        duration_ms = max(0, int((e - s).total_seconds() * 1000))
                    except Exception:
                        pass

                error_info = cd.error or {}
                tc = ToolCallRecord(
                    session_id=start_info.get("session_id", path.parent.name),
                    tool_call_id=cd.toolCallId,
                    tool_name=start_info.get("tool_name", "unknown"),
                    turn_id=cd.turnId or start_info.get("turn_id"),
                    interaction_id=cd.interactionId or start_info.get("interaction_id"),
                    model=cd.model or start_info.get("model"),
                    started_at=start_info.get("started_at"),
                    completed_at=completed_at,
                    duration_ms=duration_ms,
                    success=cd.success,
                    error_code=error_info.get("code"),
                    error_message=error_info.get("message"),
                    arguments=start_info.get("arguments", {}),
                )
                tool_calls.append(tc)

    # update session totals
    if session and tool_calls:
        session.total_tool_calls = len(tool_calls)
        session.tool_success_count = sum(1 for t in tool_calls if t.success)
        session.tool_failure_count = sum(1 for t in tool_calls if t.success is False)

    return session, tool_calls


def discover_session_files(root: Path) -> list[Path]:
    """Find all events.jsonl files under root."""
    return sorted(root.rglob("events.jsonl"))


def aggregate_tool_metrics(tool_calls: list[ToolCallRecord]) -> list[ToolMetricRecord]:
    """Daily aggregates per tool name across all sessions."""
    by_tool_date: dict[tuple[str, str], list[ToolCallRecord]] = {}
    for tc in tool_calls:
        date = tc.started_at[:10] if tc.started_at else datetime.now(timezone.utc).strftime("%Y-%m-%d")
        key = (tc.tool_name, date)
        by_tool_date.setdefault(key, []).append(tc)

    records: list[ToolMetricRecord] = []
    for (tool_name, date), calls in sorted(by_tool_date.items()):
        success = [c for c in calls if c.success]
        durations = [c.duration_ms for c in calls if c.duration_ms is not None]
        durations_sorted = sorted(durations)
        p95 = durations_sorted[int(len(durations_sorted) * 0.95) - 1] if durations_sorted else None
        records.append(ToolMetricRecord(
            tool_name=tool_name,
            metric_date=date,
            invocations=len(calls),
            success_count=len(success),
            failure_count=len(calls) - len(success),
            success_rate=len(success) / len(calls) if calls else None,
            avg_duration_ms=sum(durations) / len(durations) if durations else None,
            p95_duration_ms=float(p95) if p95 else None,
        ))

    return compute_tool_popularity(records)


# ── Staging writer ────────────────────────────────────────────────────────────

def write_staging_jsonl(sessions, tool_calls, metrics, out_path: Path):
    """Write all records as JSONL to staging file."""
    with out_path.open("w", encoding="utf-8") as fh:
        for s in sessions:
            fh.write(json.dumps({"_table": "copilot_sessions", **s.model_dump()}) + "\n")
        for tc in tool_calls:
            fh.write(json.dumps({"_table": "copilot_tool_calls", **tc.model_dump()}) + "\n")
        for m in metrics:
            fh.write(json.dumps({"_table": "tool_metrics", **m.model_dump()}) + "\n")
    print(f"  [staging] -> {out_path}")


# ── Main run ─────────────────────────────────────────────────────────────────

def run(input_path: str | None, dry_run: bool = True, tenant_id: str | None = None) -> dict:
    root = Path(input_path) if input_path else DEFAULT_LOG_ROOT

    if root.is_file():
        files = [root]
    elif root.is_dir():
        # If a dir of events.jsonl files (single session dir), check direct
        direct = root / "events.jsonl"
        if direct.exists():
            files = [direct]
        else:
            files = discover_session_files(root)
    else:
        raise SystemExit(f"Path not found: {root}")

    print(f"Parsing {len(files)} session file(s)...")

    all_sessions: list[SessionRecord] = []
    all_tool_calls: list[ToolCallRecord] = []

    for f in files:
        session, tool_calls = parse_events_file(f)
        if session:
            all_sessions.append(session)
        all_tool_calls.extend(tool_calls)
        print(f"  {f.parent.name}: {len(tool_calls)} tool calls, session={bool(session)}")

    metrics = aggregate_tool_metrics(all_tool_calls)

    # Write staging JSONL
    ts_str = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    out_path = OUTDIR / f"metrics-{ts_str}-{os.getpid()}.jsonl"
    write_staging_jsonl(all_sessions, all_tool_calls, metrics, out_path)

    # Upsert to Supabase
    if dry_run:
        print(f"\n[dry-run] Skipping Supabase upsert.")
    else:
        print(f"\nUploading to Supabase...")
        upsert_batch(
            sessions=[s.model_dump() for s in all_sessions],
            tool_calls=[tc.model_dump() for tc in all_tool_calls],
            metrics=[m.model_dump() for m in metrics],
        )

    summary = {
        "sessions": len(all_sessions),
        "tool_calls": len(all_tool_calls),
        "tool_metrics": len(metrics),
        "staging_file": str(out_path),
        "tenant_id": tenant_id,
        "pipeline": "copilot-intake",
        "dry_run": dry_run,
    }
    print(f"\nDone: {summary}")
    return summary


def cli():
    ap = argparse.ArgumentParser(description="Intake pipeline: parse Copilot session events → Supabase")
    ap.add_argument("--input", "-i", help="Path to events.jsonl file or session-state dir (default: ~/.copilot/session-state)")
    ap.add_argument("--dry-run", action="store_true", help="Skip Supabase write")
    ap.add_argument("--live", action="store_true", help="Actually write to Supabase (requires SUPABASE_URL + SUPABASE_KEY)")
    ap.add_argument(
        "--tenant-id",
        default=os.environ.get("DEV_TENANT_ID", "00000000-0000-4000-8000-000000000001"),
        help="Tenant UUID for unified pipeline_runs metadata",
    )
    ap.add_argument("--json", action="store_true", help="Emit machine-readable JSON on stdout")
    args = ap.parse_args()

    dry_run = not args.live if args.live else (args.dry_run or True)
    summary = run(args.input, dry_run=dry_run, tenant_id=args.tenant_id)
    payload = {"result": summary, "stats": summary, "pipeline_run_id": None}
    if args.json or not sys.stdout.isatty():
        print(json.dumps(payload))
    else:
        print(json.dumps(payload))


if __name__ == "__main__":
    cli()

