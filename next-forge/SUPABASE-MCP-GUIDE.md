# Supabase + MCP Data Setup Guide

This guide covers setting up local & cloud Supabase with MCP servers, connecting them, and uploading test data.

## Quick Start

### 1. Local Supabase (Already Running ✅)

```powershell
cd next-forge

# Start Supabase (Postgres + REST API + Studio)
bun run db:start

# Check status
bun run db:status
# Output:
# API URL: http://127.0.0.1:54321
# DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
# Studio URL: http://127.0.0.1:54323
```

### 2. Push Prisma Schema to Database

```powershell
cd next-forge
bun run db:push
```

The schema is now synced. You can browse data in Supabase Studio: **http://127.0.0.1:54323**

---

## Uploading Data to Local Supabase

### Method 1: Prisma Seeding Script (Recommended)

**Setup seed script:**

```typescript
// packages/database/prisma/seed.ts
import { PrismaClient } from '../generated';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data (optional)
  await prisma.page.deleteMany();

  // Insert sample data
  const pages = await prisma.page.createMany({
    data: [
      { name: 'Home' },
      { name: 'About' },
      { name: 'Pricing' },
      { name: 'Contact' },
      { name: 'Dashboard' },
    ],
  });

  console.log(`Created ${pages.count} pages`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Add to `packages/database/package.json`:**

```json
{
  "scripts": {
    "seed": "NODE_ENV=development ts-node --require tsconfig-paths/register prisma/seed.ts"
  }
}
```

**Run seed script:**

```powershell
cd packages/database
bun run seed
# Output: Created 5 pages
```

### Method 2: Direct SQL Seeding

**Create seed SQL file:**

```sql
-- supabase/seed.sql
BEGIN;

DELETE FROM "Page";

INSERT INTO "Page" (name) VALUES
  ('Home'),
  ('About'),
  ('Pricing'),
  ('Contact'),
  ('Dashboard');

COMMIT;
```

**Execute via Supabase CLI:**

```powershell
cd next-forge
supabase db push --skip-seed
supabase seed restore  # Run seed.sql
```

**Or directly via psql:**

```powershell
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/seed.sql
# Password: postgres
```

### Method 3: Supabase Client (Runtime Upload)

**In an API route or utility:**

```typescript
// apps/api/src/routes/seed-data.ts
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const supabase = createClient(
    'http://127.0.0.1:54321',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
  );

  const { data, error } = await supabase
    .from('Page')
    .insert([
      { name: 'New Page 1' },
      { name: 'New Page 2' },
    ])
    .select();

  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json(data);
}
```

**Call the endpoint:**

```bash
curl -X POST http://localhost:3102/seed-data
```

---

## Connecting to Cloud Supabase (Hybrid Setup)

### 1. Create Cloud Project

1. Go to https://supabase.com
2. Create a new project (choose your region, e.g., `us-east-1`)
3. Note the project URL and keys:
   - **Project URL:** `https://<project-id>.supabase.co`
   - **anon key:** `eyJ...` (public, safe to expose in frontend)
   - **service_role key:** `eyJ...` (secret, backend only)

### 2. Set Environment Variables

**Local development (`.env.local`):**

```env
# Local Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# For backend access to local Supabase
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

**Production (GitHub Secrets or `.env`):**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# For backend Prisma (cloud Neon or managed Postgres)
DATABASE_URL=postgresql://postgres:...@db.xxx.supabase.co:6543/postgres?schema=public
DIRECT_URL=postgresql://postgres:...@db.xxx.supabase.co:6543/postgres
```

### 3. Push Local Schema to Cloud

```powershell
# Apply migrations to cloud
cd next-forge/packages/database
SUPABASE_URL=https://your-project-id.supabase.co \
SUPABASE_ANON_KEY=eyJ... \
bunx prisma migrate deploy

# Or push schema directly (be careful, rewrites schema)
DATABASE_URL="postgresql://..." bunx prisma db push
```

### 4. Test Connection

```typescript
// test-cloud-supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project-id.supabase.co',
  'eyJ...'
);

const { data, error } = await supabase.from('Page').select('*').limit(1);
console.log(data, error);
```

---

## MCP Server Integration

### 1. Playwright MCP (Visual Testing)

**Install:**

```powershell
npm install -g @modelcontextprotocol/server-playwright
```

**Claude Desktop Configuration:**

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-playwright"]
    }
  }
}
```

**Restart Claude Desktop. Then you can:**

```
@playwright
Take a screenshot of http://localhost:3100/sign-in
Compare with baseline.png
Navigate to the pricing page
```

### 2. Postgres MCP (Database Queries)

**Install:**

```powershell
npm install -g @modelcontextprotocol/server-postgres
```

**Claude Desktop Configuration:**

```json
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

**Usage in Claude:**

```
@postgres
Show me all tables in the public schema
Count rows in the Page table
Insert sample data into Page
```

### 3. Supabase Client Library (Built-in)

No MCP needed — directly use in code:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);
const { data } = await supabase.from('Page').select();
```

---

## Data Models & Schemas

### Current Schema (Prisma)

```prisma
model Page {
  id   Int    @id @default(autoincrement())
  name String
}
```

### Extending the Schema

**Example: Add Users + Pages relationship:**

```prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  pages Page[]
}

model Page {
  id      Int    @id @default(autoincrement())
  name    String
  userId  Int
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Apply changes:**

```powershell
cd packages/database
bun run db:push  # Auto-generate migration if needed
```

---

## Troubleshooting

### Connection Issues

**Symptom:** `ECONNREFUSED: Connection refused at 127.0.0.1:54322`

**Solution:**
```powershell
bun run db:status
bun run db:stop && bun run db:start
docker ps  # Check containers
```

### Data Not Appearing

**Symptom:** Seed script runs but no data in studio

**Solution:**
```powershell
# Check if Prisma generated correctly
cd packages/database
bunx prisma generate
bunx prisma format

# Verify schema was pushed
bun run db:push

# Query directly
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT * FROM \"Page\";"
```

### Local vs. Cloud Confusion

**Keep separate:**
- `.env.local` → local Supabase (dev)
- `.env` or secrets → cloud Supabase (prod)
- Never commit cloud keys to git

---

## Workflow

### Daily Development

```powershell
# Terminal 1: Start Supabase (once)
cd next-forge && bun run db:start

# Terminal 2: Start dev servers
cd .. && yarn dev:forge:core

# Terminal 3: (Optional) Seed data on demand
cd next-forge/packages/database && bun run seed
```

### Before Pushing to Main

```powershell
# Ensure all migrations are created
cd next-forge/packages/database
bun run db:push

# Test seed locally
bun run seed

# Verify with studio
# Open http://127.0.0.1:54323 and check data

# Commit Prisma changes
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: update schema"
```

### Deploying to Production

```powershell
# Apply all pending migrations to cloud
DATABASE_URL="your-cloud-url" bunx prisma migrate deploy

# Or update schema (CAREFUL: no rollback)
DATABASE_URL="your-cloud-url" bunx prisma db push
```

---

## Quick Reference: Local Supabase Credentials

```
API URL: http://127.0.0.1:54321
GraphQL URL: http://127.0.0.1:54321/graphql/v1
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
Inbucket (Email) URL: http://127.0.0.1:54324

JWT secret: super-secret-jwt-token-with-at-least-32-characters-long

anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

---

*Last updated: 2026-06-20*
