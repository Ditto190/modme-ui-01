-- Migration: 008_code_pattern_refs.sql
-- Dual-store promote bridge: Greptime code_pattern_ids on inbox_entries + HNSW partial index
-- Run AFTER Prisma db:push syncs new columns

-- ─── inbox_entries dual-store columns ───────────────────────────────────────

ALTER TABLE inbox_entries
  ADD COLUMN IF NOT EXISTS code_pattern_ids TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source_kind TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inbox_entries_source_kind_check'
  ) THEN
    ALTER TABLE inbox_entries
      ADD CONSTRAINT inbox_entries_source_kind_check
      CHECK (source_kind IS NULL OR source_kind IN ('inbox_file', 'scrape_url', 'code_pattern'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inbox_entries_source_kind
  ON inbox_entries (source_kind)
  WHERE source_kind IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inbox_entries_code_pattern_ids
  ON inbox_entries USING gin (code_pattern_ids);

-- ─── pgvector HNSW partial index (indexed rows only) ────────────────────────

CREATE INDEX IF NOT EXISTS idx_inbox_entries_embedding_hnsw_indexed
  ON inbox_entries
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE status = 'indexed' AND embedding IS NOT NULL;

-- ─── code_pattern_refs join table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS code_pattern_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_entry_id UUID NOT NULL REFERENCES inbox_entries (id) ON DELETE CASCADE,
  greptime_id TEXT NOT NULL,
  path TEXT NOT NULL,
  ast_kind TEXT,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (inbox_entry_id, greptime_id)
);

CREATE INDEX IF NOT EXISTS idx_code_pattern_refs_inbox_entry_id
  ON code_pattern_refs (inbox_entry_id);

CREATE INDEX IF NOT EXISTS idx_code_pattern_refs_greptime_id
  ON code_pattern_refs (greptime_id);

COMMENT ON TABLE code_pattern_refs IS 'Cross-ref GreptimeDB code_index rows promoted into inbox_entries';

ALTER TABLE code_pattern_refs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'code_pattern_refs' AND policyname = 'code_pattern_refs_service_all'
  ) THEN
    CREATE POLICY code_pattern_refs_service_all ON code_pattern_refs
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'code_pattern_refs' AND policyname = 'code_pattern_refs_authenticated_select'
  ) THEN
    CREATE POLICY code_pattern_refs_authenticated_select ON code_pattern_refs
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- FK index on scrape_pages.inbox_entry_id (Supabase best practice)
CREATE INDEX IF NOT EXISTS idx_scrape_pages_inbox_entry_id
  ON scrape_pages (inbox_entry_id)
  WHERE inbox_entry_id IS NOT NULL;
