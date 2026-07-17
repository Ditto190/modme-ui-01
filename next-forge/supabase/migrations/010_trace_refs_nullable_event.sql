-- Allow span-only trace_refs (synthesized spans without a linked telemetry_event row)
-- Correlation metadata lives in attributes JSONB per TraceRefSchema

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'trace_refs'
  ) THEN
    ALTER TABLE trace_refs ALTER COLUMN telemetry_event_id DROP NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_trace_refs_session_id
      ON trace_refs (session_id);

    CREATE INDEX IF NOT EXISTS idx_trace_refs_trace_id
      ON trace_refs (trace_id);

    CREATE INDEX IF NOT EXISTS idx_trace_refs_parent_session
      ON trace_refs ((attributes->>'parent_session_id'))
      WHERE attributes->>'parent_session_id' IS NOT NULL;
  END IF;
END $$;
