ADR 0001 — Intake Pipeline: Supabase Upsert Strategy & Vendor Skill Seeding
Status: Proposed
Date: 2026-06-21T05:48:14+10:00

Context
- The intake pipeline ingests Copilot session events from `~/.copilot/session-state/*/events.jsonl` and persists structured records into Supabase tables: `copilot_sessions`, `copilot_tool_calls`, `tool_metrics`, `agent_skills`, etc.
- Early live writes failed with duplicate-key constraint violations on tool calls due to PostgREST/supabase-py upsert behavior when `on_conflict` not specified.
- Vendor skills exist locally under `.vendor/awesome-copilot-main/skills/*/SKILL.md` and must be seeded into `agent_skills`.

Decision
1. Upsert conflict resolution: use per-table `on_conflict` columns passed explicitly to supabase-py `.upsert(..., on_conflict=<col>)`.
   - copilot_sessions -> `session_id`
   - copilot_tool_calls -> `tool_call_id`
   - tool_metrics -> `tool_name,metric_date` (composite)
   - agent_skills -> `skill_key`
2. Vendor seeding: implement `vendor_importer.py` that scans `SKILL.md` files, extracts YAML frontmatter (regex parser), normalizes fields, and upserts to `agent_skills` with `on_conflict='skill_key'`.
3. Popularity scoring: compute popularity_score = 0.5*(invocations/max_invocations) + 0.5*success_rate. Trending: invocations_last_7d / invocations_prior_7d.
4. RLS (Row Level Security): keep RLS disabled during internal dev and live seeding; apply RLS policies in staging before any public exposure. Policies to be defined per-table:
   - Public read-only: `tool_metrics`, `agent_skills` (allow anon SELECT if desired)
   - Private: `copilot_sessions`, `copilot_tool_calls` (service-role only)

Consequences
- Explicit `on_conflict` prevents duplicate-key failures and enables idempotent upserts for repeated runs.
- Regex frontmatter parsing is pragmatic and avoids adding PyYAML dependency; it does not support complex nested YAML — acceptable for initial seeding. Consider migrating to PyYAML for richer parsing later.
- RLS deferral reduces operational friction but requires strict policy rollout before public access.

Alternatives considered
- Add `on_conflict` parameter centrally within supabase wrapper vs per-table mapping. Per-table map chosen to support composite keys and future table-specific logic.
- Use PyYAML for SKILL.md parsing — rejected temporarily to keep dependencies minimal on first pass.
- Use `INSERT ... ON CONFLICT DO UPDATE` via direct PostgREST/SQL — considered less portable than supabase-py upsert with `on_conflict`.

Migration & Rollout
1. Apply changes in repo and run `yarn intake:dry-run` to validate parse and staging outputs.
2. Run `yarn intake:seed` in staging to seed `agent_skills` and validate schema mapping.
3. Enable RLS in staging and iterate policy creation, test anonymous and service-role behaviors.
4. Once policies validated, enable RLS in production, rotate keys, and revoke unsafe anon write access.

Monitoring & Validation
- Validate counts via `SELECT COUNT(*)` on target tables after live runs.
- Track `intake_pipeline_runs` audit entries (to be implemented) with run_id, start/end, counts, errors.
- Alerts for upsert errors and duplicate-key exceptions to trigger rollback investigation.

Open questions
- Should `agent_skills.tags` be normalized into a tags table or kept as JSONB? (Keep JSONB for flexibility now; evaluate indexing and query patterns later.)
- Migrate vendor skill parsing to full YAML parser when multi-line or nested frontmatter needed.

Author: Database Architect / Intake Pipeline Team

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
