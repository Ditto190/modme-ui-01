---
title: "ADR-0016: vLLM in MicroVM behind Agent Gateway (OpenAI-compatible)"
status: "Proposed"
date: "2026-07-12"
authors: "Cursor agent"
tags: ["architecture", "decision", "llm", "vllm", "agent-gateway", "microvm"]
supersedes: ""
superseded_by: ""
related:
  - "docs/architecture/decisions/0012-agent-gateway-mcp-routing.md"
  - "next-forge/docs/adr/0012-bounded-parallel-agent-lifecycle.md"
  - "docs/adr/0015-router-layering-km-polis-genui.md"
  - ".cursor/plans/toolchain_km_microvm_41634f62.plan.md"
---

## Status

**Proposed**

## Context

We need a local, private coding/agentic LLM for ModMe agents, Obsidian Interpreter, and Label Studio ML backends. The selected weights are GGUF:

`yuxinlu1/gemma-4-12B-agentic-fable5-composer2.5-v2-3.5x-tau2-GGUF` (recommended quant **Q4_K_M**).

Agent Gateway ([architecture ADR-0012](../architecture/decisions/0012-agent-gateway-mcp-routing.md)) is Layer 4 above lean-ctx for A2A/MCP/LLM routing. Phase 1 of that ADR shipped config stubs only. Concurrent toolchain work ([toolchain_km_microvm plan](../../.cursor/plans/toolchain_km_microvm_41634f62.plan.md)) targets WSL2 MicroVM sandboxes but previously claimed ADR-0013 — that number is already taken by observability ([ADR-0013](./0013-observability-pipeline-entry-points-and-session-trace-config.md)).

Requirements confirmed by product owner:

1. **vLLM primary** (PagedAttention, continuous batching, OpenAI API) inside **MicroVM Docker**.
2. **llama.cpp installed and configured** as fallback only.
3. OpenAI-compatible endpoint **wrapped by Agent Gateway** with resource management, network isolation, and request buffering.

## Decision

1. Serve Gemma4 GGUF via **vLLM** + `vllm-gguf-plugin`, tokenizer `google/gemma-4-12B-it`, port **8000** inside the MicroVM.
2. Expose clients only through Agent Gateway listener **8080**, namespace header `x-modme-gateway-namespace: local-llm`, path prefix `/v1`.
3. Install **llama.cpp** on port **18080** under compose profile `fallback`; gateway health-check fails over when vLLM is unhealthy.
4. Gateway policies: `max_inflight: 4`, `queue_depth: 32`, `request_timeout_ms: 120000`, `rate_limit_rpm: 60` (aligns with `max_parallel_agents: 4`).
5. Keep lean-ctx **direct** for repo I/O (not proxied) per architecture ADR-0012 Phase 1 intent.
6. Document sampling for Gemma4 agentic use: `temp 1.0`, `rep_pen 1.1`, `top_p 0.95`, `top_k 64`; preserve OpenAI `tools` field.

## Alternatives Considered

### llama.cpp only

- Pros: Matches model README Option A; lower ops complexity.
- Cons: Weaker continuous batching / multi-tenant throughput for concurrent agents.
- Rejected as primary; retained as fallback.

### Ollama

- Pros: Simple UX.
- Cons: Less control over Gemma4 jinja/tool protocol.
- Rejected for agentic gateway path.

### HF Inference Endpoint

- Pros: No local VRAM.
- Cons: Breaks local-first / privacy default.
- Deferred; not this ADR.

### Claiming ADR-0013 for MicroVM

- Rejected — slot taken by observability; this decision is **0016**.

## Consequences

### Positive

- Central rate limits and buffering for parallel research agents (Gas City / next-forge ADR-0012 budgets).
- Clear failover path without changing client base URLs (gateway only).
- Aligns MicroVM sandbox plan with LLM serving without ADR number collisions.

### Negative

- vLLM GGUF + Gemma4 tool parser may need version pinning and jinja validation.
- Extra service (gateway) vs calling vLLM directly.
- GPU passthrough on Windows/WSL2 remains an ops risk.

## Implementation Notes

- Config: `config/vllm/docker-compose.microvm.yml`, `config/agentgateway/routes.example.yaml`, `config/agentgateway/policies/resource-management.yaml`.
- Ports: Gateway 8080, vLLM 8000, llama.cpp 18080, Label Studio 8081 (see ADR-0017).
- Single-writer artifacts: route YAML and compose files — edit in infra wave only after docs gate.

## References

- Model card: https://huggingface.co/yuxinlu1/gemma-4-12B-agentic-fable5-composer2.5-v2-3.5x-tau2-GGUF
- vLLM GGUF: https://github.com/vllm-project/vllm/blob/main/docs/features/quantization/gguf.md
- Spec: [`docs/specs/2026-07-12-agent-gateway-llm-label-studio.spec.md`](../specs/2026-07-12-agent-gateway-llm-label-studio.spec.md)
