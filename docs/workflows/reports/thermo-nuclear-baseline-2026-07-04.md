# Thermo-Nuclear Full-Repo Baseline Review — Synthesis

**Date:** 2026-07-04  
**Branch:** `feature/cursor/thermo-nuclear-baseline`  
**HEAD:** `e1b58faa9f7d9be01b82c61b0dd3e422413d1a4f`  
**Worktree:** `C:\Users\dylan\Monorepo_ModMe-dev\dev-agent-cursor-thermo-nuclear-baseline`  
**Scope:** Full-repo baseline redundancy + migration-fit audit (not PR-scoped)  
**Lifecycle:** ADR-0012 bounded-parallel (wave 0–3)  
**Exclusions:** `UniversalWorkbench-staging`, `UniversalWorkbench-dev`

Wave-1 gate: [`manifest.json`](./manifest.json)

---

## 1. Executive summary

- No cross-monorepo `workspace:*` boundary violations; integration remains HTTP/WebSocket + golden JSON only.
- Largest structural debt is **triple GenerativeCanvas** (forge 326L / web-dashboard 227L / root stub 19L) plus a **schema triple** (`@repo/schemas` / `shared-schemas` / `schemas.py`) with manual sync.
- Golden fixtures are **semantically identical** (`contractVersion: 1`) but **not byte-identical** (formatting only); root `src/lib/types.ts` is a fully drifted alternate model (`elements` vs `actions`) and belongs in ARCHIVE.
- Agent-server WebSocket `/ws/agent` accepts connections **without authentication** and does not Pydantic-validate inbound payloads — highest security finding for satellite stack.
- Local `yarn verify:*` is stricter than GitHub CI (agent-server pytest + Bun PnP wrapper); docs-only PRs can skip CI via `paths-ignore`.

---

## 2. Redundancy matrix

| Area | Paths | Label | Rationale |
|------|-------|-------|-----------|
| Agent contract Zod | `next-forge/packages/schemas/` | **CANONICAL** | Single writer for TS contract; golden fixture + `ws-contract.test.ts` |
| Agent-server Pydantic | `GenerativeUI_monorepo/apps/agent-server/src/models/schemas.py` | **SATELLITE** | Must mirror golden; keep in Python stack |
| Legacy Zod package | `GenerativeUI_monorepo/packages/shared-schemas/` | **FREEZE** | Redundant mirror of `@repo/schemas`; no new fields; prefer thin re-export of golden validation only |
| Golden fixtures | `next-forge/packages/schemas/fixtures/genui-agent-contract.golden.json` + agent-server `tests/fixtures/` | **CANONICAL** (forge copy) | Sync both on version bump; add byte-identity check to CI |
| GenerativeCanvas (forge) | `next-forge/apps/app/app/(authenticated)/generative-ui/generative-canvas.tsx` | **CANONICAL** | Phase 3 client island; owns reconnect via `use-agent-state` |
| GenerativeCanvas (legacy UI) | `GenerativeUI_monorepo/apps/web-dashboard/src/components/GenerativeCanvas.tsx` | **FREEZE** | Phase 4 deprecate; no feature parity work |
| GenerativeCanvas (root) | `src/app/canvas/GenerativeCanvas.tsx` (19L stub) | **ARCHIVE** | Empty placeholder; supersede after phase 4 sign-off |
| Agent state hook | `next-forge/.../hooks/use-agent-state.ts` (250L) | **CANONICAL** | Exponential reconnect + visibility reset |
| Component registry | `src/components/registry/{StatCard,ChartCard,DataTable}.tsx` | **PORT** | Active ECL `porting-guide-component-registry` → Storybook + design-system |
| Workshop stories | `next-forge/apps/storybook/stories/modme-workshop.stories.tsx` | **CANONICAL** (target) | Migration landing zone for registry molecules |
| Toolset management | `agent/toolset_manager.py` (230L), `scripts/toolset-management/` | **PORT** | ECL `porting-guide-toolset-management` |
| Schema crawler | `agent/tools/schema_crawler_tool.py` (251L) | **PORT** | ECL `porting-guide-schema-crawler` → molecule orchestrator |
| Knowledge / ChromaDB | legacy agent knowledge paths | **PORT** | ECL `porting-guide-knowledge-chromadb` → inbox + Supabase |
| GenAI Toolbox | root `agent/` tools | **ARCHIVE** (satellite doc) | ECL `porting-guide-genai-toolbox` as `legacy_satellite` molecule |
| agent-server app | `GenerativeUI_monorepo/apps/agent-server/` | **SATELLITE** | Keep Python; hexagonal WS adapter present |
| web-dashboard | `GenerativeUI_monorepo/apps/web-dashboard/` | **FREEZE** | Phase 4 cutover deprecation |
| Root `src/` + `agent/` | repo root | **ARCHIVE** | Per `docs/migration/phase4-cutover.md`; do not extend |
| Root types | `src/lib/types.ts` | **ARCHIVE** | Incompatible with golden contract (`elements` model) |
| CMS types | `next-forge/packages/cms/basehub-types.d.ts` (1750L) | **CANONICAL** (generated) | Waived for 1k-line rule — do not hand-edit |
| UniversalWorkbench* | under GenerativeUI | **FREEZE** (read-only) | Out of scope unless tasked |

---

## 3. Structural blockers (thermo-nuclear approval bar)

| ID | Severity | Finding | Disposition |
|----|----------|---------|-------------|
| S1 | **High** | `/ws/agent` has no auth/session gate (`websocket_route.py` accepts any client) | Not a merge blocker for docs-only review; **must fix before production cutover** |
| S2 | **High** | Inbound WS messages use `json.loads` + dict access; not validated with `WebSocketMessage` Pydantic model | Same as S1 — add inbound validation |
| S3 | **Medium** | Golden fixtures not byte-identical (2694 vs 2640 bytes; formatting of `agentStateStatuses`) | Add CI identity check; normalize formatting |
| S4 | **Medium** | `docs/STATUS.md` listed `harness-setup-dual-monorepo` as active while change lives in `harness/changes/archive/` | **Fixed in this run** |
| S5 | **Low** | No hand-written file in hotspots exceeds 1k lines | PASS — approval bar met for size |
| S6 | **None** | Cross-monorepo `workspace:*` imports | PASS — none found |

**Approval:** Structural size bar PASS. Security items S1–S2 are **waived for this baseline audit** with explicit cutover precondition (must not ship agent-server publicly without WS auth).

---

## 4. Code-judo restructuring opportunities (prioritized)

1. **Single reconnect owner (P0)** — Keep `use-agent-state` + `reconnect-delay` only in forge. Freeze web-dashboard canvas; do not port features back. Root stub stays empty until archive.
2. **Single-writer golden JSON (P0)** — Treat forge fixture as source of truth; generate or copy to agent-server in a verify step; fail CI on hash mismatch.
3. **Thin `shared-schemas` (P1)** — Stop hand-editing legacy Zod; either delete after web-dashboard freeze or re-export types from a published `@repo/schemas` package (HTTP/npm, not `workspace:*`).
4. **Registry port (P1)** — Complete `porting-guide-component-registry` first among ECL slices (highest UI reuse, Storybook already present).
5. **Toolset + schema-crawler (P2)** — Port to `scripts/toolset-management` + molecule index; keep runtime tools in agent-server only if still needed at runtime.
6. **Root archive (P2)** — After phase 4 sign-off, move `src/` + `agent/` to `archive/legacy-genui-root/` per cutover doc.

---

## 5. CI parity gaps (GitHub vs local verify)

| Gap | Local (`yarn verify:*`) | GitHub `ci.yml` | Risk |
|-----|-------------------------|-----------------|------|
| Bun PnP / Windows wrapper | `scripts/run-forge-bun.ps1` via `verify-forge-ci.ps1` | Direct `bun install` + `bun run *` | Low on Linux GH; **document** that local Windows must use wrapper |
| Agent-server golden pytest | `verify-generative-ci.ps1` step `2b/3` | **Missing** — generative job only `yarn lint/test/build` in monorepo root | **High** — contract drift can merge without pytest |
| Docs / ECL-only PRs | `yarn lint:harness` always runnable | `paths-ignore: **.md`, `docs/**` can skip **entire workflow** | **Medium** — STATUS/ECL doc drift not CI-gated unless `harness/**` also changes |
| Molecule contract | `yarn molecule-index:verify` | Present as `molecule-contract` job (path-filtered) | OK when schemas change |
| E2E | Local Playwright + agent-server | `e2e-smoke` continues-on-error; no live agent-server | Expected — run locally |

**Recommendations:**

1. Add agent-server `pytest tests/test_schemas_contract.py` (or equivalent) to `generative-ui` job.
2. Narrow `paths-ignore` so `docs/STATUS.md`, `docs/ECL.md`, and `harness/**` always run `harness-lint` (or remove docs from ignore and rely on path filters).
3. Optional: golden fixture byte-identity step in `molecule-contract` job.

---

## 6. ECL slice disposition

| Slice | Location | Disposition | Rank |
|-------|----------|-------------|------|
| `porting-guide-component-registry` | `harness/changes/active/` | **Complete next** — Storybook target exists; unchecked acceptance (manifest entry + contract test) | 1 |
| `porting-guide-schema-crawler` | active | **Complete** after registry — aligns with molecule index | 2 |
| `porting-guide-toolset-management` | active | **Complete** — scripts already under `scripts/toolset-management/` | 3 |
| `porting-guide-knowledge-chromadb` | active | **Park until inbox pipeline green** — depends on Supabase/inbox contracts | 4 |
| `porting-guide-genai-toolbox` | active | **Park / document as legacy_satellite** — do not port into forge | 5 |
| `harness-setup-dual-monorepo` | **`harness/changes/archive/`** | **Already archived** — STATUS drift fixed this run | — |

All five active porting-guide slices still have **unchecked** acceptance criteria (`[ ]` in CHANGE.md). None are complete.

---

## 7. Skill / resource recommendations

| Skill / resource | Status this run | Note |
|------------------|-----------------|------|
| `modme-migration-review` collection | Partial | 10 local skills skipped (already present); 5 vendor paths unresolved |
| `legacy-modernizer` | Installed in worktree `.agents/skills/` | Use for root archive planning |
| `playwright-skill` | Installed in worktree | Use for cutover E2E |
| `parallel-agents` | Partial install | Network/auth failures on some `npx skills add` targets |
| `thermo-nuclear-code-quality-review` | Used via rubric (orchestrator) | Plugin skill path not resolved by install-agents |
| Disk / worktrees | **Human action** | C: drive was <1GB free; stale worktrees removed; sparse checkout used (excluded `src/models/gemma3n`) |

---

## 8. Action items

| # | Owner | Action | Verify |
|---|-------|--------|--------|
| 1 | Platform | Add agent-server golden pytest to GH `generative-ui` job | PR to `ci.yml`; `yarn verify:generative` |
| 2 | Platform | Fix `paths-ignore` so harness/STATUS changes always run `harness-lint` | Push docs-only PR; confirm job runs |
| 3 | Agent-server | Add WS auth (token/session) + inbound Pydantic validation | Manual WS probe without token fails |
| 4 | Schemas | Enforce golden fixture byte-identity between stacks | Hash check in `molecule-contract` or schema tests |
| 5 | Migration | Complete `porting-guide-component-registry` acceptance | `yarn molecule-index:verify` + Storybook smoke |
| 6 | Migration | Freeze web-dashboard features; route all GenUI work to forge island | Code review policy |
| 7 | Migration | After phase 4 sign-off, archive root `src/` + `agent/` | `docs/migration/phase4-cutover.md` checklist |
| 8 | Human | Free disk / prune worktrees regularly; untrack `src/models/gemma3n/node_modules` if still in git | `git worktree list`; disk free >10GB |

---

## Agent contributions (wave map)

| Lane | Finding |
|------|---------|
| orchestrator | Sparse worktree (disk pressure); doctor + lint:harness PASS; STATUS drift fixed |
| explorer-forge | Forge island + `@repo/schemas` CANONICAL; generated CMS types waived |
| explorer-legacy | FREEZE web-dashboard; SATELLITE agent-server; ARCHIVE root |
| contract-auditor | Golden semantic match; root types.ts incompatible |
| security | Unauthenticated WS; no inbound schema validation |
| performance | Forge reconnect capped; visibility reset intentional |
| correctness | Schema triple aligned; formatting-only golden drift |
| readability | No 1k hand-written violations in hotspots |
| thermo-reviewer-forge | Boundaries PASS; size bar PASS |
| thermo-reviewer-legacy | PORTING_GUIDE slices ranked; archive readiness confirmed for root |
| test-engineer | Gates recorded in section 9 |

---

## 9. Verification gates

| Gate | Command | Status |
|------|---------|--------|
| Worktree doctor | `yarn worktree:doctor` | **PASS** (2 warns: hooks, supabase env) |
| Harness lint | `yarn lint:harness` | **PASS** |
| Molecule index | `yarn molecule-index:verify` | **PASS** (13 molecules; vitest 2/2) |
| Forge verify | `yarn verify:forge` | **FAIL** — `bun run check` (Ultracite/Biome): 50 format/lint issues (CRLF + import order baseline debt; not introduced by this review) |
| Generative verify | `yarn verify:generative` | **FAIL** — sparse worktree lacks `GenerativeUI_monorepo/node_modules`; run `yarn install` in GenerativeUI or use junction from main checkout |

---

## Related

- Prior run: [`thermo-nuclear-forge-2026-06-28.md`](./thermo-nuclear-forge-2026-06-28.md)
- Runbook: [`docs/workflows/thermo-nuclear-dual-monorepo-review.md`](../thermo-nuclear-dual-monorepo-review.md)
- Phase 4: [`docs/migration/phase4-cutover.md`](../../migration/phase4-cutover.md)
- Agent index: [`docs/agent-index.md`](../../agent-index.md)
