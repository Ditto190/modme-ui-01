# Scripts + UW test baseline (2026-07-05)



Post-migration audit after plan implementation.



## Root orchestration (vitest)



- Command: `yarn test:orchestration` / `yarn inbox:test`

- **108 passed**, 2 skipped (110 total) across 17 files

- Fix: strip `#!` shebang via vitest plugin for `scripts/lib/**` imports

- Fix: `detectAgentPlatform({ __isolate: true })` for env-isolated adapter tests



## Knowledge management (vitest project)



- Command: `yarn test:knowledge-management`

- Jest removed; `embeddings/embeddings.test.ts` covers EmbeddingService unit paths

- Mock `@xenova/transformers` in `embeddings/setup.ts`



## Python CLIs



- `scripts/tests/test_dsp_cli.py`: **15 passed**

- Command: `yarn test:scripts:python`



## Brooks-test notes



| Suite | Status |

|-------|--------|

| `observability-integration.test.mjs` | Green — aligned fixtures + isolated platform detection |

| `issue-autotag.test.mjs` | Green — vitest + shebang plugin |

| `polis-router.test.mjs` | Green — `data/agent-citizens/*.yaml` fixtures |

| `uw-api-contract.test.mjs` | Green — static API contract guards |

| `knowledge-management` | Green — focused embedding unit tests |



## UniversalWorkbench



- Vitest globs: `**/*.{test,spec}.{ts,tsx}` + integration patterns

- Coverage thresholds: 40% global, 60% `packages/shared/**`

- Frontend-architecture pilot: `apps/web/src/modules/home/` + `shared/api-client/`

- API smoke: `apps/api/src/server.smoke.test.ts`

- Playwright smoke: `apps/web/e2e/home.smoke.spec.ts` (`yarn test:e2e:smoke` in UW)



## Trunk + mise



- `yarn trunk:check` → `trunk check --ci` (advisory in `verify:scripts` when trunk on PATH)

- Root `mise.toml` with verify task templates

- `yarn verify:scripts` → orchestration + km vitest + pytest + bats



## Dolt ADR



- `docs/architecture/decisions/0010-dolt-catalog-cms-evaluation.md` — defer adoption; git + Supabase remain canonical

