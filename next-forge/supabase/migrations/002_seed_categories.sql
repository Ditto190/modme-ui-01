-- Migration: 002_seed_categories.sql
-- Seeds the taxonomy tree for inbox entry categorization

INSERT INTO categories (id, name, slug, description, parent_id) VALUES
  -- Root categories
  ('cat-infrastructure', 'Infrastructure', 'infrastructure', 'Database, cloud, deployment, networking', NULL),
  ('cat-frontend', 'Frontend', 'frontend', 'UI components, React, Next.js, CSS, Storybook', NULL),
  ('cat-backend', 'Backend', 'backend', 'APIs, services, business logic, Python/Node.js', NULL),
  ('cat-devops', 'DevOps', 'devops', 'CI/CD, GitHub Actions, Docker, monitoring', NULL),
  ('cat-architecture', 'Architecture', 'architecture', 'System design, ADRs, patterns, decisions', NULL),
  ('cat-research', 'Research', 'research', 'Spikes, investigations, external links, papers', NULL),
  ('cat-components', 'Components', 'components', 'React components, UI patterns, Storybook stories', NULL),
  ('cat-documentation', 'Documentation', 'documentation', 'Docs, guides, READMEs, wikis', NULL),
  ('cat-security', 'Security', 'security', 'Auth, RLS, secrets, vulnerability reports', NULL),
  ('cat-performance', 'Performance', 'performance', 'Bundle size, query optimization, Core Web Vitals', NULL),
  ('cat-testing', 'Testing', 'testing', 'Unit tests, E2E, Playwright, Vitest, mocking', NULL),
  -- Frontend sub-categories
  ('cat-frontend-react', 'React', 'frontend-react', 'React components, hooks, patterns', 'cat-frontend'),
  ('cat-frontend-nextjs', 'Next.js', 'frontend-nextjs', 'App Router, Server Components, routing', 'cat-frontend'),
  ('cat-frontend-design-system', 'Design System', 'frontend-design-system', 'shadcn/ui, Tailwind, tokens', 'cat-frontend'),
  -- Backend sub-categories
  ('cat-backend-api', 'API Design', 'backend-api', 'REST, GraphQL, route handlers, contracts', 'cat-backend'),
  ('cat-backend-database', 'Database', 'backend-database', 'Prisma, Supabase, queries, migrations', 'cat-backend'),
  ('cat-backend-agents', 'AI Agents', 'backend-agents', 'FastAPI agents, AG2, LLM pipelines', 'cat-backend'),
  -- Infrastructure sub-categories
  ('cat-infra-supabase', 'Supabase', 'infra-supabase', 'Supabase config, RLS, storage, pgvector', 'cat-infrastructure'),
  ('cat-infra-mcp', 'MCP Servers', 'infra-mcp', 'Model Context Protocol, tools, servers', 'cat-infrastructure')
ON CONFLICT (id) DO NOTHING;
