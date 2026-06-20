-- Eval pipeline: sessions, signals, themes, events, contract results
-- Mirrors intake_events pattern; local JSONL remains source of truth when Supabase unavailable

CREATE TABLE IF NOT EXISTS eval_themes (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  taxonomy_code TEXT,
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eval_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_session_id TEXT NOT NULL,
  agent TEXT,
  worktree_path TEXT,
  branch TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (external_session_id)
);

CREATE INDEX IF NOT EXISTS idx_eval_sessions_started ON eval_sessions (started_at DESC);

CREATE TABLE IF NOT EXISTS eval_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES eval_sessions(id) ON DELETE SET NULL,
  theme_id TEXT REFERENCES eval_themes(id) ON DELETE SET NULL,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  impact TEXT NOT NULL DEFAULT 'medium' CHECK (impact IN ('low', 'medium', 'high')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  taxonomy_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_signals_theme ON eval_signals (theme_id);
CREATE INDEX IF NOT EXISTS idx_eval_signals_created ON eval_signals (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eval_signals_impact ON eval_signals (impact);

CREATE TABLE IF NOT EXISTS eval_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline TEXT NOT NULL DEFAULT 'agent-eval',
  mode TEXT NOT NULL DEFAULT 'collect',
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_eval_events_started ON eval_events (started_at DESC);

CREATE TABLE IF NOT EXISTS eval_contract_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eval_event_id UUID REFERENCES eval_events(id) ON DELETE CASCADE,
  contract_name TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  severity TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_contract_results_event ON eval_contract_results (eval_event_id);

-- Link eval scores into catalogue popularity (optional FK when catalogue_items exists)
CREATE TABLE IF NOT EXISTS eval_catalogue_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogue_item_id UUID,
  external_id TEXT,
  timeframe TEXT NOT NULL DEFAULT '30d',
  behavioral_score NUMERIC(5,4),
  eval_pass_rate NUMERIC(5,4),
  local_usage NUMERIC(5,4),
  composite_score NUMERIC(5,4),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eval_catalogue_scores_external ON eval_catalogue_scores (external_id, captured_at DESC);

COMMENT ON TABLE eval_signals IS 'Agent friction signals (feedback-themes pattern)';
COMMENT ON TABLE eval_events IS 'Pipeline audit trail (intake_events analogue)';
COMMENT ON TABLE eval_contract_results IS 'Offline behavioral contract replay results';
