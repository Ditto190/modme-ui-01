# Technical Change Tracker

One row per tracked technical change. `gate phase` names which quality-gate phase (per ADR-0013) the verify command exercises. Statuses: proposed | in-progress | verified | shipped.

| Change id | Date | ADR | Files | Gate phase | Verify command | Status |
|---|---|---|---|---|---|---|
| TC-001 | 2026-07-12 | [next-forge 0013](../next-forge/docs/adr/0013-obsidian-intake-trigger-and-session-gates.md) | `scripts/obsidian-intake-trigger.ps1`, `next-forge/packages/schemas/intake-gates.ts`, `next-forge/packages/schemas/intake-gates.test.ts`, `C4-Documentation/c4-component-intake-pipeline.md`, `docs/tech-matrix.md` | pre-upsert (contract), post-upsert (audit + advisors) | `npx bun run test` in `next-forge/packages/schemas`; `yarn intake:orchestrate --mode=staging-dry-run` | in-progress |
| TC-002 | 2026-07-12 | [next-forge 0013](../next-forge/docs/adr/0013-obsidian-intake-trigger-and-session-gates.md) | contract v1.1 bump adding optional `pipeline_ready` frontmatter key (not started) | pre-upsert | `yarn inbox:test` | proposed |
