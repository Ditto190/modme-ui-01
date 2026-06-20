-- Migration: 005_embedding_384.sql
-- Standardize embedding dimension to 384 (Xenova/all-MiniLM-L6-v2)

DROP FUNCTION IF EXISTS match_inbox_entries(vector, float, int);

ALTER TABLE inbox_entries
  ALTER COLUMN embedding TYPE vector(384)
  USING CASE
    WHEN embedding IS NULL THEN NULL
    ELSE embedding::vector(384)
  END;

DROP INDEX IF EXISTS idx_inbox_entries_embedding;

CREATE INDEX IF NOT EXISTS idx_inbox_entries_embedding
  ON inbox_entries
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

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
