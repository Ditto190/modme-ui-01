# UniversalWorkbench Non-Migrate Inventory

> Catalogue of UW surfaces that stay **out of next-forge runtime migration**.
> Extract knowledge/patterns only; do not port `apps/web|api|agent` product code.
> Canonical tree: `GenerativeUI_monorepo/UniversalWorkbench/`.
> Variants `-dev` / `-staging` are read-only parity copies unless noted.

## FAF goal

Catalogue UniversalWorkbench-only agent-dev patterns that will not migrate into next-forge, validate them with pattern-coverage gates, and ingest them as `code_pattern` inbox entries for Agent-Management.

## Variant layout

| Variant | Root | Notes |
|---------|------|-------|
| Base (canonical) | `GenerativeUI_monorepo/UniversalWorkbench/` | Full surface: agent-generator, inbox tools, scripts, `.flow` |
| Dev | `GenerativeUI_monorepo/UniversalWorkbench-dev/dev/` | Reduced agent tools; shared `.flow` |
| Staging | `GenerativeUI_monorepo/UniversalWorkbench-staging/` | Same reduced set as `-dev` |

## Inventory

| path | kind | migrate? | rationale | canonical_vs_variant |
|------|------|----------|-----------|----------------------|
| `.flow/behavior-sync.ts` | scanner | false | Tests→behavior registry; no forge equivalent | shared (all 3) |
| `.flow/behavior-validate.ts` | validator | false | Behavior gate scripts | shared |
| `.flow/behavior-search.ts` | helper | false | Behavior search CLI | shared |
| `.flow/taxonomy.yaml` | taxonomy | false | Feature taxonomy for `.flow` | shared |
| `.flow/README.md` | docs | false | Behavior system rules | shared |
| `apps/agent/src/tools/inboxIngest.ts` | tool | false | Pattern ref only; root `scripts/inbox-ingest.mjs` is runtime | **base-only** |
| `apps/agent/src/tools/mdaCategorize.ts` | tool | false | Pattern ref; root `scripts/mda-categorize.mjs` is runtime | **base-only** |
| `apps/agent/src/workflows/inboxPipeline.ts` | workflow | false | UW agent workflow glue; not forge VoltAgent | **base-only** |
| `generate_schemas.py` | generator | false | TS tools + SKILL.md → schemas/prompt | **base-only** |
| `scripts/init-worktrees.ps1` | script | false | UW-local worktree init (distinct from root scripts) | **base-only** |
| `scripts/new-feature.ps1` | script | false | UW feature scaffold | **base-only** |
| `docs/validation-patterns.md` | docs | false | UW validation playbook | shared docs |
| `docs/FEATURE-TAXONOMY.md` | docs | false | UW feature taxonomy | shared docs |

Paths above are relative to `GenerativeUI_monorepo/UniversalWorkbench/` unless noted.

## Explicitly excluded (already migrate or duplicate)

| path / surface | migrate? | rationale |
|----------------|----------|-----------|
| Schema crawler / MCP Zod gen | true | Porting slice `port-schema-crawler` → `@repo/schemas` |
| Root inbox ingest/embed/MDA | true | `scripts/intake-orchestrator.mjs` + next-forge Knowledge UI |
| `apps/agent/src/tools/apiHealthCheck.ts` | skip | Generic; forge `apps/agent` VoltAgent covers health-style tools |
| `apps/agent/src/workflows/statusReport.ts` | skip | Generic status workflow |
| `apps/web`, `apps/api`, `packages/ui` | future | Product absorb is a separate task — out of this catalogue |
| GenUI `apps/agent-generator` MCP registry | true | Prefer GenUI path for migrate slice over UW copy |

## Pattern registry IDs

| id | keeper paths |
|----|----------------|
| `uw-flow-behavior-sync` | `.flow/behavior-sync.ts`, `.flow/behavior-validate.ts`, `.flow/behavior-search.ts` |
| `uw-flow-taxonomy` | `.flow/taxonomy.yaml`, `.flow/README.md` |
| `uw-agent-inbox-pipeline-tools` | `apps/agent/src/tools/inboxIngest.ts`, `mdaCategorize.ts`, `workflows/inboxPipeline.ts` |
| `uw-generate-schemas-py` | `generate_schemas.py` |
| `uw-worktree-scripts` | `scripts/init-worktrees.ps1`, `scripts/new-feature.ps1` |
| `uw-validation-patterns-doc` | `docs/validation-patterns.md`, `docs/FEATURE-TAXONOMY.md` |

## Orbit (secondary knowledge map)

GitLab Orbit MCP had no ModMe project hits at plan time. When indexed, use File queries with:

```text
path starts_with GenerativeUI_monorepo/UniversalWorkbench
```

Repeat for `-dev` / `-staging`. Export Definition neighborhoods for `.flow` and `apps/agent/src/tools` into this inventory as needed.

## CodeQL (tertiary — not CI for this catalogue)

CodeQL is for alert/path security analysis, not registry↔path↔yarn contracts. Do **not** gate UW archive patterns on CodeQL. Revisit only if a keeper becomes a security rule.

## Validation

- Primary CI: `yarn pattern:uw` + `node --test scripts/__tests__/pattern-coverage.test.mjs`
- Index dry-run: `node scripts/code-index-orchestrator.mjs --root <UW keeper dir> --dry-run --promote`
- Index without Greptime: `node scripts/code-index-orchestrator.mjs --root <UW keeper dir> --ast-only --promote` (needs reachable Supabase; local Greptime default `127.0.0.1:4003`)
- Evidence (2026-07-11): `.flow` → 68 chunks / 67 promote candidates; `apps/agent/src/tools` → 18 chunks / 8 candidates
- Ingest DQ: `yarn inbox:audit`

## Related

- [porting-guide-slices.md](./porting-guide-slices.md) — migrate slices (schema crawler, knowledge)
- [legacy-archive-plan.md](./legacy-archive-plan.md) — root `src/`/`agent/` archive after Phase 4
- [phase4-cutover.md](./phase4-cutover.md)
