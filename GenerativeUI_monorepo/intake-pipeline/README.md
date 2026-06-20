# Intake Pipeline

Reads Copilot session events from `~/.copilot/session-state/*/events.jsonl`, extracts tool-call metrics, computes popularity/trending scores, and persists to Supabase.

## Architecture

```
~/.copilot/session-state/*/events.jsonl
        |
        v
orchestrator.py  --> metrics_schema.py (Pydantic v2 models)
        |                      |
        v                      v
popularity_scorer.py    supabase_syncer.py
        |                      |
        v                      v
outgoing/*.jsonl    Supabase (copilot_sessions, copilot_tool_calls, tool_metrics)

vendor_importer.py --> agent_skills (355 skills from .vendor/awesome-copilot-main)
```

## Supabase Tables

| Table | Description |
|-------|-------------|
| `copilot_sessions` | One row per session; session metadata, model, branch, cwd |
| `copilot_tool_calls` | One row per tool execution with latency, success, arguments |
| `tool_metrics` | Daily rollups: invocations, success_rate, popularity_score, trending_score |
| `agent_skills` | Seeded from `.vendor/awesome-copilot-main/skills/*/SKILL.md` |
| `skill_invocations` | Detected skill uses per session (future) |
| `intake_pipeline_runs` | Pipeline audit trail (future) |

**Views:** `popular_tools`, `trending_tools_7d`, `session_summary`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Hosted Supabase project URL |
| `SUPABASE_KEY` | Anon or service-role key |
| `PYTHONIOENCODING` | Set to `utf-8` on Windows |

## Running

```powershell
# Set env vars
$env:SUPABASE_URL = "https://aevemmmmouxqlfyxthzf.supabase.co"
$env:SUPABASE_KEY = "<your-key>"
$env:PYTHONIOENCODING = "utf-8"

cd GenerativeUI_monorepo/intake-pipeline

# Dry run (no writes, only local staging file)
python orchestrator.py --dry-run

# Live upsert to Supabase
python orchestrator.py --live

# Seed agent_skills from vendor SKILL.md files
python vendor_importer.py --live
```

Or from repo root via package.json scripts:

```bash
yarn intake:dry-run
yarn intake:sync
yarn intake:seed
```

## Popularity Scoring

```
popularity_score = 0.5 * (invocations / max_invocations) + 0.5 * success_rate
trending_score   = invocations_last_7d / invocations_prior_7d
```

Scores are normalized 0-1 per daily batch. Available in `tool_metrics` and `popular_tools` view.

## Security Note

The 6 intake tables currently have RLS disabled. They are write-only via service key for internal pipeline use. Enable RLS with appropriate policies before exposing any table to public-facing queries:

```sql
-- Example: allow anon to read tool_metrics (popularity data only)
ALTER TABLE tool_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read tool_metrics" ON tool_metrics FOR SELECT USING (true);
```

## Files

| File | Purpose |
|------|---------|
| `orchestrator.py` | Main entry point, event parsing, staging JSONL |
| `metrics_schema.py` | Pydantic v2 models for events and output records |
| `popularity_scorer.py` | Daily trending + popularity computation |
| `supabase_syncer.py` | Batch upsert to Supabase (SDK + REST fallback) |
| `vendor_importer.py` | Seeds `agent_skills` from `.vendor` SKILL.md files |
| `sql/001_init_tables.sql` | DDL -- already applied, do NOT re-apply |
| `outgoing/` | Staging JSONL files (local only, gitignored) |
