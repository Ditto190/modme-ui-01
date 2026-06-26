Changelog — Intake Pipeline (snapshot)
Date: 2026-06-21T05:48:14+10:00

Summary
- Intake pipeline parsed Copilot session-state events and upserted data into Supabase (modme-next-forge).
- Live counts: copilot_sessions=12, copilot_tool_calls=2,058 (deduped), tool_metrics=51, agent_skills=355.

Key changes
- supabase_syncer.py: added per-table `on_conflict` column map; upserts now pass `on_conflict=` to supabase-py to avoid duplicate-key errors.
- vendor_importer.py: new vendor seeder scanning `.vendor/awesome-copilot-main/skills/*/SKILL.md` (355 skills); parses frontmatter and upserts to agent_skills.
- README.md: operator guide, env, run commands, popularity scoring formulas.
- package.json: added yarn scripts `intake:dry-run`, `intake:sync`, `intake:seed`.

Operational notes
- RLS advisory: 6 intake tables currently have RLS disabled. These tables permit anon writes — safe for internal dev but requires RLS policies before public exposure.
- Popularity scoring: 0.5 * normalized_invocations + 0.5 * success_rate; trending uses 7-day windows.
- Encoding: ensure PYTHONIOENCODING=utf-8 on Windows to avoid CP1252 issues; replaced unicode arrows with ASCII arrows in code.

Next steps
1. Implement RLS policies and test with staging (recommended first action).
2. Add intake_pipeline_runs audit table and skill_invocations linkage.
3. Schedule automated runs (GitHub Actions or Task Scheduler).
4. Optional: add Redis writer for realtime transport to Supabase/Context7 (redis_writer.py present in pipeline).

Staged files (verified):
- GenerativeUI_monorepo/intake-pipeline/vendor_importer.py (new)
- GenerativeUI_monorepo/intake-pipeline/supabase_syncer.py (updated)
- GenerativeUI_monorepo/intake-pipeline/README.md (updated)
- GenerativeUI_monorepo/package.json (updated)

Author: Copilot (assisted)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
