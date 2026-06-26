-- RLS for tables not covered in 001_inbox_pipeline_pgvector.sql

-- categories: read-only for authenticated, full for service_role
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_categories" ON categories;
CREATE POLICY "service_role_all_categories"
  ON categories FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_categories" ON categories;
CREATE POLICY "authenticated_read_categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

-- output_schemas
ALTER TABLE output_schemas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_output_schemas" ON output_schemas;
CREATE POLICY "service_role_all_output_schemas"
  ON output_schemas FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_output_schemas" ON output_schemas;
CREATE POLICY "authenticated_read_output_schemas"
  ON output_schemas FOR SELECT
  TO authenticated
  USING (true);

-- eval pipeline tables
ALTER TABLE eval_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_contract_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_catalogue_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_eval_themes" ON eval_themes;
CREATE POLICY "service_role_all_eval_themes"
  ON eval_themes FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_read_eval_themes" ON eval_themes;
CREATE POLICY "authenticated_read_eval_themes"
  ON eval_themes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "service_role_all_eval_sessions" ON eval_sessions;
CREATE POLICY "service_role_all_eval_sessions"
  ON eval_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_read_eval_sessions" ON eval_sessions;
CREATE POLICY "authenticated_read_eval_sessions"
  ON eval_sessions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "service_role_all_eval_signals" ON eval_signals;
CREATE POLICY "service_role_all_eval_signals"
  ON eval_signals FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_read_eval_signals" ON eval_signals;
CREATE POLICY "authenticated_read_eval_signals"
  ON eval_signals FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "service_role_all_eval_events" ON eval_events;
CREATE POLICY "service_role_all_eval_events"
  ON eval_events FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_read_eval_events" ON eval_events;
CREATE POLICY "authenticated_read_eval_events"
  ON eval_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "service_role_all_eval_contract_results" ON eval_contract_results;
CREATE POLICY "service_role_all_eval_contract_results"
  ON eval_contract_results FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_read_eval_contract_results" ON eval_contract_results;
CREATE POLICY "authenticated_read_eval_contract_results"
  ON eval_contract_results FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "service_role_all_eval_catalogue_scores" ON eval_catalogue_scores;
CREATE POLICY "service_role_all_eval_catalogue_scores"
  ON eval_catalogue_scores FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated_read_eval_catalogue_scores" ON eval_catalogue_scores;
CREATE POLICY "authenticated_read_eval_catalogue_scores"
  ON eval_catalogue_scores FOR SELECT TO authenticated USING (true);
