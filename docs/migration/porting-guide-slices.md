# PORTING_GUIDE migration slices (ECL structured changes)

Each slice maps a [PORTING_GUIDE.md](../../PORTING_GUIDE.md) portable component to a next-forge target with **molecule manifest acceptance**.

Use `node scripts/harness-change.mjs create <slug>` before starting a slice. Pin active change files with `/context-pin`.

## Acceptance criteria (all slices)

- Entry in [`data/molecule-index/manifest.json`](../../data/molecule-index/manifest.json) with correct `kind` and `semver`
- Contract test passes (`yarn molecule-index:verify` + stack-specific Vitest/pytest)
- ECL change archived via `node scripts/harness-change.mjs archive <slug>`
- No cross-monorepo `workspace:*` or relative imports

## Slice catalog

| PORTING_GUIDE section | ECL slug | Target in next-forge | Molecule kind | Verify |
|----------------------|----------|----------------------|---------------|--------|
| Component Registry | `port-component-registry` | `apps/storybook` + `@repo/design-system` | `genui_molecule` | Storybook smoke + registry props Zod |
| Schema Crawler | `port-schema-crawler` | `@repo/schemas` + `molecule-index-orchestrator` | `zod_module` | `ws-contract.test.ts`, golden JSON diff |
| Toolset Management | `port-toolset-management` | `scripts/toolset-management/` | `toolset_entry` | `yarn lint:harness`, toolset validate scripts |
| ChromaDB / Knowledge | `port-knowledge-inbox` | inbox pipeline + Supabase | `knowledge_chunk` | `yarn inbox:audit`, intake-contracts Zod |
| GenAI Toolbox | `port-genai-toolbox-archive` | legacy `agent/` (archive only) | `legacy_satellite` | Document sunset in `phase4-cutover.md` |

## ECL change template (per slice)

```markdown
# {{slug}}

## Goal
Port PORTING_GUIDE §<section> into next-forge without lockfile merge.

## Scope
- Source: <legacy path>
- Target: <next-forge path>
- Out of scope: UniversalWorkbench edits (read-only)

## Acceptance
- [ ] `yarn molecule-index:verify` — manifest entry for this slice
- [ ] Contract test green (see table above)
- [ ] `docs/codebase/*` updated if agent-facing paths change
- [ ] CHANGELOG [Unreleased] bullet

## Verify
yarn molecule-index:run --stack forge
yarn molecule-index:verify
yarn verify:forge   # baseline Biome debt documented, not regression
```

## Wave ordering (ADR-0012)

1. **Wave 0 (serial):** orchestrator creates ECL change + runs `molecule-index:run`
2. **Wave 1 (parallel):** explorer-forge + explorer-legacy draft acquire docs
3. **Wave 2 (blocked on manifest):** thermo reviewers validate slice boundaries
4. **Wave 3 (serial commit):** merge findings, update golden fixtures, archive ECL change

## Related

- Runbook: [`docs/workflows/thermo-nuclear-dual-monorepo-review.md`](../workflows/thermo-nuclear-dual-monorepo-review.md)
- ADR-0012: [`next-forge/docs/adr/0012-bounded-parallel-agent-lifecycle.md`](../../next-forge/docs/adr/0012-bounded-parallel-agent-lifecycle.md)
- Phase 4 cutover: [`phase4-cutover.md`](./phase4-cutover.md)
