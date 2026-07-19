---
title: "ADR-0017: Label Studio AI-driven annotation loop (Option C)"
status: "Accepted"
date: "2026-07-12"
authors: "Cursor agent"
tags: ["architecture", "decision", "label-studio", "inbox", "knowledge-management"]
supersedes: ""
superseded_by: ""
related:
  - "docs/adr/0014-km-c4-ownership-taxonomy.md"
  - "docs/adr/0015-router-layering-km-polis-genui.md"
  - "docs/adr/0016-vllm-microvm-agent-gateway.md"
  - "docs/adr/TODO-0018-obsidian-first-auto-tagging-option-a.md"
---

## Status

**Accepted** (product direction); implementation phased.

## Context

Inbox capture (Obsidian Web Clipper → `GenerativeUI_monorepo/docs/inbox/`) already feeds MDA categorize (`mda-categorize.mjs`) and Supabase. Label Studio research clips describe install + labeling UI. Product owner chose **Option C — full loop**, with these constraints:

- Pipeline is **fully AI agent + embedding model driven**.
- **Humans supervise** operations/results and evaluate **benchmarks**.
- Label Studio is the **platform through which the pipeline is visualized** (control plane), not the primary manual labeling factory.
- Option A (Obsidian-only auto-tag) is deferred — see [TODO-0018](./TODO-0018-obsidian-first-auto-tagging-option-a.md).

ADR-0015 freezes router layering: **Inbox MDA** owns knowledge classification SoR; polis owns citizen/session routing; GenUI utterance routes stay frozen.

## Decision

1. Run Label Studio on **:8081** (avoid Gateway :8080 collision).
2. ML Backend (`services/label-studio-ml/modme_inbox_backend`) calls Agent Gateway `local-llm` + embedding similarity (pgvector) to produce **predictions** with `model_version` + confidence scores.
3. Sync path: inbox entry → `scripts/label-studio/sync-inbox-tasks.mjs` → LS tasks + predictions.
4. Human role: filter low-confidence queue, correct outliers, record acceptance rate as benchmark.
5. Promote path: approved / high-confidence predictions → `promote-approved.mjs` → existing Supabase knowledge promote (no second SoR).
6. Polis citizen `label-studio-annotator` triggers on `GenerativeUI_monorepo/docs/inbox/**` only — does **not** merge into GenUI utterance routers.

## Alternatives Considered

### Option A — Obsidian Interpreter + mda-categorize only

- Pros: Already partially landed (`modme-inbox-interpreter-ollama.json`, unique-note pack).
- Cons: No visual QA queue or model_version benchmarks.
- Deferred to TODO-0018.

### Option B — Label Studio human review without ML backend

- Pros: Simpler ops.
- Cons: Contradicts “fully AI agent driven” requirement.
- Rejected as primary; humans remain supervisors only.

### Manual Label Studio as source of truth for tags

- Rejected — inbox contract + Supabase remain knowledge SoR (ADR-0015).

## Consequences

### Positive

- Visual control plane for intake quality; measurable prediction acceptance.
- Reuses gateway LLM (ADR-0016) and existing MDA/embed pipeline.
- Clear separation from polis and GenUI routers.

### Negative

- Additional compose services (LS + ML backend).
- Port remapping vs Label Studio defaults.
- Sync/promote scripts become single-writer for LS project config.

## Implementation Notes

- Label config: text + category Choices + severity + tags TextArea.
- Benchmarks: store under `logs/agent-orchestrator/benchmarks/` keyed by `model_version`.
- Extend existing clipper templates; do not recreate the unique-note pack.

## References

- Inbox pipeline: [`docs/inbox-pipeline/README.md`](../inbox-pipeline/README.md)
- Clip: Label Studio quick start inbox note under `GenerativeUI_monorepo/docs/inbox/web-clipper/`
- Spec: [`docs/specs/2026-07-12-agent-gateway-llm-label-studio.spec.md`](../specs/2026-07-12-agent-gateway-llm-label-studio.spec.md)
