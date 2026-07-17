# Project: Lean-CTX Monorepo Configuration

## Architecture
This project optimizes the `lean-ctx` configuration for the `Monorepo_ModMe` development environment, incorporating advanced knowledge base features, performance tuning, adaptive learning, and seamless support for multi-agent journeys. It follows a three-layer memory model (Project Facts, Session Continuity, Agent Diary).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Config Implementation | Update `.lean-ctx.toml`, `.cursor/hooks.json`, and `.cursor/rules/lean-ctx.mdc` with optimal monorepo settings, hook scripts, and MDC rules. | none | DONE |
| 2 | Knowledge/Memory Scaffold | Create `.lean-ctx/memory/{knowledge,sessions,diary}` directories and implement the indexing script `scripts/lean-ctx-index.ps1`. | M1 | IN_PROGRESS |
| 3 | Benchmark Implementation | Create and execute `scripts/benchmark-lean-ctx.ps1` to measure context load times and cache performance. | M2 | PLANNED |

## Interface Contracts
### Config ↔ Scaffolding
- Hook scripts (`lean-ctx-post-edit.ps1` and `lean-ctx-stop-marker.ps1`) referenced in `hooks.json` must exist. 
- The `.lean-ctx/memory/` directories must exist to support future indexing and memory profiles.

## Code Layout
- Root configs: `.lean-ctx.toml`, `.cursor/hooks.json`, `.cursor/rules/lean-ctx.mdc`
- Scripts: `scripts/lean-ctx-post-edit.ps1`, `scripts/lean-ctx-stop-marker.ps1`, `scripts/lean-ctx-index.ps1`, `scripts/benchmark-lean-ctx.ps1`
- Storage: `.lean-ctx/memory/`
