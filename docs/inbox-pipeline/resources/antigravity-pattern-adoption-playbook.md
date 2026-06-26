# Antigravity Pattern Adoption — Implementation Playbook

Detailed patterns referenced by the implementation report and [`docs/PRD.yaml`](../../PRD.yaml).

## Core Concepts

### 1. Pipeline Layers

```
sources/          GenerativeUI_monorepo/docs/inbox/
    ↓
staging/          scripts/lib/category-scorer.mjs
    ↓
intermediate/     scripts/mda-categorize.mjs
    ↓
manifest/         skills_index.json + data/skills_index.json
    ↓
marts/            catalogue_items (ADR-0010)
    ↓
runtime/          skill-loader.ts → prepareModelMessages()
```

### 2. Naming Conventions

| Layer | Prefix / pattern | Example |
|-------|------------------|---------|
| Scorer slug | inbox taxonomy | `frontend`, `security` |
| Skill id | folder path under `.agents/skills` | `next-forge` |
| Catalogue slug | kebab-case from id | `next-forge` |
| Contract | `*.v1.schema.json` | `skills-index.v1.schema.json` |

## Manifest Generation

```powershell
yarn skills:index
```

- Walks `.agents/skills/**/SKILL.md` (skips `.disabled/`)
- Infers missing `category` via shared scorer (margin threshold minScore=4, minMargin=2 at MDA; relaxed at index time)
- Validates against `docs/inbox-pipeline/contracts/skills-index.v1.schema.json`
- Emits canonical + mirror paths

## Lazy Loader API

```typescript
import { createSkillResolverFromEnv, buildModelMessages } from "@repo/database";

const resolver = createSkillResolverFromEnv("/path/to/monorepo");
const messages = await resolver.buildModelMessages({
  baseSystemMessages: [{ role: "system", content: "Base instructions" }],
  trajectory: [{ role: "user", content: "Use @next-forge for setup help" }],
});
```

### Environment

| Variable | Default |
|----------|---------|
| `MODME_PROJECT_ROOT` | `process.cwd()` |
| `MODME_SKILLS_INDEX_PATH` | `./skills_index.json` |
| `MODME_SKILLS_ROOT` | `.agents/skills` |
| `MODME_SKILLS_GLOBAL_ROOT` | `~/.cursor/skills` |
| `MODME_MAX_SKILLS_PER_TURN` | `8` |
| `MODME_SKILLS_OVERFLOW` | `truncate` or `error` |

## Catalogue Bridge

Orchestrator sequence (session/ci modes):

1. `inbox-embeddings.mjs`
2. `mda-categorize.mjs`
3. `skills-index-generate.mjs`
4. `output-generate.mjs --type all`
5. `catalogue-sync.mjs`

Promotion rules:

- `output_schemas` → `catalogue_items` by schema_type
- `skills_index.json` → `catalogue_items` with `item_type: skill`
- Tagged inbox agents → draft catalogue entries

## Testing Strategy

| Test type | Target | Command |
|-----------|--------|---------|
| Unit | skill-loader security + caps | `bun test skill-loader` |
| Contract | skills index schema | `yarn skills:index` |
| Integration | intake orchestrator | `yarn intake:orchestrate` |
| Smoke | `@next-forge` lazy load | VoltAgent `prepareModelMessages` |

## Documentation Hook (PRD sync)

When implementation status changes:

1. Update `docs/PRD.yaml` → `features[].status`
2. Regenerate report: `docs/inbox-pipeline/reports/antigravity-pattern-adoption.md`
3. Run `yarn docs:writer:check` (CI parity)
4. Delegate Diátaxis updates to `documentation-writer` agent for user-facing guides

## Incremental Processing

- **Manifest**: regenerate only when `.agents/skills/**` changes (CI path filter)
- **Catalogue sync**: idempotent upsert on `slug`
- **Runtime**: load SKILL.md bodies only for referenced `@skill-id` in current turn

## Out of Scope

- Full antigravity corpus vendoring
- Loading all global skills into system prompt
- Python maintainer script ports (`auto_categorize_skills.py` verbatim)
