"""
Popularity and trending score computation for tool metrics.

popularity_score = 0.5 * (invocations / max_invocations) + 0.5 * success_rate
trending_score   = invocations over last 7 days / baseline (simple linear approximation)
"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from metrics_schema import ToolMetricRecord


def compute_tool_popularity(records: list[ToolMetricRecord]) -> list[ToolMetricRecord]:
    """Assign popularity_score and trending_score to each ToolMetricRecord."""
    if not records:
        return records

    max_inv = max((r.invocations for r in records), default=1) or 1

    # Trending: compare 7-day window vs prior 7-day window
    today = datetime.now(timezone.utc).date()
    cutoff_7 = (today - timedelta(days=7)).isoformat()
    cutoff_14 = (today - timedelta(days=14)).isoformat()

    tool_recent: dict[str, int] = {}
    tool_prior: dict[str, int] = {}
    for r in records:
        if r.metric_date >= cutoff_7:
            tool_recent[r.tool_name] = tool_recent.get(r.tool_name, 0) + r.invocations
        elif r.metric_date >= cutoff_14:
            tool_prior[r.tool_name] = tool_prior.get(r.tool_name, 0) + r.invocations

    for r in records:
        sr = r.success_rate if r.success_rate is not None else (r.success_count / r.invocations if r.invocations else 0.0)
        inv_norm = r.invocations / max_inv
        r.popularity_score = round(0.5 * inv_norm + 0.5 * sr, 4)

        recent = tool_recent.get(r.tool_name, 0)
        prior = tool_prior.get(r.tool_name, 0) or recent or 1
        r.trending_score = round(recent / prior, 4) if prior else 0.0

    return records

