-- Migration: 001_inbox_pipeline_pgvector.sql
-- Adds pgvector extension and embedding column to inbox_entries
-- Run AFTER Prisma generates the base tables via bun run db:push

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add 384-dim embedding column (Xenova/all-MiniLM-L6-v2; see migration 005)
ALTER TABLE inbox_entries
  ADD COLUMN IF NOT EXISTS embedding vector(384);

-- IVFFlat index for approximate nearest-neighbor search
-- Tune lists based on row count: sqrt(row_count) is a good starting point
CREATE INDEX IF NOT EXISTS idx_inbox_entries_embedding
  ON inbox_entries
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text search index on extracted_text
CREATE INDEX IF NOT EXISTS idx_inbox_entries_text_search
  ON inbox_entries
  USING gin(to_tsvector('english', COALESCE(extracted_text, '') || ' ' || COALESCE(title, '')));

-- Tag search (GIN on array column)
CREATE INDEX IF NOT EXISTS idx_inbox_entries_tags
  ON inbox_entries USING gin(tags);

-- Status + created_at for efficient queue queries
CREATE INDEX IF NOT EXISTS idx_inbox_entries_status_created
  ON inbox_entries(status, created_at DESC);

-- Category lookup
CREATE INDEX IF NOT EXISTS idx_inbox_entries_category
  ON inbox_entries(category_id);

-- Source format for batch processing
CREATE INDEX IF NOT EXISTS idx_inbox_entries_format
  ON inbox_entries(source_format);

-- ─── Supabase Storage Bucket ────────────────────────────────────────────────
-- Create inbox-files bucket for binary uploads (PDFs, images, HTML)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inbox-files',
  'inbox-files',
  false,
  52428800,  -- 50MB limit
  ARRAY['application/pdf', 'text/html', 'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- ─── RLS Policies ───────────────────────────────────────────────────────────
-- inbox_entries: only service role can write; authenticated users can read
ALTER TABLE inbox_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_inbox" ON inbox_entries;
CREATE POLICY "service_role_all_inbox"
  ON inbox_entries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_inbox" ON inbox_entries;
CREATE POLICY "authenticated_read_inbox"
  ON inbox_entries FOR SELECT
  TO authenticated
  USING (true);

-- entry_relations: same pattern
ALTER TABLE entry_relations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_relations" ON entry_relations;
CREATE POLICY "service_role_all_relations"
  ON entry_relations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_relations" ON entry_relations;
CREATE POLICY "authenticated_read_relations"
  ON entry_relations FOR SELECT
  TO authenticated
  USING (true);

-- output_artefacts: service role writes, authenticated reads
ALTER TABLE output_artefacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_artefacts" ON output_artefacts;
CREATE POLICY "service_role_all_artefacts"
  ON output_artefacts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_artefacts" ON output_artefacts;
CREATE POLICY "authenticated_read_artefacts"
  ON output_artefacts FOR SELECT
  TO authenticated
  USING (true);

-- ─── Semantic search helper function ────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_inbox_entries(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  summary text,
  tags text[],
  entry_type text,
  severity text,
  source_file text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ie.id,
    ie.title,
    ie.summary,
    ie.tags,
    ie.entry_type,
    ie.severity,
    ie.source_file,
    1 - (ie.embedding <=> query_embedding) AS similarity
  FROM inbox_entries ie
  WHERE ie.embedding IS NOT NULL
    AND 1 - (ie.embedding <=> query_embedding) > match_threshold
  ORDER BY ie.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
