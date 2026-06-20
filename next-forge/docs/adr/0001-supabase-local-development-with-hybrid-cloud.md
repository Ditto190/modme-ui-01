# ADR-0001: Supabase Local Development with Hybrid Cloud Architecture

## Status

**Accepted**

## Context

The next-forge monorepo requires a modern, developer-friendly database infrastructure that:
- Supports local development without reliance on cloud services (cost, latency, connectivity)
- Provides seamless transition from local to cloud production environments
- Integrates with AI-powered development tools (Copilot, Cursor) via Model Context Protocol (MCP)
- Enables rapid iteration, testing, and data seeding during development
- Reduces operational complexity by combining database, auth, storage, and realtime capabilities
- Replaces legacy Neo database with modern PostgreSQL-based architecture

The team previously maintained Neo as a legacy database. Moving to a unified, modern solution is critical for:
1. Standardizing database technology across the monorepo
2. Enabling developers without Neo expertise to contribute
3. Reducing infrastructure maintenance burden
4. Supporting both local development workflows and cloud deployment

## Decision Drivers

* **Must support local development** without cloud infrastructure dependency
* **Must provide production parity** between local and cloud environments
* **Should integrate with AI tools** (Copilot, Cursor) for enhanced developer experience
* **Should reduce operational complexity** with built-in auth, storage, and realtime
* **Should support rapid data seeding** for testing and development
* **Must maintain cost efficiency** for development and staging environments
* **Should provide migration path** from legacy Neo to modern stack

## Considered Options

### Option 1: Supabase Local + Hybrid Cloud (SELECTED)

**Architecture**: Docker-based local Supabase (dev) + cloud Supabase (prod) with Prisma ORM bridge

**Components**:
- Local PostgreSQL (v15) on port 54322 via Docker
- Local REST API (port 54321), Studio UI (port 54323), Auth, Storage, Realtime
- Prisma ORM for type-safe database access
- MCP servers for Playwright (visual testing) and PostgreSQL (direct queries)
- Genkit integration for AI-powered features (optional)

**Pros**:
- ✅ Zero cloud costs during development
- ✅ Production parity: same database engine and services
- ✅ Docker ensures environment consistency across team
- ✅ Built-in auth, storage, realtime without external services
- ✅ Excellent JSON (JSONB) and full-text search support
- ✅ MCP integration enables AI-assisted development
- ✅ Prisma provides type safety and migrations
- ✅ Supabase community and excellent documentation
- ✅ Migration path: seed data, clone schema to production

**Cons**:
- ⚠️ Requires Docker Desktop installation
- ⚠️ Learning curve for team unfamiliar with Supabase
- ⚠️ PostgreSQL vertical scaling limits (mitigated with read replicas)
- ⚠️ Initial setup complexity (though well-documented)

### Option 2: Self-Managed PostgreSQL + AWS Services

**Architecture**: Local/VM PostgreSQL + AWS RDS (prod) + separate services for Auth (Cognito), Storage (S3), Realtime (custom)

**Pros**:
- Full control over PostgreSQL configuration
- Familiar for teams with AWS expertise
- Mature, battle-tested services

**Cons**:
- ❌ Production mismatch: local PostgreSQL vs. RDS cloud
- ❌ Requires managing multiple AWS services (Auth, Storage, Realtime)
- ❌ Higher operational complexity and maintenance burden
- ❌ Costs for staging/production AWS services
- ❌ No built-in Studio UI for data browsing
- ❌ Difficult to set up MCP integrations without additional tooling
- ❌ Team must learn AWS ecosystem alongside PostgreSQL
- ❌ Steeper learning curve for developers without AWS experience

**Decision**: Rejected due to operational complexity and lack of development parity.

### Option 3: Firebase/Firestore

**Architecture**: Firebase for local development (emulator) + Firestore cloud

**Pros**:
- Quick to set up
- Built-in auth, storage, realtime
- Firebase emulator available

**Cons**:
- ❌ NoSQL (Firestore) fundamentally different from production SQL (different query patterns)
- ❌ Not suitable for complex transactional workloads (e-commerce, payments)
- ❌ Firebase emulator incomplete feature parity
- ❌ Higher cloud costs at scale
- ❌ Vendor lock-in
- ❌ Limited MCP integration support
- ❌ Team has no existing Firebase expertise

**Decision**: Rejected due to lack of production parity and suitability for transactional workloads.

### Option 4: Keep Neo (Legacy)

**Architecture**: Continue Neo as primary database

**Pros**:
- No migration required
- Team has experience with Neo

**Cons**:
- ❌ Neo is deprecated/EOL
- ❌ No new features or security updates
- ❌ Limited developer tooling and community support
- ❌ Difficult to hire developers familiar with Neo
- ❌ No cloud-ready migration path
- ❌ No AI/MCP integration support
- ❌ Increased security risk over time

**Decision**: Rejected. Migration away from Neo is strategic objective.

## Decision

**Adopt Supabase Local Development with Hybrid Cloud Architecture** as the primary database infrastructure for next-forge.

**Key commitments**:
1. Run Supabase locally via Docker for all development
2. Use Prisma ORM as the data access layer (type safety, migrations)
3. Configure hybrid local+cloud setup for seamless production deployment
4. Integrate MCP servers (Playwright, PostgreSQL) for AI-assisted development
5. Establish standard data seeding workflow using Prisma seed scripts
6. Create migration path for any legacy Neo data

## Rationale

### Why Supabase?

**1. Development Parity**
- Local Docker Supabase runs identical PostgreSQL version and services as cloud
- No "works locally, fails in production" surprises
- Developers can test auth, storage, and realtime locally

**2. Operational Simplicity**
- Single platform (Supabase) handles: Database, Auth, Storage, Realtime, Edge Functions
- No need to manage multiple AWS services
- Reduces cognitive load for developers
- Single vendor relationship simplifies support

**3. AI-Assisted Development**
- MCP servers enable direct database queries in Copilot/Cursor
- Playwright MCP for visual testing and screenshot verification
- Genkit integration for AI-powered features (LLM functions, RAG)
- Enhanced developer productivity through intelligent tools

**4. Cost Efficiency**
- Free local development (Docker only)
- Predictable cloud costs with pay-as-you-go pricing
- No staging environment costs initially
- Supabase free tier supports small teams

**5. Type Safety**
- Prisma ORM generates TypeScript types from schema
- Catch database errors at compile time
- Self-documenting code via type hints
- Migrations are version-controlled and testable

**6. Team Enablement**
- Excellent documentation and community support
- Modern DX (Developer Experience) mindset
- Easy onboarding for new team members
- Strong ecosystem of tools and libraries

### Why Not Alternatives?

- **AWS RDS + Services**: Higher complexity, production mismatch, requires AWS expertise
- **Firebase**: NoSQL mismatch with transactional needs, not production parity
- **Keep Neo**: EOL, no migration path, legacy tooling

## Implementation

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Development Environment                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  next-forge Apps                  GitHub Copilot / Cursor    │
│  (app, web, api)                        │                    │
│       │                                 │                    │
│       └─────────────┬───────────────────┘                    │
│                     │                                         │
│          ┌──────────▼──────────┐                             │
│          │  Prisma ORM (types) │                             │
│          └──────────┬──────────┘                             │
│                     │                                         │
│    ┌────────────────┼────────────────┐                       │
│    │                │                │                       │
│    ▼                ▼                ▼                       │
│  REST API      PostgreSQL (local)  MCP Servers              │
│  (54321)          (54322)         Playwright                │
│                                   Postgres                   │
│    └────────────────┬────────────────┘                       │
│                     │                                         │
│  ┌─────────────────▼──────────────────┐                     │
│  │    Supabase Local (Docker)         │                     │
│  │  ├─ Auth (JWT, RLS)                │                     │
│  │  ├─ Storage (file uploads)         │                     │
│  │  ├─ Realtime (WebSocket subscriptions)                   │
│  │  ├─ Studio UI (54323)              │                     │
│  │  └─ Postgres Functions             │                     │
│  └─────────────────────────────────────┘                    │
│           │                                                   │
│           │ (Deploy to production)                           │
│           ▼                                                   │
│  ┌─────────────────────────────────┐                        │
│  │  Supabase Cloud (Production)    │                        │
│  │  Same services, same schema     │                        │
│  └─────────────────────────────────┘                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Setup & Configuration

#### Prerequisites
- Docker Desktop installed and running
- Bun package manager (next-forge standard)
- Git for version control
- 2+ GB free disk space (Docker images)

#### Local Setup Commands

```powershell
# 1. Navigate to next-forge
cd next-forge

# 2. Start Supabase local
bun run db:start
# Waits ~45s for containers to initialize
# Creates: PostgreSQL (54322), API (54321), Studio (54323)

# 3. Verify status
bun run db:status
# Output includes URLs and API keys

# 4. Push Prisma schema to local database
bun run db:push
# Syncs schema.prisma with local PostgreSQL

# 5. Seed initial data (optional)
bun run seed
# Runs packages/database/prisma/seed.ts
```

#### Configuration Files

**`.env.local` (Development)**
```env
# Local Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

**`.env` (Production - Cloud)**
```env
# Cloud Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production-key>
DATABASE_URL=postgresql://postgres:<password>@<host>:<port>/postgres
DIRECT_URL=postgresql://postgres:<password>@<host>:<port>/postgres
```

**`next-forge/supabase/config.toml` (Local Configuration)**
```toml
project_id = "next-forge"

[db]
port = 54322
major_version = 15

[api]
port = 54321

[studio]
port = 54323
```

### Data Seeding Strategy

**Method 1: Prisma Seed Script (Recommended)**
- Location: `packages/database/prisma/seed.ts`
- Approach: TypeScript script with Prisma client
- Trigger: `bun run seed`
- Advantages: Version-controlled, type-safe, reproducible

```typescript
// packages/database/prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pages = await prisma.page.createMany({
    data: [
      { name: 'Home' },
      { name: 'About Us' },
      { name: 'Pricing' },
    ],
  });
  console.log(`Created ${pages.count} pages`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

**Method 2: SQL Seed File**
- Location: `next-forge/supabase/seed.sql`
- Approach: Raw SQL INSERT statements
- Trigger: `supabase db execute --file supabase/seed.sql`
- Advantages: Direct control, database-agnostic format

**Method 3: REST API (Runtime)**
- Endpoint: `http://127.0.0.1:54321/rest/v1/<table>`
- Headers: `Authorization: Bearer <anon-key>`, `Content-Type: application/json`
- Method: POST with JSON payload
- Advantages: Can seed during application runtime

#### Example Seed Data (6 sample pages)

```sql
BEGIN;
DELETE FROM "Page";
INSERT INTO "Page" (name) VALUES
  ('Home'),
  ('About Us'),
  ('Features'),
  ('Pricing'),
  ('Documentation'),
  ('Contact');
COMMIT;
```

### MCP Integration

**Playwright MCP (Visual Testing)**
```bash
# Install
npm install -g @modelcontextprotocol/server-playwright

# Configuration (claude_desktop_config.json)
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-playwright"]
    }
  }
}
```

**Postgres MCP (Direct Database Queries)**
```bash
# Install
npm install -g @modelcontextprotocol/server-postgres

# Configuration
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
      }
    }
  }
}
```

**Usage in Copilot/Cursor**
- Query database: `@postgres SELECT * FROM Page WHERE name ILIKE '%home%'`
- Take screenshot: `@playwright await page.screenshot({ path: 'home.png' })`
- Test UI: `@playwright await page.goto('http://localhost:3100'); await page.fill('input[name="email"]', 'test@example.com')`

## Consequences

### Positive Consequences

✅ **Zero local development cost**: Docker only, no cloud infrastructure
✅ **Production parity**: Identical database and services locally and in production
✅ **Reduced complexity**: Single platform (Supabase) vs. multiple AWS services
✅ **Faster iteration**: Local database, no network latency
✅ **AI-assisted development**: MCP integration with Copilot/Cursor
✅ **Team enablement**: Clear setup process, excellent documentation
✅ **Easy onboarding**: New developers can be productive in minutes
✅ **Type safety**: Prisma ORM generates TypeScript types
✅ **Version control**: Migrations tracked in git
✅ **Reversibility**: Can roll back migrations, update schemas

### Negative Consequences

⚠️ **Docker dependency**: Requires Docker Desktop (17GB typical install)
⚠️ **Learning curve**: Team must learn Supabase, PostgreSQL, Prisma concepts
⚠️ **Initial setup time**: First-time Supabase initialization (~2-3 minutes)
⚠️ **Port conflicts**: Docker ports (54321-54324) must be available
⚠️ **Storage growth**: PostgreSQL storage will grow with usage (mitigated with cleanup/truncation)
⚠️ **Performance for large datasets**: Local development may be slower with large data volumes
⚠️ **Memory overhead**: Docker containers consume ~1-2GB RAM

### Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Docker not running | No database access | Document startup process, add CI check for Docker |
| Port conflicts (54321-54324 in use) | Cannot start Supabase | Script to find conflicting process, user documentation |
| Schema drift (local ≠ cloud) | Production bugs | Enforce migrations via git, PR review process |
| Data loss during development | Lost test data | Seed data is stored in `seed.ts` (version-controlled), backup scripts |
| PostgreSQL version mismatch | Local ≠ cloud behavior | Both use PostgreSQL 15, same major version |
| Team lacks PostgreSQL knowledge | Reduced productivity | Training sessions, documentation, pair programming |
| Network latency when adding features | Slower feedback loop | Runs locally, minimal latency |

## Implementation Roadmap

### Phase 1: Local Setup (Week 1) ✅ COMPLETE
- ✅ Docker Supabase running locally
- ✅ Prisma schema synced
- ✅ Sample data seeded (6 pages via REST API)
- ✅ Documentation complete (this ADR + SUPABASE-MCP-GUIDE.md)
- ✅ MCP server setup documented

### Phase 2: Team Onboarding (Week 2)
- [ ] Distribute setup guide to team
- [ ] Run hands-on training session
- [ ] Establish data seeding conventions
- [ ] Create troubleshooting guide

### Phase 3: Cloud Deployment (Week 3)
- [ ] Create production Supabase project
- [ ] Test migration from local to cloud
- [ ] Set up CI/CD pipelines for schema migrations
- [ ] Document cloud deployment process

### Phase 4: MCP Integration (Week 4)
- [ ] Install Playwright MCP on team machines
- [ ] Install Postgres MCP on team machines
- [ ] Document Copilot/Cursor MCP usage
- [ ] Create example queries and workflows

### Phase 5: Monitoring & Optimization (Ongoing)
- [ ] Monitor local Supabase usage patterns
- [ ] Optimize slow queries
- [ ] Track Docker resource usage
- [ ] Gather team feedback and iterate

## Related Decisions

- **ADR-0002** (future): Prisma ORM Selection (complements this decision)
- **ADR-0003** (future): Authentication Strategy (uses Supabase Auth)
- **ADR-0004** (future): Data Seeding and Fixtures (implements methods from this ADR)
- **Deployment ADR** (future): Cloud deployment strategy (uses Supabase production)

## Technical Specification

### Database Schema (Initial)

```sql
-- packages/database/prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Page {
  id    Int     @id @default(autoincrement())
  name  String  @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Port Allocations

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 54322 | Direct database connection |
| REST API | 54321 | HTTP API (Supabase auto-generated) |
| GraphQL | 54321 | GraphQL endpoint (same port, `/graphql/v1`) |
| Studio UI | 54323 | Web UI for data browsing/management |
| Inbucket | 54324 | Email testing (local SMTP) |

### Credentials (Local Development Only)

```
JWT Secret: super-secret-jwt-token-with-at-least-32-characters-long
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
Service Role: eyJhbGciOiJIUzI1NiIsInR5cCI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

## Commands Reference

```powershell
# Database Management
bun run db:start              # Start Supabase
bun run db:stop               # Stop Supabase
bun run db:status             # Check status
bun run db:logs               # View logs

# Schema Management
bun run db:push               # Sync schema to database
bun run migrate:dev           # Create new migration
bun run migrate:reset         # Reset database to schema
bun run prisma:studio         # Open Prisma Studio UI

# Data Management
bun run seed                  # Run seed script
bun run seed:reset            # Reset and seed database

# Development
yarn dev:forge                # Start all dev servers
yarn dev:forge:core           # Start app + web + api only
```

## References

- **Supabase Docs**: https://supabase.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs
- **MCP (Model Context Protocol)**: https://modelcontextprotocol.io
- **Next.js**: https://nextjs.org/docs

## Related Documentation

- **Setup Guide**: `next-forge/SUPABASE-MCP-GUIDE.md` — Comprehensive setup and integration guide
- **Copilot Instructions**: `.github/copilot-instructions.md` — MCP setup and troubleshooting
- **Setup Summary**: `SUPABASE-MCP-SETUP-COMPLETE.md` — Quick reference and status

## GitHub Repository

- **Repository**: https://github.com/Ditto190/modme-ui-01
- **Branch**: `chore/agent-tooling-and-ci`
- **Related Files**:
  - `.github/copilot-instructions.md` — MCP and troubleshooting docs
  - `next-forge/SUPABASE-MCP-GUIDE.md` — Comprehensive setup guide
  - `next-forge/packages/database/prisma/schema.prisma` — Schema definition
  - `next-forge/supabase/config.toml` — Local Supabase configuration
  - `next-forge/seed-data.sql` — SQL seed template

## Challenges & Resolution

### Challenge 1: Docker Installation & Compatibility
**Problem**: Team members may not have Docker Desktop or may face installation issues
**Resolution**: 
- Document system requirements (macOS 11+, Windows 10 Pro+, Linux)
- Provide installation links for each OS
- Create troubleshooting guide for common Docker issues
- Consider alternative: Cloud-only fallback for developers without Docker

### Challenge 2: PostgreSQL Learning Curve
**Problem**: Team may lack PostgreSQL expertise (coming from Neo or other databases)
**Resolution**:
- Host training session on PostgreSQL basics and Supabase features
- Create quick reference guides (JSON, full-text search, window functions)
- Encourage pair programming for first schema modifications
- Maintain comprehensive documentation and examples

### Challenge 3: Port Conflicts
**Problem**: If ports 54321-54324 are in use, Supabase won't start
**Resolution**:
- Document how to find and kill conflicting processes
- Create helper script to automatically find and report conflicts
- Document how to change Supabase ports in `supabase/config.toml` if needed

### Challenge 4: Schema Drift (Local ≠ Cloud)
**Problem**: Local and cloud databases can get out of sync
**Resolution**:
- Enforce migrations via git: all schema changes go through `prisma migrate`
- Require peer review of migrations before merge
- Implement CI check to validate migrations
- Document schema synchronization procedures

### Challenge 5: Team Adoption
**Problem**: Team may be hesitant to migrate from Neo/existing setup
**Resolution**:
- Demonstrate benefits with concrete examples (faster local iteration, AI tools)
- Provide clear migration timeline and support
- Show cost savings (free local dev, predictable cloud pricing)
- Document Neo data migration path (if applicable)

### Challenge 6: Performance with Large Data
**Problem**: Local PostgreSQL may be slow with large datasets (millions of rows)
**Resolution**:
- Use representative but smaller data subsets for development
- Create data generation/truncation scripts for testing
- Document performance optimization techniques (indexes, partitioning)
- Consider connection pooling (PgBouncer) for high concurrency testing

## Lessons Learned (Post-Implementation)

*To be updated after 4-week implementation period.*

- [ ] Team onboarding time and feedback
- [ ] Performance observations in development
- [ ] Docker compatibility issues encountered
- [ ] Supabase feature usage patterns
- [ ] Schema migration patterns and issues
- [ ] Data seeding strategy effectiveness

## Approval & Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Lead Architect | - | 2026-06-20 | Proposed |
| Team Lead | - | - | Pending |
| Infrastructure | - | - | Pending |

---

**ADR Created**: 2026-06-20  
**Last Updated**: 2026-06-20  
**Status**: Accepted  
**Version**: 1.0
