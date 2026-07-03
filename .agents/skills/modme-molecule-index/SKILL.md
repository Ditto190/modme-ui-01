---
name: modme-molecule-index
description: Orchestrate code molecule indexing — generate_schemas → schema-crawler → molecule-generator → intake-contracts → GreptimeDB code-index. Use when indexing portable components or validating PORTING_GUIDE migration slices.
---

# ModMe Molecule Index

Unified indexing spine for AST chunks, Zod modules, MCP molecules, and toolset entries.

## Pipeline stages

| Stage | Tool | Output |
|-------|------|--------|
| 1 TS → JSON Schema | `GenerativeUI_monorepo/UniversalWorkbench/generate_schemas.py` | `tools_schema.json` |
| 2 JSON Schema → Zod | `schema-crawler.ts` | `@repo/schemas` modules |
| 3 MCP → molecules | `molecule-generator.ts` | `Molecule` records |
| 4 Repo AST | `scripts/code-index-orchestrator.mjs` | GreptimeDB `code_index` |
| 5 Runtime gate | `packages/intake-contracts` | Zod at classify/promote |
| 6 Manifest | `scripts/molecule-index-orchestrator.mjs` | `data/molecule-index/manifest.json` |

## Commands

```powershell
# Full orchestrator (dry-run safe)
yarn molecule-index --stack forge --semver 1.0.0 --dry-run

# Verify manifest + contract tests (CI gate)
yarn molecule-index:verify

# Optional AST index (requires micro-agents build)
yarn intake:code-index
node scripts/code-index-orchestrator.mjs --dry-run
```

## Index record kinds

Discriminated union: `ts_ast | zod_module | mcp_molecule | toolset_entry | knowledge_chunk | legacy_satellite`

Branded IDs in `@repo/schemas`: `MoleculeId`, `CodeChunkId`, `SchemaVersion`.

## Rules

- Index **source only** — exclude `node_modules`, `.vendor/`, build `dist/` (record hashes in manifest for drift)
- Golden JSON snapshots versioned with SemVer bump process
- `route_hint` metadata for future SEMANTIC_ROUTER (defer router impl)

## lean-ctx profile

Activate `molecule-index` profile via `/context-focus` — see [`data/lean-ctx-task-profiles.toml`](../../../data/lean-ctx-task-profiles.toml).

## Related

- PORTING_GUIDE slices: `harness/changes/active/porting-guide-*`
- Inbox pipeline: [`docs/inbox-pipeline/README.md`](../../../docs/inbox-pipeline/README.md)
