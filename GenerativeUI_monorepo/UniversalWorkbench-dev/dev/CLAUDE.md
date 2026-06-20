# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Type: TypeScript Fullstack Monorepo

**Template**: `ts-fullstack`
**Purpose**: Production-ready PERN stack with Turborepo, Biome, and multi-environment deployment
**Target**: Full-stack web applications, AI-powered services, internal tools, MVPs

## Collaboration Workflow

**IMPORTANT**: Claude and the user follow a structured collaboration workflow:

### The 6-Step Process
1. **Collaborate on Objectives** - Discuss and agree on features to build
2. **Define Behavior IDs** - Create semantic taxonomy IDs (e.g., `USER.ROUTE.CREATE`, `API.AUTH.MIDDLEWARE`) - see [.flow/README.md](.flow/README.md)
3. **Agree on Architecture** - Decide on packages (api, web, agent, shared, ui, db) and dependencies
4. **Claude Handles Dev/Test** - Claude writes/tests TypeScript code using TDD and ensures 100% clean code:
   - Add **@behavior headers** to TEST files (source of truth)
   - Write tests FIRST with Given-When-Then structure
   - Implement to make tests pass
   - Co-locate tests with code (*.test.ts next to *.ts)
   - Run `yarn behaviors:sync` - Generate behaviors.json from test files
   - Run `yarn behaviors:validate` - Check taxonomy, dependencies
   - Run `yarn build` - Fix ALL compilation errors
   - Run `yarn lint:check` - Fix ALL linter errors/warnings
   - Run `yarn test` - Fix ALL failing tests
   - Run `yarn behaviors:summary` - Generate dashboards
   - **Deliver 100% clean code** - No errors, no warnings, all tests pass, behaviors documented
5. **User Handles Deployment** - User manages Docker, database migrations, environment promotion
6. **Review Together** - Review integration, API contracts, UI components, behavior registry

### What Claude MUST Do
- Add **@behavior headers** to TEST files only (never in implementation files)
- Follow TDD workflow: Write failing tests → Implement → Tests pass → Sync
- Run `yarn behaviors:sync` after creating/updating @behavior headers
- Co-locate tests with code (*.test.ts next to *.ts)
- Declare explicit behavior dependencies in @behavior headers
- Use semantic taxonomy: DOMAIN.ENTITY.OPERATION (defined in `.flow/taxonomy.yaml`)
- Fix ALL errors/warnings - deliver 100% clean code
- Use shared packages (@adaptiveworx/ui, @adaptiveworx/shared)
- Update Value Hypotheses in `.flow/value-hypotheses.json` when starting new features

### What Claude Must NOT Do
- Skip @behavior headers ("I'll add them later")
- Put @behavior headers in implementation files (they belong in TEST files only)
- Manually edit behaviors.json or dashboard .md files (they're auto-generated)
- Create behaviors without taxonomy discussion
- Run Docker commands (user handles infrastructure)
- Run database migrations in production
- Leave ANY errors, warnings, or failing tests
- Modify envs/*/package.json versions without approval
- Use arbitrary IDs like "FEATURE-1" (use semantic taxonomy)

## Monorepo Structure

### Apps (Deployable Services)
- **@adaptiveworx/api** - Fastify API server (apps/api)
- **@adaptiveworx/web** - React + Vite frontend (apps/web)
- **@adaptiveworx/agent** - AI agent service with MCP tools (apps/agent)

### Packages (Shared Libraries)
- **@adaptiveworx/db** - Drizzle ORM schemas and database client
- **@adaptiveworx/shared** - Common types, utilities, config, Infisical integration
- **@adaptiveworx/ui** - Shared React components (Button, Input, Card, etc.)

### Environments
- **envs/dev** - Development environment version pinning
- **envs/stg** - Staging environment version pinning
- **envs/prd** - Production environment version pinning

## Essential Commands

### Build & Validation (Turborepo)
\`\`\`bash
yarn build              # Turbo: Build all packages with caching
yarn build --force      # Force rebuild (ignore cache)
yarn type-check         # TypeScript compilation check (all workspaces)
yarn lint:check         # Biome: Lint all files (0 warnings enforced)
yarn lint:fix           # Biome: Auto-fix linting issues
yarn test               # Turbo: Run all Vitest tests
yarn test:coverage      # Generate coverage reports
\`\`\`

### Development
\`\`\`bash
yarn dev                # Turbo: Start all services in parallel (api + web + agent)
yarn dev:api            # API only (port 3000)
yarn dev:web            # Web only (port 5173)
yarn dev:agent          # Agent only (port 3001)
\`\`\`

### Database
\`\`\`bash
yarn db:push            # Push Drizzle schema changes to database
yarn db:reset           # Drop all tables (destructive!)
yarn db:seed            # Seed with test data
\`\`\`

### Docker (User Managed)
\`\`\`bash
yarn docker:up          # Start PostgreSQL + Redis
yarn docker:down        # Stop containers
\`\`\`

## Architecture Overview

### Package Dependencies

\`\`\`
@adaptiveworx/api
  ├── @adaptiveworx/db
  ├── @adaptiveworx/shared
  └── fastify, drizzle-orm, zod

@adaptiveworx/web
  ├── @adaptiveworx/ui
  ├── @adaptiveworx/shared
  └── react, vite, tanstack-query

@adaptiveworx/agent
  ├── @adaptiveworx/db
  ├── @adaptiveworx/shared
  └── fastify, zod

@adaptiveworx/ui
  └── react, tailwindcss, clsx

@adaptiveworx/shared
  ├── @adaptiveworx/db
  └── zod, @infisical/sdk

@adaptiveworx/db
  └── drizzle-orm, postgres
\`\`\`

### File Organization Pattern

\`\`\`
apps/api/
  src/
    routes/           # API endpoints
      users.ts        # GET/POST /api/users
      posts.ts
    index.ts          # Fastify server setup

apps/web/
  src/
    pages/            # React Router pages
      UsersPage.tsx
    lib/              # API client, utilities
    App.tsx

packages/db/
  src/
    schema/           # Drizzle table definitions
      users.ts
      posts.ts
    client.ts         # Database connection
    seed.ts           # Seed data

packages/ui/
  src/
    components/
      button/         # Button component + tests
      input/
      card/
    utils/
      cn.ts           # Tailwind class merger

apps/agent/
  src/
    tools/            # MCP-compatible tools
    workflows/        # Multi-step orchestrations
    index.ts          # Agent server
\`\`\`

## Important Patterns

### Turborepo Caching
Turbo caches task outputs based on inputs. If nothing changed, tasks are skipped:
\`\`\`bash
yarn build          # First run: builds everything
yarn build          # Second run: all cached, instant
\`\`\`

Cache is stored in \`.turbo/\` and shared across CI/CD via GitHub Actions cache.

### Biome Linting & Formatting
Replaces ESLint + Prettier with a single, fast tool:
\`\`\`bash
yarn lint:check     # Check for issues
yarn lint:fix       # Auto-fix issues
\`\`\`

Configuration in \`biome.json\`:
- **0 warnings enforced** - No exceptions
- **Organized imports** - Auto-sorts imports
- **Tailwind-aware** - Handles CSS correctly

### Cross-Package Imports
Use package names, not relative paths:

\`\`\`typescript
// ✅ CORRECT - Use package imports
import { db } from '@adaptiveworx/db';
import { users } from '@adaptiveworx/db';
import { Button } from '@adaptiveworx/ui';
import { validateInput } from '@adaptiveworx/shared/validation';

// ❌ WRONG - Don't use relative paths across packages
import { db } from '../../../packages/db/src/client';
\`\`\`

### ESM + NodeNext Imports
Always use \`.js\` extensions, even for \`.ts\` files:

\`\`\`typescript
// ✅ CORRECT
import { api } from './lib/api.js';
import { Button } from './components/Button.js';

// ❌ WRONG
import { api } from './lib/api';
import { Button } from './components/Button';
\`\`\`

### UI Component Usage

\`\`\`typescript
// apps/web/src/pages/UsersPage.tsx
import { Card, CardHeader, CardTitle, CardContent, Button } from '@adaptiveworx/ui';

export function UsersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default" onClick={handleClick}>
          Add User
        </Button>
      </CardContent>
    </Card>
  );
}
\`\`\`

### Database Type Safety (Drizzle)

\`\`\`typescript
// packages/db/src/schema/users.ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
\`\`\`

### API Route Pattern

\`\`\`typescript
// apps/api/src/routes/users.ts
import { db } from '@adaptiveworx/db';
import { users, insertUserSchema } from '@adaptiveworx/db';

export async function userRoutes(server: FastifyInstance) {
  server.get('/api/users', async () => {
    const allUsers = await db.select().from(users);
    return { users: allUsers };
  });

  server.post('/api/users', async (request) => {
    const data = insertUserSchema.parse(request.body);
    const [user] = await db.insert(users).values(data).returning();
    return { user };
  });
}
\`\`\`

### Testing Pattern with @behavior Headers
Co-locate tests with source files and use @behavior headers:

\`\`\`typescript
// packages/ui/src/components/button/Button.test.tsx
/**
 * @behavior UI.COMPONENT.BUTTON
 * @priority HIGH
 * @effort SMALL
 * @theme EXPERIENCE
 * @persona DEVELOPER
 * @layer UI
 *
 * @why
 * Provide reusable Button component for consistent UI interactions
 *
 * @who
 * As a frontend developer, I want a reusable Button component
 * so that I can build consistent UIs quickly
 *
 * @what
 * Given: Developer needs to render a button
 * When: They import and use <Button> component
 * Then: Button renders with correct styles and accessibility
 *
 * @acceptance
 * - [x] Button renders with default variant
 * - [x] Button supports size variants
 * - [x] Button is accessible
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './Button.js';

describe('UI.COMPONENT.BUTTON', () => {
  describe('Given: Developer needs to render a button', () => {
    it('When: Default props used, Then: Button renders correctly', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });
  });
});
\`\`\`

## Environment Management

### Local Development
Uses root \`.env\` file:
\`\`\`bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fullstack_dev
PORT=3000
AGENT_PORT=3001
\`\`\`

### Environment Pinning
Each environment in \`envs/{dev,stg,prd}\` pins package versions:

\`\`\`json
// envs/prd/package.json
{
  "dependencies": {
    "@adaptiveworx/api": "0.2.0",
    "@adaptiveworx/web": "0.2.0",
    "@adaptiveworx/agent": "0.1.5"
  }
}
\`\`\`

**Promotion Flow:**
1. Test in dev with latest versions
2. Update \`envs/stg/package.json\` to promote to staging
3. Validate in staging
4. Update \`envs/prd/package.json\` to promote to production

## Known Issues & Workarounds

1. **Turborepo cache stale**: Run \`rm -rf .turbo && yarn build --force\`
2. **Type errors with Drizzle**: Use type assertion: \`values(data as typeof table.$inferInsert)\`
3. **Biome vs ESLint differences**: Biome is stricter - embrace it for better code quality
4. **Yarn workspace resolution**: Use \`workspace:*\` for local package dependencies

## Quality Standards

### Type Safety
- **Strict TypeScript** - @tsconfig/strictest enabled
- **Explicit return types** - All functions must declare return types
- **No \`any\` types** - Use \`unknown\` and narrow with type guards
- **Strict null checks** - Always handle undefined/null explicitly

### Testing
- **Co-located tests** - \`*.test.ts\` next to source
- **Vitest** - Fast, ESM-native test runner
- **Coverage thresholds** - Enforced per package
- **Test naming** - Descriptive \`it('should ...')\` format

### Code Quality
- **Zero warnings** - Biome must pass with 0 warnings
- **Organized imports** - Auto-sorted by Biome
- **Named exports** - Prefer named exports over default
- **Single responsibility** - Each module has one clear purpose

## Behavior Management Quick Reference

### Structure
\`\`\`
<DOMAIN>.<ENTITY>.<OPERATION>[.<QUALIFIER>]*

Examples: USER.ROUTE.CREATE, API.AUTH.MIDDLEWARE, DB.SCHEMA.USERS
\`\`\`

### Standard Domains
**API** | **WEB** | **DB** | **UI** | **SHARED** | **AGENT** | **INFRA** | **TEST** | **BUILD**

### Standard Operations
**CREATE** | **READ** | **UPDATE** | **DELETE** | **LIST** | **IMPLEMENT** | **TEST** | **VALIDATE** | **COMPILE** | **DEPLOY**

### @behavior Header Template (TEST FILES ONLY)
\`\`\`typescript
/**
 * @behavior DOMAIN.ENTITY.OPERATION
 * @priority CRITICAL|HIGH|MEDIUM|LOW
 * @effort TRIVIAL|SMALL|MEDIUM|LARGE|XLARGE
 * @theme SPEED|QUALITY|SCALE|EXPERIENCE
 * @persona ARCHITECT|DEVELOPER|OPERATOR|USER
 * @layer API|DB|UI|AGENT|INFRA
 * @dependencies [BEHAVIOR_ID, BEHAVIOR_ID]
 *
 * @why
 * Business context and value explanation
 *
 * @who
 * As X, I want Y, so that Z
 *
 * @what
 * Given: Context
 * When: Action
 * Then: Expected outcome
 *
 * @acceptance
 * - [ ] Criterion 1
 * - [ ] Criterion 2
 */

import { describe, test, expect } from 'vitest';

describe('DOMAIN.ENTITY.OPERATION', () => {
  describe('Given: Context', () => {
    test('When: Action, Then: Outcome', () => {
      // TDD: Start with failing test
      expect(true).toBe(false);
    });
  });
});
\`\`\`

### Commands
\`\`\`bash
yarn behaviors:sync             # Scan test files → generate behaviors.json
yarn behaviors:validate         # Validate behaviors against taxonomy
yarn behaviors:summary          # Generate all dashboards
yarn behaviors:search API.*     # Find behaviors by pattern
yarn vh:summary                 # Generate Value Hypothesis dashboard
\`\`\`

**Full documentation**: [.flow/README.md](.flow/README.md) | [.flow/behavior-management.md](.flow/behavior-management.md)

## Agent Workflow Example

\`\`\`
User: "Add a new 'projects' feature with API and UI"

Claude:
1. ✅ Creates Value Hypothesis in .flow/value-hypotheses.json:
   - PROJECT.CRUD.VALIDATE (impact: 0.8, confidence: 0.85, effort: 0.4)
   - Links to behaviors: PROJECT.ROUTE.CREATE, PROJECT.ROUTE.LIST, UI.PROJECT.PAGE

2. ✅ Discusses schema design and proposes behavior IDs:
   - DB.SCHEMA.PROJECTS, PROJECT.ROUTE.CREATE, PROJECT.ROUTE.LIST
   - UI.PROJECT.PAGE, UI.PROJECT.FORM, UI.PROJECT.LIST

3. ✅ Agrees on architecture and dependencies

4. ✅ Implements with TDD workflow:
   - Writes TEST file: packages/db/src/schema/projects.test.ts
     * Adds @behavior DB.SCHEMA.PROJECTS header
     * Writes failing tests (Given-When-Then)
   - Implements: packages/db/src/schema/projects.ts
   - Makes tests pass

   - Writes TEST file: apps/api/src/routes/projects.test.ts
     * Adds @behavior PROJECT.ROUTE.CREATE header
     * Adds @dependencies [DB.SCHEMA.PROJECTS]
     * Writes failing tests
   - Implements: apps/api/src/routes/projects.ts
   - Makes tests pass

   - Writes TEST file: apps/web/src/pages/ProjectsPage.test.tsx
     * Adds @behavior UI.PROJECT.PAGE header
     * Writes failing tests
   - Implements: apps/web/src/pages/ProjectsPage.tsx
   - Makes tests pass

5. ✅ Validates and documents:
   - yarn behaviors:sync (generates behaviors.json from test files)
   - yarn behaviors:validate (taxonomy check)
   - yarn build (all packages compile)
   - yarn lint:check (0 warnings)
   - yarn test (all tests pass)
   - yarn behaviors:summary (generates roadmap, backlog, etc.)
   - yarn vh:summary (updates VH dashboard)

6. ✅ Delivers 100% clean code with behavior documentation:
   - 3 behaviors tracked (all DONE)
   - 1 VH incomplete (awaiting outcome measurement)
   - Dashboards show implementation progress
   - Roadmap updated with dependencies

User: Reviews .flow/vh-dashboard.md, runs database migration, deploys to dev
\`\`\`

---

**Remember**: We deliver 100% clean code with full behavior documentation through TDD. Every behavior gets an @behavior header in its TEST file. No shortcuts, no "TODO" comments, no skipped tests. Tests define behaviors, status computed from test results. Turborepo + Biome + Vitest + Behavior Management = Fast, reliable, maintainable builds every time.
