# TypeScript Fullstack Template

Modern PERN stack monorepo for rapid prototyping and production applications with Turborepo, Biome, strict type safety, and composable deployment across web, API, agents, and shared packages.

## 🚀 Quick Start

```bash
# Prerequisites: Docker Desktop running

# 1. Clone and install
cp -r /path/to/ts-fullstack my-app
cd my-app
yarn install

# 2. Setup environment
cp .env.example .env
# Edit .env if needed (defaults work for local dev)

# 3. Start local database
yarn docker:up

# 4. Setup database
yarn db:push              # Push schema to database
yarn db:seed              # Seed with test data

# 5. Start development (all services with Turbo)
yarn dev                  # Start API + Web + Agent (parallel)
# Or run separately:
yarn dev:api              # API only (http://localhost:3000)
yarn dev:web              # Web only (http://localhost:5173)
yarn dev:agent            # Agent only (http://localhost:3001)

# 6. Verify quality
yarn build                # Turbo: build all packages
yarn lint:check           # Biome: 0 warnings enforced
yarn test                 # Vitest: all tests must pass
```

## 📦 Stack

**Frontend:**
- React 18 + TypeScript
- Vite (fast dev + HMR)
- TanStack Query (data fetching)
- React Router (routing)
- Tailwind CSS + Shared UI Components (`@adaptiveworx/ui`)

**Backend:**
- Fastify (high-performance HTTP)
- Drizzle ORM (type-safe SQL)
- PostgreSQL 17 (via Docker)
- Redis (caching/sessions)
- Zod (runtime validation)

**Agent Services:**
- LLM/worker orchestration (`@adaptiveworx/agent`)
- MCP-compatible tool structure
- Multi-step workflows

**Developer Experience:**
- **Turborepo** - Incremental builds, remote caching, smart DAG execution
- **Biome** - 100x faster linting + formatting (replaces ESLint + Prettier)
- **Yarn 4 node-modules** - Better compatibility with IaC/Docker
- **TypeScript strict mode** (@tsconfig/strictest)
- **ESM-first** (NodeNext)
- **Monorepo workspaces** (apps, packages, envs)

## 📂 Structure

```
ts-fullstack/
├── apps/
│   ├── api/                  # @adaptiveworx/api - Fastify API server
│   │   ├── src/routes/       # API route handlers
│   │   └── package.json
│   ├── web/                  # @adaptiveworx/web - React frontend (Vite)
│   │   ├── src/components/
│   │   └── package.json
│   └── [future: admin, mobile-web, etc.]
├── packages/
│   ├── db/                   # @adaptiveworx/db - Drizzle ORM, schemas
│   │   ├── src/schema/       # Table definitions
│   │   ├── client.ts         # Database client
│   │   └── seed.ts
│   ├── shared/               # @adaptiveworx/shared - Common types, utils
│   │   ├── src/config/       # Secrets manager (Infisical)
│   │   ├── src/types/
│   │   └── src/utils/
│   ├── ui/                   # @adaptiveworx/ui - Shared React components
│   │   ├── src/components/   # Button, Input, Card, etc.
│   │   └── src/styles/       # Tailwind globals
│   └── agent/                # @adaptiveworx/agent - LLM/worker services
│       ├── src/tools/        # Agent tools (MCP or custom)
│       └── src/workflows/    # Multi-step orchestrations
├── envs/                     # Environment-specific configs
│   ├── dev/                  # Development (local + cloud dev)
│   ├── stg/                  # Staging (pre-production)
│   └── prd/                  # Production
├── .github/workflows/        # CI/CD pipelines
├── turbo.json                # Turborepo pipeline config
├── biome.json                # Biome linter + formatter config
└── package.json              # Root monorepo scripts
```

## 🎯 Use Cases

- **Rapid Prototyping**: Full-stack app in < 5 minutes
- **AI-First Apps**: Agent package ready for LLM orchestration
- **Multi-Environment Deploys**: Dev/Stg/Prd version pinning
- **Paired Programming**: Vibe-coding with candidates
- **Hackathons**: Production patterns, zero setup time
- **Internal Tools**: CRUD apps with type safety
- **MVPs**: Production-ready from day one

## 🛠️ Commands

### Development
```bash
yarn dev                  # Turbo: run all services in parallel
yarn dev:api              # API only (port 3000)
yarn dev:web              # Web only (port 5173)
yarn dev:agent            # Agent only (port 3001)
```

### Database
```bash
yarn db:push              # Push schema changes to database
yarn db:reset             # Drop all tables (destructive!)
yarn db:seed              # Seed with test data
```

### Docker
```bash
yarn docker:up            # Start PostgreSQL + Redis
yarn docker:down          # Stop containers
docker ps                 # Check running containers
```

### Quality (Zero-Tolerance)
```bash
yarn build                # Turbo: build all packages (must pass!)
yarn type-check           # TypeScript compilation (all workspaces)
yarn lint:check           # Biome: 0 warnings enforced
yarn lint:fix             # Biome: auto-fix issues
yarn test                 # Turbo: run all tests
yarn test:coverage        # Coverage reports
```

## 🔒 Quality Standards

**Zero-Tolerance Policies:**
- ✅ 0 TypeScript errors
- ✅ 0 Biome warnings
- ✅ All tests passing
- ✅ Strict mode enabled (@tsconfig/strictest)

**Enforced via:**
- `exactOptionalPropertyTypes: true` - Catch undefined edge cases
- `noUncheckedIndexedAccess: true` - Array/object safety
- `noPropertyAccessFromIndexSignature: true` - Explicit property access
- Turborepo caching validates all checks before build

## 🌍 Environment Configuration

### Local Development
Uses root `.env` file and local Docker services.

### Environment Pinning (Dev/Stg/Prd)
Each environment pins specific package versions:

```json
// envs/prd/package.json
{
  "dependencies": {
    "@adaptiveworx/api": "0.2.0",
    "@adaptiveworx/web": "0.2.0",
    "@adaptiveworx/agent": "0.1.5"
  }
}
```

**Version Promotion Flow:**
1. Test in `envs/dev` with latest versions
2. Promote to `envs/stg` for validation
3. Promote to `envs/prd` for production release

See [envs/README.md](envs/README.md) for details.

## 🗄️ Database Patterns

### Schema Definition (Drizzle)
```typescript
// packages/db/src/schema/users.ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export type User = typeof users.$inferSelect;
```

### API Routes (Type-Safe)
```typescript
// apps/api/src/routes/users.ts
import { db } from "@adaptiveworx/db";
import { users, insertUserSchema } from "@adaptiveworx/db";

server.get("/api/users", async () => {
  const allUsers = await db.select().from(users);
  return { users: allUsers };
});

server.post("/api/users", async (request) => {
  const data = insertUserSchema.parse(request.body);
  const [user] = await db.insert(users).values(data).returning();
  return { user };
});
```

## 🎨 UI Components

Shared component library in `@adaptiveworx/ui`:

```typescript
// apps/web/src/pages/MyPage.tsx
import { Button, Card, CardHeader, CardTitle, CardContent } from '@adaptiveworx/ui';

export function MyPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default">Get Started</Button>
      </CardContent>
    </Card>
  );
}
```

## 🤖 Agent Services

```typescript
// packages/agent/src/tools/example-tool.ts
import { z } from 'zod';

export const exampleTool = {
  name: 'fetch_user_data',
  description: 'Fetches user data from the database',
  parameters: z.object({
    userId: z.string().uuid(),
  }),
  execute: async ({ userId }) => {
    const user = await db.select().from(users).where(eq(users.id, userId));
    return user[0];
  },
};
```

## 🚢 CI/CD

### GitHub Actions Workflows

**.github/workflows/ci.yml** - PR quality checks:
- Type checking (Turbo)
- Linting (Biome)
- Testing (Vitest)
- Building (Turbo with remote cache)

**.github/workflows/deploy.yml** - Multi-environment deploys:
- Triggered on version tags (`v*.*.*`)
- Matrix strategy for dev/stg/prd
- Focused workspace installs
- Pulumi infrastructure deployment

### Turborepo Remote Caching
```yaml
- name: Restore Turbo cache
  uses: actions/cache@v4
  with:
    path: .turbo
    key: turbo-${{ runner.os }}-${{ github.sha }}
```

## 🌐 Environment Variables

Copy `.env.example` to `.env`:

```bash
# Database (Docker local)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fullstack_dev

# API Server
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development

# Agent Server
AGENT_PORT=3001

# Infisical (optional - for production secrets)
INFISICAL_PROJECT_SLUG=your-project
INFISICAL_APPS_PROJECT_ID=your-project-id
```

## 🤝 Collaboration Workflow

This template follows the **5-Step Agentic Workflow**:

1. **Collaborate on Objectives** - Discuss what to build
2. **Agree on Architecture** - Plan stacks/components
3. **Agent Handles Dev/Test** - Claude writes code, runs builds/tests, delivers 100% clean
4. **User Handles Environment** - User manages Docker/deployments
5. **Review Together** - Both review results

**Agent responsibilities:**
- ✅ Write TypeScript code across all packages
- ✅ Run `yarn build` - fix ALL errors
- ✅ Run `yarn lint:check` - fix ALL warnings
- ✅ Run `yarn test` - fix ALL failures
- ✅ Deliver 100% clean code

**User responsibilities:**
- ✅ Manage Docker containers
- ✅ Run database migrations
- ✅ Review/approve changes
- ✅ Deploy to environments

## 📖 Key Files

- **`turbo.json`** - Turborepo pipeline definitions
- **`biome.json`** - Linting and formatting rules
- **`.env.example`** - Environment variable template
- **`docker-compose.yml`** - Local PostgreSQL 17 + Redis
- **`tsconfig.json`** - Strict TypeScript configuration
- **`packages/*/package.json`** - Individual package configs
- **`envs/*/package.json`** - Environment version pinning

## 🔧 Troubleshooting

**Database connection failed:**
```bash
docker ps | grep postgres
yarn docker:down && yarn docker:up
```

**Port already in use:**
```bash
lsof -ti:3000 | xargs kill -9
# Or change PORT in .env
```

**Turborepo cache issues:**
```bash
rm -rf .turbo
yarn build --force
```

**Type errors with Drizzle:**
- Pattern: `db.insert(table).values(data as typeof table.$inferInsert)`

**Import errors (.js extensions):**
- ESM + NodeNext requires `.js` extensions in imports
- Even for `.ts` files: `import { foo } from "./bar.js"`

## 📄 License

MIT - Built for 100% agentic development by AdaptiveWorX
