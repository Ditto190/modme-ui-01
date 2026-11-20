# UW Archive Checklist: Non-Migrate Patterns

**Purpose**: Requirements-quality gate for UniversalWorkbench archive catalogue  
**Created**: 2026-07-11  
**Feature**: [spec.md](../spec.md) · Inventory: [uw-non-migrate-inventory.md](../../../docs/migration/uw-non-migrate-inventory.md)

**Note**: Tests whether archive catalogue requirements are well-written — not whether UW product apps compile.

## Requirement Completeness

- [ ] CHK001 Are all `nonMigrate: true` patterns listed in registry.json with title, principle, source? [Completeness]
- [ ] CHK002 Does each UW pattern map to coverage-map paths under `GenerativeUI_monorepo/UniversalWorkbench`? [Completeness]
- [ ] CHK003 Are schema-crawler / root-intake surfaces explicitly excluded from the archive catalogue? [Gap]
- [ ] CHK004 Are `-dev` / `-staging` variants documented as read-only parity (not separate migrate targets)? [Completeness]
- [ ] CHK005 Is product absorb of `apps/web|api|packages/ui` called out as out of scope? [Completeness]

## Requirement Clarity

- [ ] CHK006 Is "non-migrate" defined as knowledge/pattern extraction, not runtime port into next-forge? [Clarity]
- [ ] CHK007 Are base-only keepers (inbox tools, generate_schemas.py, scripts) distinguished from shared `.flow`? [Clarity]
- [ ] CHK008 Is `yarn pattern:uw` the executable verify for archive patterns? [Measurability]

## Requirement Consistency

- [ ] CHK009 Do registry `nonMigrate` flags align with coverage-map UW path prefixes? [Consistency]
- [ ] CHK010 Does pattern-coverage.test.mjs reject forge paths on archive patterns? [Consistency]
- [ ] CHK011 Are checklistDomain values for UW patterns set to `uw-archive`? [Consistency]

## Scenario Coverage

- [ ] CHK012 Are requirements defined when an agent discovers a new UW-only helper? [Coverage]
- [ ] CHK013 Is CodeQL documented as tertiary (not primary CI) for this catalogue? [Coverage]
- [ ] CHK014 Are index/promote steps (`code-index-orchestrator --root`) referenced for ingest? [Coverage]

## Dependencies & Assumptions

- [ ] CHK015 Is canonical path assumed to be base UniversalWorkbench (not -dev/-staging)? [Assumption]
- [ ] CHK016 Are Orbit graphs secondary and optional when GitLab index is unavailable? [Assumption]
- [ ] CHK017 Is inventory doc the authoritative keeper list until registry updates? [Traceability]

## Notes

- Re-run after inventory edits: `yarn pattern:uw`
- Pair with `node --test scripts/__tests__/pattern-coverage.test.mjs`
