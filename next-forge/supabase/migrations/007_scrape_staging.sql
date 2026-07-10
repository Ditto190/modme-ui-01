-- Migration: 007_scrape_staging.sql
-- Scrape crawl staging tables (Scrapy → Ollama classify → inbox promote)
-- Run AFTER Prisma generates base tables via bun run db:push

-- ─── Tables (idempotent; skipped if Prisma db:push already created them) ─────

CREATE TABLE IF NOT EXISTS scrape_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  seeds JSONB NOT NULL,
  rules JSONB NOT NULL,
  schedule TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id UUID NOT NULL REFERENCES scrape_manifests (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scrape_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES scrape_jobs (id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  content_hash TEXT NOT NULL UNIQUE,
  html TEXT,
  text TEXT,
  status TEXT NOT NULL DEFAULT 'raw',
  inbox_entry_id TEXT REFERENCES inbox_entries (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scrape_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL UNIQUE REFERENCES scrape_pages (id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  agent_role TEXT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  promoted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── UUID / timestamp defaults (REST inserts when Prisma omits defaults) ─────

ALTER TABLE scrape_manifests ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE scrape_jobs ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE scrape_pages ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE scrape_classifications ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE scrape_manifests ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE scrape_manifests ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE scrape_jobs ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE scrape_pages ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE scrape_pages ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE scrape_classifications ALTER COLUMN created_at SET DEFAULT now();

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_manifest_id
  ON scrape_jobs (manifest_id);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_manifest_started
  ON scrape_jobs (manifest_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_scrape_pages_job_id
  ON scrape_pages (job_id);

CREATE INDEX IF NOT EXISTS idx_scrape_pages_inbox_entry_id
  ON scrape_pages (inbox_entry_id);

CREATE INDEX IF NOT EXISTS idx_scrape_pages_job_status
  ON scrape_pages (job_id, status);

CREATE INDEX IF NOT EXISTS idx_scrape_pages_status_raw
  ON scrape_pages (job_id, created_at)
  WHERE status = 'raw';

CREATE INDEX IF NOT EXISTS idx_scrape_classifications_page_id
  ON scrape_classifications (page_id);

CREATE INDEX IF NOT EXISTS idx_scrape_classifications_unpromoted
  ON scrape_classifications (created_at)
  WHERE promoted_at IS NULL;

-- ─── Table comments ────────────────────────────────────────────────────────────

COMMENT ON TABLE scrape_manifests IS 'Named crawl configs: seed URLs, allowlist/depth rules, optional cron schedule';
COMMENT ON TABLE scrape_jobs IS 'One crawl run per manifest (pending → running → done | failed)';
COMMENT ON TABLE scrape_pages IS 'Per-URL raw extract; promoted rows link to inbox_entries via inbox_entry_id';
COMMENT ON TABLE scrape_classifications IS 'Ollama classifier output before batch promotion to inbox pipeline';

-- ─── RLS (service role writes; authenticated read) ───────────────────────────

ALTER TABLE scrape_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_classifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_scrape_manifests" ON scrape_manifests;
CREATE POLICY "service_role_all_scrape_manifests"
  ON scrape_manifests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_scrape_manifests" ON scrape_manifests;
CREATE POLICY "authenticated_read_scrape_manifests"
  ON scrape_manifests FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role_all_scrape_jobs" ON scrape_jobs;
CREATE POLICY "service_role_all_scrape_jobs"
  ON scrape_jobs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_scrape_jobs" ON scrape_jobs;
CREATE POLICY "authenticated_read_scrape_jobs"
  ON scrape_jobs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role_all_scrape_pages" ON scrape_pages;
CREATE POLICY "service_role_all_scrape_pages"
  ON scrape_pages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_scrape_pages" ON scrape_pages;
CREATE POLICY "authenticated_read_scrape_pages"
  ON scrape_pages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role_all_scrape_classifications" ON scrape_classifications;
CREATE POLICY "service_role_all_scrape_classifications"
  ON scrape_classifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_scrape_classifications" ON scrape_classifications;
CREATE POLICY "authenticated_read_scrape_classifications"
  ON scrape_classifications FOR SELECT
  TO authenticated
  USING (true);
