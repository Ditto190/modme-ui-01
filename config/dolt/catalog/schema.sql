-- ModMe agent catalog CMS schema (Dolt)
-- See ADR-0013 — Dolt adopted for beads + catalog; Supabase remains product SoR.
-- Apply: yarn dolt:catalog:init  (or: cd config/dolt/catalog && dolt sql -f schema.sql)

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

-- Knowledge doc index (catalog plane only — not product inbox_entries)
CREATE TABLE IF NOT EXISTS knowledge_doc_index (
  id VARCHAR(64) PRIMARY KEY,
  path VARCHAR(512) NOT NULL,
  title VARCHAR(256) NOT NULL,
  classification VARCHAR(32) NOT NULL,
  plane VARCHAR(32) NOT NULL,
  status VARCHAR(16) DEFAULT 'active',
  notes TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
