-- ModMe agent catalog CMS evaluation schema (Dolt)
-- See ADR-0010 — optional; git+Supabase remains primary.
-- Apply after: cd config/dolt/catalog && dolt sql -f schema.sql

CREATE TABLE IF NOT EXISTS agent_catalog_entries (
  id VARCHAR(64) PRIMARY KEY,
  namespace VARCHAR(128) NOT NULL,
  role VARCHAR(32) NOT NULL,
  collection_id VARCHAR(128),
  intelligence_tools JSON,
  status VARCHAR(16) DEFAULT 'active',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS catalog_promotion_queue (
  id VARCHAR(64) PRIMARY KEY,
  source_branch VARCHAR(128) NOT NULL,
  inbox_path VARCHAR(512),
  promoted_to VARCHAR(32),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
