# Workflow

1. `loadRootEnv` — root `.env` wins.
2. `openPipelineRun` — capture `pipeline_run_id`.
3. Collect sources (JSONL, envelopes, test-results).
4. `bridgeCollectPayload` — Zod normalize → store → optional promote.
5. `closePipelineRun` with stats JSON.
6. Print `{ result, stats, pipeline_run_id }` to stdout.
