-- Observability pipeline: tenant isolation + unified pipeline_runs + trace_refs bridge
-- Phase 1 — mirrors code_pattern_refs dual-store pattern; RLS via app.current_tenant_id

-- ---------------------------------------------------------------------------
-- 1. Tenants (root FK for observability rows)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  metadata   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO tenants (id, slug, name, metadata)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'modme-local',
  'ModMe Local Dev',
  '{"environment": "development"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. tenant_id on telemetry + eval tables (backfill → modme-local)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  dev_tenant_id UUID := '00000000-0000-4000-8000-000000000001';
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'telemetry_events'
  ) THEN
    ALTER TABLE telemetry_events
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants (id) ON DELETE RESTRICT;
    UPDATE telemetry_events SET tenant_id = dev_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE telemetry_events ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE telemetry_events ALTER COLUMN tenant_id SET DEFAULT dev_tenant_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'eval_sessions'
  ) THEN
    ALTER TABLE eval_sessions
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants (id) ON DELETE RESTRICT;
    UPDATE eval_sessions SET tenant_id = dev_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE eval_sessions ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE eval_sessions ALTER COLUMN tenant_id SET DEFAULT dev_tenant_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'eval_signals'
  ) THEN
    ALTER TABLE eval_signals
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants (id) ON DELETE RESTRICT;
    UPDATE eval_signals SET tenant_id = dev_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE eval_signals ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE eval_signals ALTER COLUMN tenant_id SET DEFAULT dev_tenant_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'eval_events'
  ) THEN
    ALTER TABLE eval_events
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants (id) ON DELETE RESTRICT;
    UPDATE eval_events SET tenant_id = dev_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE eval_events ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE eval_events ALTER COLUMN tenant_id SET DEFAULT dev_tenant_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'eval_contract_results'
  ) THEN
    ALTER TABLE eval_contract_results
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants (id) ON DELETE RESTRICT;
    UPDATE eval_contract_results SET tenant_id = dev_tenant_id WHERE tenant_id IS NULL;
    ALTER TABLE eval_contract_results ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE eval_contract_results ALTER COLUMN tenant_id SET DEFAULT dev_tenant_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'telemetry_events') THEN
    CREATE INDEX IF NOT EXISTS idx_telemetry_events_tenant_created
      ON telemetry_events (tenant_id, created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'eval_sessions') THEN
    CREATE INDEX IF NOT EXISTS idx_eval_sessions_tenant_created
      ON eval_sessions (tenant_id, created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'eval_signals') THEN
    CREATE INDEX IF NOT EXISTS idx_eval_signals_tenant_created
      ON eval_signals (tenant_id, created_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'eval_events') THEN
    CREATE INDEX IF NOT EXISTS idx_eval_events_tenant_created
      ON eval_events (tenant_id, started_at DESC);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'eval_contract_results') THEN
    CREATE INDEX IF NOT EXISTS idx_eval_contract_results_tenant_created
      ON eval_contract_results (tenant_id, created_at DESC);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. pipeline_runs — unifies intake_pipeline_runs + eval_events audit pattern
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants (id) ON DELETE RESTRICT DEFAULT '00000000-0000-4000-8000-000000000001',
  pipeline             TEXT NOT NULL DEFAULT 'telemetry',
  mode                 TEXT NOT NULL DEFAULT 'collect',
  trigger_source       TEXT NOT NULL DEFAULT 'manual',
  status               TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'skipped')),
  started_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at          TIMESTAMPTZ,
  source_path          TEXT,
  stats                JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message        TEXT,
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  sessions_parsed      INT NOT NULL DEFAULT 0,
  tool_calls_upserted  INT NOT NULL DEFAULT 0,
  metrics_written      INT NOT NULL DEFAULT 0,
  errors               INT NOT NULL DEFAULT 0,
  duration_ms          BIGINT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_tenant_created
  ON pipeline_runs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_pipeline_status
  ON pipeline_runs (pipeline, status, started_at DESC);

COMMENT ON TABLE pipeline_runs IS 'Unified observability pipeline audit (intake_pipeline_runs + eval_events)';

-- ---------------------------------------------------------------------------
-- 4. trace_refs — Greptime span bridge (like code_pattern_refs)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'telemetry_events'
  ) THEN
    CREATE TABLE IF NOT EXISTS trace_refs (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      telemetry_event_id  UUID NOT NULL REFERENCES telemetry_events (id) ON DELETE CASCADE,
      greptime_span_id    TEXT NOT NULL,
      tenant_id           UUID NOT NULL REFERENCES tenants (id) ON DELETE RESTRICT DEFAULT '00000000-0000-4000-8000-000000000001',
      trace_id            TEXT,
      session_id          TEXT,
      span_name           TEXT,
      attributes          JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (telemetry_event_id, greptime_span_id)
    );

    CREATE INDEX IF NOT EXISTS idx_trace_refs_telemetry_event_id
      ON trace_refs (telemetry_event_id);

    CREATE INDEX IF NOT EXISTS idx_trace_refs_greptime_span_id
      ON trace_refs (greptime_span_id);

    CREATE INDEX IF NOT EXISTS idx_trace_refs_tenant_created
      ON trace_refs (tenant_id, created_at DESC);

    COMMENT ON TABLE trace_refs IS 'Cross-ref GreptimeDB agent_spans rows linked to telemetry_events';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Row-level security (app.current_tenant_id session variable)
-- ---------------------------------------------------------------------------

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'trace_refs'
  ) THEN
    ALTER TABLE trace_refs ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'telemetry_events'
  ) THEN
    ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'eval_sessions'
  ) THEN
    ALTER TABLE eval_sessions ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'eval_signals'
  ) THEN
    ALTER TABLE eval_signals ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'eval_events'
  ) THEN
    ALTER TABLE eval_events ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'eval_contract_results'
  ) THEN
    ALTER TABLE eval_contract_results ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Helper: tenant isolation policy template
-- service_role: full access (ingest scripts write tenant_id explicitly)
-- authenticated: scoped to app.current_tenant_id

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'tenants',
    'telemetry_events',
    'eval_sessions',
    'eval_signals',
    'eval_events',
    'eval_contract_results',
    'pipeline_runs',
    'trace_refs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = tbl AND policyname = tbl || '_service_all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        tbl || '_service_all',
        tbl
      );
    END IF;

    IF tbl = 'tenants' THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'tenants' AND policyname = 'tenants_authenticated_select'
      ) THEN
        CREATE POLICY tenants_authenticated_select ON tenants
          FOR SELECT TO authenticated
          USING (id = current_setting('app.current_tenant_id', true)::uuid);
      END IF;
    ELSE
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = tbl AND policyname = tbl || '_tenant_isolation'
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I FOR ALL TO authenticated
           USING (tenant_id = current_setting(''app.current_tenant_id'', true)::uuid)
           WITH CHECK (tenant_id = current_setting(''app.current_tenant_id'', true)::uuid)',
          tbl || '_tenant_isolation',
          tbl
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Hybrid search — eval_signals embedding + match_observability_signals RPC
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'eval_signals'
  ) THEN
    ALTER TABLE eval_signals
      ADD COLUMN IF NOT EXISTS embedding vector(384);

    CREATE INDEX IF NOT EXISTS idx_eval_signals_embedding
      ON eval_signals
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 50);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'telemetry_events'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_telemetry_events_message_fts
      ON telemetry_events
      USING gin (to_tsvector('english', coalesce(message, '')));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION match_observability_signals(
  query_embedding vector(384),
  filter_tenant_id uuid DEFAULT '00000000-0000-4000-8000-000000000001'::uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  impact text,
  theme_id text,
  source text,
  similarity float
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    es.id,
    es.title,
    es.description,
    es.impact,
    es.theme_id,
    es.source,
    1 - (es.embedding <=> query_embedding) AS similarity
  FROM public.eval_signals es
  WHERE es.tenant_id = filter_tenant_id
    AND es.embedding IS NOT NULL
    AND 1 - (es.embedding <=> query_embedding) > match_threshold
  ORDER BY es.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_observability_signals IS 'Hybrid search on eval_signals (pgvector); BM25 on telemetry_events.message via idx_telemetry_events_message_fts';
