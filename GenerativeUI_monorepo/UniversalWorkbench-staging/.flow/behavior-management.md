# Behavior Management System - Complete Documentation

> **Complete guide to the TDD-first behavior tracking system**

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [File Structure](#file-structure)
4. [Workflow](#workflow)
5. [@behavior Header Specification](#behavior-header-specification)
6. [Value Hypothesis Management](#value-hypothesis-management)
7. [Commands Reference](#commands-reference)
8. [Examples](#examples)
9. [Best Practices](#best-practices)

## Overview

The Behavior Management System is a TDD-first approach to tracking features and value delivery in the ts-fullstack template. It automatically generates registries, dashboards, and roadmaps from `@behavior` headers in test files.

### Key Principles

1. **Tests Define Behaviors** - @behavior headers live in TEST files only
2. **TDD Workflow** - Write failing tests first, then implement
3. **Automation First** - All registries and dashboards are auto-generated
4. **Semantic Taxonomy** - Use `DOMAIN.ENTITY.OPERATION` format
5. **Value-Driven** - Prioritize work by value scores

## Core Concepts

### Behavior

A **Behavior** is a discrete, testable capability defined by:
- Semantic ID: `DOMAIN.ENTITY.OPERATION[.QUALIFIER]*`
- Test file with @behavior header
- Given-When-Then acceptance criteria
- Status computed from test results

### Value Hypothesis (VH)

A **Value Hypothesis** is a bet about value delivery:
- Links to one or more Behaviors
- Scored by impact, confidence, effort, urgency
- Validates through AlignedOutcomes
- Incomplete VHs drive prioritization

### Flow

```
ValueHypothesis → Behavior → Implementation → Tests Pass → AlignedOutcome
(spawns)          (defines)   (implements)    (validates)   (measures value)
```

## File Structure

```
.flow/
├── README.md                    # Quick reference (start here!)
├── behavior-management.md       # THIS FILE - complete documentation
├── taxonomy.yaml                # Domain/operation definitions
├── value-hypotheses.json        # SOURCE DATA (edit this)
│
├── behavior-sync.ts             # Syncs @behavior → behaviors.json
├── behavior-validate.ts         # Validates @behavior headers
├── behavior-summary.ts          # Generates markdown dashboards
├── behavior-search.ts           # Search behaviors by pattern
└── vh-summary.ts                # Computes VH views/dashboard

# Auto-generated (DO NOT EDIT):
behaviors.json                    # Complete behavior registry
.flow/behaviors.md                # Executive dashboard
.flow/roadmap.md                  # Implementation plan
.flow/progress.md                 # User journey view
.flow/backlog.md                  # Planning list
.flow/vh-dashboard.md             # VH prioritization
```

## Workflow

### 1. Starting a Value Hypothesis

**Edit `.flow/value-hypotheses.json`:**

```json
{
  "API.AUTH.JWT.VALIDATE": {
    "id": "API.AUTH.JWT.VALIDATE",
    "tier": "FOUNDATION",
    "linkedBehaviors": [
      "API.AUTH.JWT.SIGN",
      "API.AUTH.JWT.VERIFY",
      "API.AUTH.MIDDLEWARE.PROTECT"
    ],
    "statement": "IF we implement JWT authentication, THEN APIs are secured with industry-standard tokens",
    "valueDomains": ["TECHNICAL", "CAPABILITY"],
    "valuePotential": {
      "overall": 0.88,
      "impact": 0.9,
      "confidence": 0.85,
      "effort": 0.35,
      "urgency": 0.9
    }
  }
}
```

**Run:**
```bash
yarn vh:summary
```

### 2. Creating Behavior Tests (TDD)

**Create test file with @behavior header:**

```typescript
// apps/api/src/middleware/auth.test.ts
/**
 * @behavior API.AUTH.MIDDLEWARE.PROTECT
 * @domain API
 * @entity AUTH
 * @operation MIDDLEWARE.PROTECT
 * @status PLANNED
 * @priority HIGH
 * @effort MEDIUM
 * @theme QUALITY
 * @persona DEVELOPER
 * @valueDomain TECHNICAL
 * @valueType DIRECT
 * @layer API
 * @dependencies [API.AUTH.JWT.VERIFY]
 *
 * @why
 * Protect API routes from unauthorized access using JWT verification
 *
 * @success
 * Routes decorated with authMiddleware reject invalid/missing tokens
 *
 * @who
 * As an API developer, I want to protect routes
 * so that only authenticated users can access them
 *
 * @what
 * Given: Route is protected with authMiddleware
 * When: Request has valid JWT token
 * Then: Request proceeds to route handler
 *
 * @acceptance
 * - [ ] Middleware extracts JWT from Authorization header
 * - [ ] Middleware verifies JWT signature and expiry
 * - [ ] Middleware attaches user to request context
 * - [ ] Invalid token returns 401 Unauthorized
 * - [ ] Missing token returns 401 Unauthorized
 */

import { describe, test, expect } from 'vitest';

describe('API.AUTH.MIDDLEWARE.PROTECT', () => {
  describe('Given: Route is protected with authMiddleware', () => {
    test('When: Valid token provided, Then: Request proceeds', async () => {
      // TODO: Implement
      expect(true).toBe(false); // TDD: Start failing
    });

    test('When: Invalid token provided, Then: Returns 401', async () => {
      // TODO: Implement
      expect(true).toBe(false);
    });
  });
});
```

**Run:**
```bash
yarn behaviors:sync
```

### 3. Implementing the Behavior

1. Write implementation code
2. Make tests pass
3. Run `yarn behaviors:sync` - status automatically updates to DONE

### 4. Reviewing Progress

```bash
# See what to build next
yarn vh:dashboard

# See implementation roadmap
cat .flow/roadmap.md

# Search for behaviors
yarn behaviors:search "API.AUTH.*"

# Validate everything
yarn behaviors:validate
```

## @behavior Header Specification

### Required Fields

```typescript
/**
 * @behavior DOMAIN.ENTITY.OPERATION[.QUALIFIER]*
 * @priority CRITICAL | HIGH | MEDIUM | LOW
 * @effort TRIVIAL | SMALL | MEDIUM | LARGE | XLARGE
 */
```

### Recommended Fields

```typescript
/**
 * @theme SPEED | QUALITY | SCALE | EXPERIENCE
 * @persona ARCHITECT | DEVELOPER | OPERATOR | USER
 * @valueDomain TECHNICAL | CAPABILITY | LEARNING | EXPERIENTIAL | ORGANIZATIONAL
 * @valueType DIRECT | ENABLING | STRATEGIC | LEARNING | EXPERIENTIAL
 * @layer API | DB | UI | AGENT | INFRA
 * @dependencies [BEHAVIOR.ID, ANOTHER.ID]
 *
 * @why
 * Business context and value explanation
 *
 * @success
 * Definition of done / success criteria
 *
 * @who
 * User story: As X, I want Y, so that Z
 *
 * @what
 * Given/When/Then acceptance criteria
 *
 * @acceptance
 * - [ ] Criterion 1
 * - [x] Criterion 2 (checked = done)
 * - [ ] Criterion 3
 */
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `@behavior` | ID | Semantic identifier (REQUIRED) |
| `@priority` | Enum | Business priority (REQUIRED) |
| `@effort` | Enum | Implementation effort (REQUIRED) |
| `@status` | Enum | ⚠️ DEPRECATED - computed from tests |
| `@theme` | Enum | Value theme alignment |
| `@persona` | Enum | Target user persona |
| `@valueDomain` | Enum | Type of value delivered |
| `@valueType` | Enum | Value measurement approach |
| `@layer` | Enum | Technical layer |
| `@dependencies` | Array | Prerequisite behaviors |
| `@why` | Text | Business rationale |
| `@success` | Text | Success criteria |
| `@who` | Text | User story |
| `@what` | Text | Given/When/Then |
| `@acceptance` | Checklist | Acceptance criteria |

## Value Hypothesis Management

### VH Structure

```json
{
  "VH.ID.HERE": {
    "id": "VH.ID.HERE",
    "tier": "FOUNDATION | SIGNAL | VALUE | EXECUTION | INTELLIGENCE | PLATFORM | UX | EXPORT",
    "linkedBehaviors": ["BEHAVIOR.ID"],
    "statement": "IF we do X, THEN we achieve Y",
    "valueDomains": ["TECHNICAL", "CAPABILITY"],
    "valuePotential": {
      "overall": 0.82,      // Auto-computed
      "impact": 0.9,        // 0-1: Value impact
      "confidence": 0.8,    // 0-1: Confidence
      "effort": 0.3,        // 0-1: Effort (lower better)
      "urgency": 0.95       // 0-1: Time sensitivity
    },
    "dependencies": ["OTHER.VH.ID"],
    "blocks": ["DOWNSTREAM.VH.ID"]
  }
}
```

### Value Score Formula

```
overall = (impact × confidence) / (effort × (2 - urgency))
```

**Rationale:**
- Higher impact → higher score
- Higher confidence → higher score
- Higher effort → lower score
- Higher urgency → higher score (as denominator decreases)

### VH Lifecycle

1. **Incomplete** - `valueRealized` is null
2. **In Progress** - Some linked behaviors complete
3. **Complete** - All behaviors DONE + outcomes measured

## Commands Reference

### Behavior Management

```bash
# Scan code → generate behaviors.json
yarn behaviors:sync

# Validate behaviors and taxonomy
yarn behaviors:validate

# Generate all markdown dashboards
yarn behaviors:summary

# Search behaviors by pattern
yarn behaviors:search "API.*"
yarn behaviors:search "*.CREATE"
yarn behaviors:search "DB.SCHEMA.*" --verbose

# Quick views
yarn behaviors:stats     # Show stats
yarn behaviors:list      # List all IDs
yarn behaviors:backlog   # Show PLANNED only
```

### Value Hypothesis Management

```bash
# Generate VH dashboard
yarn vh:summary

# View dashboard
yarn vh:dashboard

# Edit VHs
vim .flow/value-hypotheses.json
```

### Integration with Development

```bash
# Typical workflow
yarn behaviors:sync          # Update registry
yarn test                    # Run tests (updates status)
yarn behaviors:summary       # Regenerate dashboards
yarn vh:summary              # Update VH priorities
```

## Examples

### Example 1: API Route Behavior

```typescript
/**
 * @behavior API.ROUTE.POST.CREATE
 * @priority HIGH
 * @effort MEDIUM
 * @theme SPEED
 * @persona DEVELOPER
 * @layer API
 * @dependencies [DB.SCHEMA.POSTS]
 *
 * @why
 * Enable creating blog posts through API
 *
 * @who
 * As a content creator, I want to create posts via API
 * so that I can publish content programmatically
 *
 * @what
 * Given: Valid post data submitted to POST /api/posts
 * When: Request is processed
 * Then: Post is created and returned with 201 status
 *
 * @acceptance
 * - [ ] Validates title, content, authorId
 * - [ ] Creates post in database
 * - [ ] Returns 201 with created post
 * - [ ] Returns 400 for invalid data
 */
```

### Example 2: UI Component Behavior

```typescript
/**
 * @behavior UI.COMPONENT.CARD
 * @priority MEDIUM
 * @effort SMALL
 * @theme EXPERIENCE
 * @persona DEVELOPER
 * @layer UI
 * @dependencies []
 *
 * @why
 * Provide reusable card component for consistent layouts
 *
 * @who
 * As a frontend developer, I want a Card component
 * so that I can build consistent card-based UIs quickly
 *
 * @what
 * Given: Developer needs to display content in a card
 * When: They use <Card> component
 * Then: Content is rendered with proper styling and structure
 *
 * @acceptance
 * - [x] Card renders with default styles
 * - [x] Supports CardHeader, CardTitle, CardContent, CardFooter
 * - [x] Accepts className for customization
 * - [x] Fully accessible
 */
```

## Best Practices

### DO ✅

1. **Write tests first** - Define @behavior header before implementing
2. **Use semantic IDs** - `USER.PROFILE.UPDATE` not `update-user-1`
3. **Co-locate tests** - `users.ts` → `users.test.ts`
4. **Run sync often** - After any @behavior header change
5. **Let tests determine status** - Don't manually set @status
6. **Score VHs accurately** - Be honest about effort/confidence
7. **Link VHs to behaviors** - Maintain traceability
8. **Update acceptance criteria** - Check boxes as you complete them

### DON'T ❌

1. **Don't put @behavior in implementation files** - Tests only!
2. **Don't manually edit behaviors.json** - It's auto-generated
3. **Don't manually edit dashboard .md files** - Auto-generated
4. **Don't use arbitrary IDs** - No `VH-1`, `BEHAVIOR-42`
5. **Don't skip @why/@who/@what** - Context is critical
6. **Don't forget dependencies** - Declare them explicitly
7. **Don't skip value scoring** - VH prioritization requires it
8. **Don't commit behaviors.json** - It's in .gitignore

### Status Computation

Status is **automatically computed** from test results:

| Test State | Computed Status |
|------------|-----------------|
| All passing | DONE |
| Some failing | IN_PROGRESS |
| All failing / No tests | PLANNED |

You can override by explicitly setting `@status`, but this is discouraged.

## Troubleshooting

### Issue: Behaviors not detected

**Solution:** Ensure @behavior header is in a test file (*.test.ts, *.test.tsx)

### Issue: Status not updating

**Solution:** Run `yarn behaviors:sync` after test changes

### Issue: Validation fails

**Solution:** Check taxonomy.yaml for valid domains/operations

### Issue: VH score seems wrong

**Solution:** Review the formula: `(impact × confidence) / (effort × (2-urgency))`

## Integration Points

### With CLAUDE.md Workflow

The behavior system integrates with the 6-step collaboration workflow:

1. **Collaborate on Objectives** → Create VHs
2. **Define Feature IDs** → Use same semantic taxonomy
3. **Agree on Architecture** → Define behaviors with @layer
4. **Claude Handles Dev/Test** → Implement with @behavior headers
5. **User Handles Deployment** → Based on roadmap.md
6. **Review Together** → Use dashboards for progress review

### With Git Hooks

```bash
# Pre-commit: Sync behaviors
yarn behaviors:sync
yarn behaviors:validate

# Pre-push: Update dashboards
yarn behaviors:summary
yarn vh:summary
```

### With CI/CD

```yaml
# .github/workflows/ci.yml
- name: Validate Behaviors
  run: |
    yarn behaviors:sync
    yarn behaviors:validate
    yarn test
```

---

**Questions?** Check [README.md](.flow/README.md) for quick reference or explore the generated dashboards in `.flow/`.
