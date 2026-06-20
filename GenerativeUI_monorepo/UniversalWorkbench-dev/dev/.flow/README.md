# Behavior System Quick Reference for Agents

> **ESSENTIAL**: Read this before working with behaviors or value hypotheses

## 🎯 Core Principles (NEVER VIOLATE)

1. **Tests Define Behaviors** - @behavior headers live in TEST files, NOT implementation files
2. **TDD Workflow** - Write tests first (Given-When-Then), then implement
3. **Status from Tests** - @status is COMPUTED from test results (pass/fail), never manual
4. **Automation Computes Everything** - NEVER manually edit behaviors.json or dashboard files
5. **Semantic Taxonomy** - Use `DOMAIN.ENTITY.OPERATION` format (no arbitrary numbers)
6. **Value-Driven Prioritization** - Use VH scoring to determine what to build

## 📋 Agent Workflow (TDD-First)

### When Starting a VH - Analyze & Stub Tests

1. **Review VH requirements** - Check `vh-dashboard.md` for linked behaviors
2. **Identify missing behaviors** - Compare VH requirements to existing test files
3. **Create test stubs** - Write @behavior headers + skeleton tests (Given-When-Then)
4. **Sync registry** - `yarn behaviors:sync` updates behaviors.json from test files

### Behavior Test Structure

**Location:** Tests define behaviors, implementation files just implement

```
apps/api/
  src/
    routes/
      users.ts                    # Implementation (no @behavior)
      users.test.ts               # @behavior USER.ROUTE.CREATE

packages/db/
  src/
    schema/
      users.ts                    # Implementation (no @behavior)
      users.test.ts               # @behavior DB.SCHEMA.USERS
```

**Test file with @behavior header:**

```typescript
/**
 * @behavior DOMAIN.ENTITY.OPERATION
 * @priority CRITICAL | HIGH | MEDIUM | LOW
 * @effort TRIVIAL | SMALL | MEDIUM | LARGE | XLARGE
 * @theme INTELLIGENCE | ACCELERATION | SYNTHESIS | ALIGNMENT | AUTOMATION
 * @persona ARCHITECT | PRACTITIONER | EXPLORER | SYNTHESIZER
 * @why Clear explanation of value and problem being solved
 * @success Measurable success criteria
 * @who User story: "As X, I want Y, so that Z"
 * @what Acceptance criteria (Given/When/Then)
 * @linkedVH VALUE.HYPOTHESIS.ID.VALIDATE
 */

import { describe, test, expect } from 'vitest';

describe('DOMAIN.ENTITY.OPERATION', () => {
  describe('Given [context]', () => {
    test('When [action], Then [outcome]', () => {
      // TODO: Implement test
      expect(true).toBe(false); // TDD: Start with failing test
    });
  });
});
```

**NO @status field** - Computed automatically:
- All tests passing → DONE
- Some tests failing → IN_PROGRESS
- No tests/all fail → PLANNED

**Then run:**
```bash
yarn behaviors:sync    # Scans test files, computes status from test results
```

### When Creating a Value Hypothesis

Edit `.flow/value-hypotheses.json` (source data only):

```json
{
  "DOMAIN.ENTITY.OPERATION.VALIDATE": {
    "id": "DOMAIN.ENTITY.OPERATION.VALIDATE",
    "tier": "FOUNDATION",
    "linkedBehaviors": ["DOMAIN.ENTITY.OPERATION"],
    "statement": "IF we do X, THEN we achieve Y value",
    "valueDomains": ["TECHNICAL", "LEARNING", "CAPABILITY", "EXPERIENTIAL"],
    "valuePotential": {
      "overall": 0.82,      // Auto-computed: (impact × confidence) / (effort × (2-urgency))
      "impact": 0.9,        // 0-1: Potential value impact
      "confidence": 0.8,    // 0-1: Confidence in achieving value
      "effort": 0.3,        // 0-1: Implementation effort (lower = better)
      "urgency": 0.95       // 0-1: Time sensitivity
    },
    "dependencies": ["OTHER.VH.ID"],
    "blocks": ["DOWNSTREAM.VH.ID"],
    "createdAt": "2025-10-14T00:00:00Z"
  }
}
```

**Then run:**
```bash
yarn vh:summary    # Auto-computes views/stats, generates dashboard
```

## 🚫 NEVER DO THIS

❌ Put @behavior headers in implementation files (they belong in TESTS)
❌ Manually set @status field (it's computed from test results)
❌ Manually edit `behaviors.json` (auto-generated from test files)
❌ Manually edit views/stats in `value-hypotheses.json` (computed by automation)
❌ Manually edit `.flow/*.md` dashboard files (auto-generated)
❌ Use arbitrary IDs like `VH-1`, `BEHAVIOR-42` (use semantic taxonomy)
❌ Create summary docs instead of editing individual files (no shortcuts)
❌ Skip value scoring for VHs (resource optimization is core to Flow)
❌ Skip writing tests (behaviors without tests = not tracked)

## ✅ ALWAYS DO THIS

✓ Define behaviors in TEST files via `@behavior` headers
✓ Write tests BEFORE implementation (TDD workflow)
✓ Use Given-When-Then structure in tests matching @what
✓ Run `yarn behaviors:sync` after creating/changing test files
✓ Run `yarn vh:summary` after editing value-hypotheses.json
✓ Use semantic taxonomy: `DOMAIN.ENTITY.OPERATION[.QUALIFIER]`
✓ Let automation compute all derived data (status, views, stats, dashboards)
✓ Link VHs to Behaviors via `linkedBehaviors` array (1:N relationship)
✓ Score every VH with impact/confidence/effort/urgency
✓ Let test results determine behavior status (DONE = all passing)

## 🔄 Git Hooks (Automatic)

The pre-commit hook (`.husky/pre-commit`) automatically runs on every commit:

1. **Sync behaviors** - `yarn behaviors:sync` (scans test files → behaviors.json)
2. **Validate behaviors** - `yarn behaviors:validate` (checks taxonomy, dependencies)
3. **Type check** - `yarn type-check` (TypeScript compilation)
4. **Lint** - `yarn lint:check` (Biome checks)
5. **Test** - `yarn test` (Vitest runs all tests)
6. **Generate dashboards** - `yarn behaviors:summary` + `yarn vh:summary`

**Note:** Generated files (behaviors.json, *.md dashboards) are in .gitignore and NOT committed. They're regenerated on each commit to ensure consistency but remain local artifacts.

## 📊 Value Hypothesis Scoring

**Value-driven prioritization:**

Work through VHs in descending order of `valuePotential.overall` score. Higher scores indicate higher potential value delivery.

**Value Score Formula:**
```
overall = (impact × confidence) / (effort × (2 - urgency))
```

Where:
- **impact**: 0-1, potential value impact
- **confidence**: 0-1, confidence in achieving value
- **effort**: 0-1, implementation effort (lower is better)
- **urgency**: 0-1, time sensitivity

## 🔗 VH-Behavior Relationship

```
ValueHypothesis → Behavior/Behavior → Implementation
(spawns)          (spawns)           (validates VH)
```

**Key Design:**
- VHs link to Behaviors: `"linkedBehaviors": ["BEHAVIOR.ID.HERE"]`
- Behaviors do NOT link back to VHs (single source of truth)
- VHs can link to multiple behaviors (1:N relationship)

## 📁 File Structure

```
.flow/
├── README.md                    ← YOU ARE HERE (read first!)
├── behavior-management.md       ← Full documentation
├── taxonomy.yaml                ← Domain/operation definitions
├── value-hypotheses.json        ← SOURCE DATA (edit this)
├── vh-dashboard.md              ← AUTO-GENERATED (don't edit)
├── behaviors.md                 ← AUTO-GENERATED (don't edit)
├── roadmap.md                   ← AUTO-GENERATED (don't edit)
├── progress.md                  ← AUTO-GENERATED (don't edit)
├── backlog.md                   ← AUTO-GENERATED (don't edit)
├── behavior-sync.ts             ← Syncs @behavior headers → behaviors.json
├── behavior-validate.ts         ← Validates @behavior headers
├── behavior-summary.ts          ← Generates dashboard views
├── behavior-search.ts           ← Search behaviors by pattern
└── vh-summary.ts                ← Computes VH views/stats/dashboard

behaviors.json                    ← AUTO-GENERATED (don't edit)
```

## 🎓 Semantic Taxonomy Examples

**Good:**
- `USER.ROUTE.CREATE` - Create user API route
- `DB.SCHEMA.USERS` - User database schema
- `UI.BUTTON.COMPONENT` - Button UI component
- `API.AUTH.MIDDLEWARE` - Authentication middleware

**Bad:**
- `BEHAVIOR-1` - No semantic meaning
- `VH-42` - Arbitrary numbering
- `create` - Missing domain/entity
- `user-create` - Wrong format (use dots, not hyphens)

## 🚀 Common Commands

```bash
# Behavior Management (Test-Driven)
yarn behaviors:sync        # Scan test files → behaviors.json, compute status from vitest
yarn behaviors:validate    # Validate @behavior headers in test files
yarn behaviors:summary     # Generate all dashboard views
yarn behaviors:search      # Search behaviors by keyword

# Value Hypothesis Management
yarn vh:summary          # Compute views/stats, generate dashboard
yarn vh:dashboard        # View VH dashboard in terminal

# Testing (Status Computation)
yarn test                # Run vitest (status computed from results)
yarn test:watch          # Run tests in watch mode

# Quality Gates
yarn build               # Ensure all packages compile
yarn lint:check          # Ensure all linting passes
```

## ⚡ Quick Decision Tree

```
Starting a VH?
├─ YES → Review vh-dashboard.md → Identify missing behaviors → Create test stubs with @behavior → yarn behaviors:sync
│
Creating new functionality?
├─ YES → Create test file with @behavior header → Write failing tests (TDD) → Implement → Tests pass → yarn behaviors:sync
│
Are you proposing a hypothesis about value?
├─ YES → Add to value-hypotheses.json → yarn vh:summary
│
Want to check behavior status?
├─ YES → Run tests → yarn behaviors:sync (status computed from test results)
│
Are you updating VH status?
├─ YES → Update value-hypotheses.json → yarn vh:summary
│
Need to see current priorities?
├─ Behaviors → cat .flow/roadmap.md
├─ VHs → yarn vh:dashboard
│
Need to know what to build next?
└─ Check vh-dashboard.md → Execute highest-value incomplete VH
```

---

**Remember:** The behavior system exists to remove cognitive overhead from agents. Let automation handle status tracking, dashboard generation, and registry management so you can focus on building value through TDD.

**When in doubt:**
- Write tests first (they define what "done" means)
- Run `yarn behaviors:sync` (safe, idempotent, computes status from tests)
- Let test results determine behavior status (no manual tracking)
