# CONTEXT.md — ModMe Domain Glossary

Vocabulary for architecture reviews, ECL changes, and agent onboarding. Use these terms in ADRs and deepening proposals.

## DualMonorepo

Independent package-manager roots (`next-forge/` Bun, `GenerativeUI_monorepo/` Yarn) orchestrated from repo root. Integration via HTTP/WebSocket and golden Zod schemas only — never `workspace:*` across stacks.

## GenUIIsland

Client-only route group in `next-forge/apps/app` (`(authenticated)/generative-ui/`) that renders agent-driven UI via WebSocket to the AgentSatellite. Server Components shell; `'use client'` leaf for canvas + hooks.

## AgentSatellite

Python FastAPI + AG2 runtime at `GenerativeUI_monorepo/apps/agent-server`. Hexagonal layout: thin WebSocket adapter, `GroupChatAdapter`, Pydantic models mirroring `@repo/schemas`.

## MoleculeIndex

Unified indexing spine (`yarn molecule-index`) for AST chunks, Zod modules, MCP molecules, and toolset entries. Manifest at `data/molecule-index/manifest.json`; branded IDs in `@repo/schemas`.

## IntakePipeline

Root Supabase pgvector inbox path: `scripts/intake-orchestrator.mjs` → `inbox-*.mjs` → promote/embed. Distinct from legacy GenerativeUI `intake-pipeline/` (Copilot telemetry).

## LegacyRootStub

Deprecated `src/` (Next.js GenUI) + `agent/` (Python ADK + vendored genai-toolbox). Canonical owners: next-forge app + agent-server. Archive per Phase 4 — do not extend.

## SchemaContract

Golden JSON fixture (`genui-agent-contract.golden.json`) enforced by Vitest (`@repo/schemas`) and pytest (`test_schemas_contract.py`). Single wire contract; manual Pydantic sync until codegen exists.

## WorkshopLayer

Storybook `ModMe/Workshop` stories in `next-forge/apps/storybook` — Phase 1 migration mirror before production GenUIIsland parity.

## SkillRegistry

Three tiers: `.agents/skills/` (repo canonical), `.cursor/skills/` (Cursor + vendor), `.vendor/awesome-copilot-main/`. Precedence: local override > `.agents` > `.cursor` > vendor.
