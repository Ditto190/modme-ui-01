-- Catalogue registry: unified addressable items for agents, skills, components
-- Run AFTER Prisma db:push creates catalogue_items + catalogue_popularity_snapshots
-- Adds FK from eval_catalogue_scores → catalogue_items and seed data for web catalog

-- FK from eval pipeline to catalogue registry
ALTER TABLE eval_catalogue_scores
  DROP CONSTRAINT IF EXISTS eval_catalogue_scores_catalogue_item_id_fkey;

ALTER TABLE eval_catalogue_scores
  ADD CONSTRAINT eval_catalogue_scores_catalogue_item_id_fkey
  FOREIGN KEY (catalogue_item_id) REFERENCES catalogue_items(id) ON DELETE SET NULL;

-- RLS for catalogue tables
ALTER TABLE catalogue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogue_popularity_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_catalogue_items" ON catalogue_items;
CREATE POLICY "service_role_all_catalogue_items"
  ON catalogue_items FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_catalogue_items" ON catalogue_items;
CREATE POLICY "authenticated_read_catalogue_items"
  ON catalogue_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "service_role_all_catalogue_popularity" ON catalogue_popularity_snapshots;
CREATE POLICY "service_role_all_catalogue_popularity"
  ON catalogue_popularity_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_read_catalogue_popularity" ON catalogue_popularity_snapshots;
CREATE POLICY "authenticated_read_catalogue_popularity"
  ON catalogue_popularity_snapshots FOR SELECT TO authenticated USING (true);

-- Seed published agents for web catalog (idempotent via slug)
INSERT INTO catalogue_items (id, item_type, slug, name, description, status, metadata, popularity_score, published_at, created_at, updated_at)
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    'agent',
    'code-reviewer-agent',
    'Code Reviewer Agent',
    'Analyzes code for quality, security, and best practices',
    'published',
    '{"tools":["linter","type-checker","security-scanner"]}'::jsonb,
    0.92,
    now(),
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'agent',
    'api-designer-agent',
    'API Designer Agent',
    'Designs RESTful APIs and OpenAPI specifications',
    'published',
    '{"tools":["schema-validator","api-tester","documentation-generator"]}'::jsonb,
    0.88,
    now(),
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'agent',
    'test-strategy-agent',
    'Test Strategy Agent',
    'Plans and generates test cases for comprehensive coverage',
    'published',
    '{"tools":["test-generator","coverage-analyzer","mutation-tester"]}'::jsonb,
    0.85,
    now(),
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'agent',
    'performance-optimizer-agent',
    'Performance Optimizer',
    'Identifies and fixes performance bottlenecks',
    'published',
    '{"tools":["profiler","bundle-analyzer","metric-tracker"]}'::jsonb,
    0.90,
    now(),
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'agent',
    'documentation-agent',
    'Documentation Agent',
    'Creates comprehensive documentation and guides',
    'published',
    '{"tools":["markdown-generator","diagram-creator","example-builder"]}'::jsonb,
    0.87,
    now(),
    now(),
    now()
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    'agent',
    'authentication-agent',
    'Authentication Agent',
    'Designs and implements authentication and authorization flows',
    'published',
    '{"tools":["oauth-validator","jwt-inspector","session-manager"]}'::jsonb,
    0.91,
    now(),
    now(),
    now()
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  popularity_score = EXCLUDED.popularity_score,
  status = EXCLUDED.status,
  updated_at = now();

COMMENT ON TABLE catalogue_items IS 'Canonical registry for agents, skills, and components (ADR-0010)';
