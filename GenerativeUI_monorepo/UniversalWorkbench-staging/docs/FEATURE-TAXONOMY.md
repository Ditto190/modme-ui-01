# Feature Taxonomy System

## Purpose

In 100% agentic development, features need **semantic identification** that agents can understand across sessions without looking up history. This taxonomy system replaces arbitrary numbering (FEAT-001, TASK-123) with self-describing hierarchical IDs.

## Structure

```
<DOMAIN>.<ENTITY>.<OPERATION>[.<QUALIFIER>]*
```

### Examples

```
TASK.ITEM.CREATE              # Create a task
TEAM.MEMBER.INVITE            # Invite team member
AUTH.USER.LOGIN               # User login
TASK.ITEM.STATUS.UPDATE.BULK  # Bulk update task status
USER.PROFILE.UPDATE           # Update user profile
PROJECT.LIST.PAGINATED        # List projects with pagination
```

## Standard Domains

| Domain | Purpose |
|--------|---------|
| **AUTH** | Authentication and authorization |
| **USER** | User profile and account management |
| **TEAM** | Team/organization management |
| **PROJECT** | Project management |
| **TASK** | Task/work item management |
| **API** | API infrastructure (routes, middleware, validation) |
| **DB** | Database schema and migrations |
| **UI** | Frontend components and pages |
| **AGENT** | AI agent tools and workflows |
| **INFRA** | Infrastructure (Docker, deployment, monitoring) |

## Standard Operations

| Operation | Purpose |
|-----------|---------|
| **CREATE** | Create new resource |
| **READ** | Fetch single resource |
| **LIST** | Fetch multiple resources |
| **UPDATE** | Modify existing resource |
| **DELETE** | Remove resource |
| **VALIDATE** | Validation logic |
| **SEARCH** | Search/filter functionality |
| **EXPORT** | Export data |
| **IMPORT** | Import data |
| **SYNC** | Synchronization logic |

## Standard Qualifiers (Optional)

| Qualifier | Purpose |
|-----------|---------|
| **BULK** | Batch operations |
| **ASYNC** | Asynchronous processing |
| **PAGINATED** | Pagination support |
| **FILTERED** | Filter support |
| **SORTED** | Sort support |
| **CACHED** | Caching layer |

## Feature Header Format

Every feature implementation **must** include a structured `@feature` header as the **single source of truth**:

```typescript
/**
 * @feature TASK.ITEM.CREATE
 * @domain TASK
 * @entity ITEM
 * @operation CREATE
 * @layer API
 * @dependencies [DB.SCHEMA.TASKS, AUTH.SESSION.VALIDATE]
 * @implements
 *   - POST /api/tasks endpoint
 *   - Zod validation for task input
 *   - Database insertion with Drizzle
 *   - Type-safe response
 * @tests
 *   - Unit: Validation logic
 *   - Integration: API endpoint with mock DB
 *   - E2E: Full task creation flow
 */
export async function createTask(request: FastifyRequest): Promise<TaskResponse> {
  // Implementation
}
```

### Header Fields

- **@feature** (required): Full feature ID following taxonomy
- **@domain** (required): Domain from standard list
- **@entity** (required): The resource being operated on
- **@operation** (required): Operation from standard list
- **@layer** (optional): API, DB, UI, AGENT, INFRA
- **@dependencies** (optional): Array of feature IDs this depends on
- **@implements** (optional): List of what this feature implements
- **@tests** (optional): List of test descriptions

## Multi-Layer Features

Features often span multiple packages in the monorepo:

```
TASK.ITEM.CREATE
├── DB Layer: packages/db/src/schema/tasks.ts
│   /**
│    * @feature DB.SCHEMA.TASKS
│    * @domain DB
│    * @entity SCHEMA
│    * @operation TASKS
│    * @layer DB
│    */
│   export const tasks = pgTable('tasks', { ... });
│
├── API Layer: apps/api/src/routes/tasks.ts
│   /**
│    * @feature TASK.ITEM.CREATE
│    * @domain TASK
│    * @entity ITEM
│    * @operation CREATE
│    * @layer API
│    * @dependencies [DB.SCHEMA.TASKS, AUTH.SESSION.VALIDATE]
│    */
│   export async function createTask(...) { ... }
│
├── UI Layer: apps/web/src/pages/TasksPage.tsx
│   /**
│    * @feature UI.TASK.ITEM.CREATE.FORM
│    * @domain UI
│    * @entity TASK.ITEM.CREATE
│    * @operation FORM
│    * @layer UI
│    * @dependencies [TASK.ITEM.CREATE]
│    */
│   export function TaskCreateForm() { ... }
│
└── Agent Layer: apps/agent/src/tools/task-creator.ts
    /**
     * @feature AGENT.TASK.CREATE.TOOL
     * @domain AGENT
     * @entity TASK.CREATE
     * @operation TOOL
     * @layer AGENT
     * @dependencies [TASK.ITEM.CREATE]
     */
    export const taskCreatorTool = { ... };
```

## Feature Registry

The `features.json` registry is **auto-generated** from `@feature` headers. Never edit this file manually.

### Generation

```bash
yarn feature:sync
```

This scans all TypeScript/JavaScript files in `apps/` and `packages/` directories, extracts `@feature` headers, and generates `features.json`.

### Registry Format

```json
{
  "version": "1.0.0",
  "generated": "2025-10-12T10:30:00.000Z",
  "features": {
    "TASK.ITEM.CREATE": {
      "id": "TASK.ITEM.CREATE",
      "domain": "TASK",
      "entity": "ITEM",
      "operation": "CREATE",
      "qualifiers": [],
      "layers": ["DB", "API", "UI"],
      "dependencies": ["DB.SCHEMA.TASKS", "AUTH.SESSION.VALIDATE"],
      "implements": [
        "POST /api/tasks endpoint",
        "Zod validation for task input",
        "Database insertion with Drizzle"
      ],
      "files": [
        "packages/db/src/schema/tasks.ts",
        "apps/api/src/routes/tasks.ts",
        "apps/web/src/pages/TasksPage.tsx"
      ],
      "tests": [
        "Unit: Validation logic",
        "Integration: API endpoint with mock DB"
      ]
    }
  }
}
```

## Feature Management Commands

### Sync Registry

```bash
yarn feature:sync
```

Scans codebase and generates `features.json` from `@feature` headers.

### Validate Features

```bash
yarn feature:validate
```

Validates:
- Proper taxonomy format (DOMAIN.ENTITY.OPERATION)
- Valid domains and operations
- All dependencies exist
- No circular dependencies

### Search Features

```bash
# Search by pattern (supports * wildcard)
yarn feature:search TASK.*           # All TASK domain features
yarn feature:search *.CREATE         # All CREATE operations
yarn feature:search TEAM.MEMBER.*    # All TEAM.MEMBER features

# Verbose output with full details
yarn feature:search AUTH.* --verbose
```

## Agent Discovery Workflow

When an agent needs to work on a feature domain:

### 1. Glob Discovery

Search for `@feature` headers in codebase:

```bash
yarn feature:search TASK.*
```

### 2. Registry Lookup

Load `features.json` and filter by domain:

```typescript
import registry from './features.json';
const taskFeatures = Object.values(registry.features)
  .filter(f => f.domain === 'TASK');
```

### 3. Dependency Analysis

Follow `dependencies` array to understand prerequisites:

```typescript
const feature = registry.features['TASK.ITEM.CREATE'];
const deps = feature.dependencies.map(id => registry.features[id]);
```

### 4. Layer Analysis

Understand which packages need changes:

```typescript
feature.layers // ['DB', 'API', 'UI']
feature.files  // List of files to modify/read
```

### 5. Test Discovery

Co-located tests are automatically discovered:

```
packages/db/src/schema/tasks.ts
packages/db/src/schema/tasks.test.ts  ← Co-located

apps/api/src/routes/tasks.ts
apps/api/src/routes/tasks.test.ts     ← Co-located
```

## Why This Works for Agents

### 1. Self-Describing

`TEAM.MEMBER.INVITE` is immediately understood without context lookup.

### 2. Hierarchical

`TASK.COMMENT.CREATE` clearly depends on `TASK.ITEM.CREATE` by semantic structure.

### 3. Discoverable

Glob for `TASK.*` finds all task-related features across the codebase.

### 4. No Gibberish

Semantic meaning instead of arbitrary numbers like `FEAT-00342` that become meaningless over time.

### 5. Cross-Session Understanding

New agent sessions can understand features from previous sessions without full history.

### 6. Forcing Function

Build validation prevents documentation drift - code is source of truth.

## Workflow Integration

### Step 1: Collaborate on Objectives

User and agent discuss feature requirements.

### Step 2: Agree on Taxonomy

Agent proposes feature IDs following taxonomy:

```
User: "Add ability to invite team members"
Agent: "I'll implement TEAM.MEMBER.INVITE with dependencies on:
  - AUTH.SESSION.VALIDATE (user must be authenticated)
  - TEAM.MEMBER.READ (verify team exists)
  - DB.SCHEMA.TEAMS (database schema)
  - DB.SCHEMA.TEAM_MEMBERS (membership table)
```

### Step 3: Implement with Headers

Agent writes code with `@feature` headers in each layer:

```typescript
// packages/db/src/schema/team-members.ts
/**
 * @feature DB.SCHEMA.TEAM_MEMBERS
 * @domain DB
 * @entity SCHEMA
 * @operation TEAM_MEMBERS
 * @layer DB
 */
export const teamMembers = pgTable('team_members', { ... });

// apps/api/src/routes/team-members.ts
/**
 * @feature TEAM.MEMBER.INVITE
 * @domain TEAM
 * @entity MEMBER
 * @operation INVITE
 * @layer API
 * @dependencies [DB.SCHEMA.TEAM_MEMBERS, AUTH.SESSION.VALIDATE]
 */
export async function inviteTeamMember(...) { ... }
```

### Step 4: Validate & Sync

```bash
yarn feature:validate  # Check taxonomy rules
yarn feature:sync      # Generate registry
yarn build             # Compile
yarn lint:check        # Lint
yarn test              # Run tests
```

### Step 5: Review Together

User and agent review the feature registry and implementation.

## Best Practices

### DO ✅

- Add `@feature` header to every feature implementation
- Use standard domains and operations when possible
- Declare dependencies explicitly
- Keep entity names concise (ITEM, MEMBER, PROFILE)
- Use qualifiers for variations (BULK, ASYNC, PAGINATED)
- Run `yarn feature:sync` after adding features
- Run `yarn feature:validate` before committing

### DON'T ❌

- Use arbitrary numbers (TASK-001, FEAT-123)
- Create custom domains without discussion
- Skip `@feature` headers ("I'll add them later")
- Manually edit `features.json`
- Use vague entity names (THING, STUFF, DATA)
- Forget to declare dependencies
- Create circular dependencies

## Extending the Taxonomy

### Adding New Domains

Discuss with team before adding domains. Edit `scripts/feature-validate.ts`:

```typescript
const VALID_DOMAINS = new Set([
  'AUTH', 'USER', 'TEAM', 'PROJECT', 'TASK',
  'API', 'DB', 'UI', 'AGENT', 'INFRA',
  'NOTIFICATION',  // New domain
]);
```

### Adding New Operations

Discuss with team before adding operations. Edit `scripts/feature-validate.ts`:

```typescript
const VALID_OPERATIONS = new Set([
  'CREATE', 'READ', 'LIST', 'UPDATE', 'DELETE',
  'VALIDATE', 'SEARCH', 'EXPORT', 'IMPORT', 'SYNC',
  'ARCHIVE',  // New operation
]);
```

## Troubleshooting

### "Dependency 'X' not found"

The feature declares a dependency that doesn't exist. Either:
1. Implement the missing feature first
2. Remove the invalid dependency
3. Fix the feature ID typo

### "Circular dependency detected"

Two or more features depend on each other. Refactor to break the cycle:
1. Extract common logic to a new feature
2. Make one feature optional
3. Redesign the dependency chain

### "Invalid domain 'X'"

Using a domain not in the standard list. Either:
1. Use an existing domain
2. Discuss adding the domain to the standard list

### Features not found by search

Run `yarn feature:sync` to regenerate the registry.

## Migration Strategy

For existing code without `@feature` headers:

```bash
# 1. Run audit to find functions without headers
yarn feature:sync  # Will show 0 features initially

# 2. Agent proposes taxonomy for existing features
# User reviews and approves

# 3. Agent adds @feature headers to existing code

# 4. Generate registry
yarn feature:sync

# 5. Validate
yarn feature:validate

# 6. All future features must follow taxonomy
```

## Example: Task Management System

Complete feature taxonomy for a task management feature:

```
# Database Layer
DB.SCHEMA.TASKS                    # Task table schema
DB.SCHEMA.TASK_COMMENTS            # Comment table schema

# API Layer
TASK.ITEM.CREATE                   # Create task
TASK.ITEM.READ                     # Get single task
TASK.ITEM.LIST                     # List tasks
TASK.ITEM.LIST.PAGINATED           # List with pagination
TASK.ITEM.LIST.FILTERED            # List with filters
TASK.ITEM.UPDATE                   # Update task
TASK.ITEM.DELETE                   # Delete task
TASK.ITEM.STATUS.UPDATE            # Update status
TASK.ITEM.ASSIGNEE.UPDATE          # Update assignee

TASK.COMMENT.CREATE                # Add comment
TASK.COMMENT.LIST                  # List comments
TASK.COMMENT.UPDATE                # Edit comment
TASK.COMMENT.DELETE                # Delete comment

# UI Layer
UI.TASK.ITEM.CREATE.FORM           # Task creation form
UI.TASK.ITEM.LIST.TABLE            # Task list table
UI.TASK.ITEM.DETAIL.PAGE           # Task detail page
UI.TASK.COMMENT.CREATE.FORM        # Comment form

# Agent Layer
AGENT.TASK.CREATE.TOOL             # MCP tool to create tasks
AGENT.TASK.UPDATE.WORKFLOW         # Multi-step task update
```

Dependencies:

```
TASK.ITEM.CREATE
  → DB.SCHEMA.TASKS
  → AUTH.SESSION.VALIDATE

TASK.COMMENT.CREATE
  → DB.SCHEMA.TASK_COMMENTS
  → TASK.ITEM.READ
  → AUTH.SESSION.VALIDATE

UI.TASK.ITEM.CREATE.FORM
  → TASK.ITEM.CREATE

AGENT.TASK.CREATE.TOOL
  → TASK.ITEM.CREATE
```
