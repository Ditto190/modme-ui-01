# STATUS — Agent Handoff

> Last updated: 2026-07-04 (thermo-nuclear baseline review)

## Active structured changes

Five PORTING_GUIDE slices under [`harness/changes/active/`](../harness/changes/active/):

| Slice | Priority (baseline review) |
|-------|----------------------------|
| `porting-guide-component-registry` | 1 — complete next |
| `porting-guide-schema-crawler` | 2 |
| `porting-guide-toolset-management` | 3 |
| `porting-guide-knowledge-chromadb` | 4 — park until inbox green |
| `porting-guide-genai-toolbox` | 5 — document as legacy_satellite only |

## Archived

- **`harness-setup-dual-monorepo`** — in [`harness/changes/archive/harness-setup-dual-monorepo/`](../harness/changes/archive/harness-setup-dual-monorepo/) (STATUS previously listed this as active; drift fixed 2026-07-04).

## Completed

- ECL harness (`docs/ECL.md`, `docs/ARCHITECTURE.md`, lint scripts, templates)
- `scripts/lib/stack-paths.json` + CI sync validator
- Refreshed all 7 `docs/codebase/*.md` + scan artifact
- `C4-Documentation/` (context, container, 10 components, API yaml, code views)
- WS contract tests: `next-forge/packages/schemas/ws-contract.test.ts`
- Golden JSON merge conflict resolved (agent-server fixture)
- `yarn verify:all`, `yarn lint:harness` in root package.json
- Phase 4 + legacy archive plan: [`docs/migration/phase4-cutover.md`](migration/phase4-cutover.md)
- Baseline recorded: [`docs/audit-baseline.md`](audit-baseline.md)
- Thermo-nuclear baseline review: [`docs/workflows/reports/thermo-nuclear-baseline-2026-07-04.md`](workflows/reports/thermo-nuclear-baseline-2026-07-04.md)

## Next agent actions

1. Complete `porting-guide-component-registry` acceptance (molecule manifest + Storybook/contract test)
2. Add agent-server golden pytest to GitHub `generative-ui` job (CI parity gap)
3. Add WS auth + inbound Pydantic validation on `/ws/agent` before production cutover
4. Enforce golden fixture byte-identity between forge and agent-server
5. `yarn lint:harness` before commit; `yarn verify:forge` / `yarn verify:generative` as touched

## Blockers

- **Baseline debt:** `verify:forge` fails without next-forge `bun install` (ultracite not found)
- **Disk:** Full worktree checkouts fail when C: is near full; prefer sparse checkout excluding `src/models/gemma3n` until that tree is untracked
- **Cutover precondition:** Unauthenticated agent-server WebSocket (see baseline report S1/S2)

## Canonical map

[`docs/agent-index.md`](agent-index.md) — next-forge primary; agent-server satellite; root `src/`/`agent/` deprecated.
