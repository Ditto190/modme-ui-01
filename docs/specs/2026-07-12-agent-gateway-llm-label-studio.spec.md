# Spec: Agent Gateway + vLLM + Label Studio Full Loop

## Objective

Serve Gemma4-12B agentic GGUF via **vLLM** in a **MicroVM Docker** host, wrap an OpenAI-compatible endpoint in **Agent Gateway** (resource / network / buffering), and run a **fully agent-driven** Inbox → Label Studio → Knowledge promotion loop. Humans supervise operations and evaluate benchmarks; Label Studio is the visualization/control plane.

## Tech Stack

| Concern | Choice |
| --- | --- |
| Primary LLM runtime | vLLM + `vllm-gguf-plugin` |
| Model | `yuxinlu1/gemma-4-12B-agentic-fable5-composer2.5-v2-3.5x-tau2-GGUF` (Q4_K_M) |
| Fallback | llama.cpp `llama-server` (installed, secondary profile) |
| Proxy | Agent Gateway Layer 4 (`config/agentgateway/`, ADR architecture/0012) |
| Annotation UI | Label Studio `:8081` + ML Backend `:9090` |
| Knowledge SoR | Inbox contract + Supabase pgvector (ADR-0015) |
| Work SoR | Beads |
| Clipper | Existing `templates/obsidian-clipper/*` (extend, do not recreate) |
| Lifecycle | next-forge ADR-0012 bounded parallel waves (max 2) |

## Commands

```powershell
# Toolchain
mise trust; mise install
devbox run -- health

# Model
hf download yuxinlu1/gemma-4-12B-agentic-fable5-composer2.5-v2-3.5x-tau2-GGUF `
  --include "gemma4-v2-Q4_K_M.gguf" --local-dir ./models/gemma4-v2

# Serve (MicroVM)
docker compose -f config/vllm/docker-compose.microvm.yml --profile primary up -d

# Gateway health
curl -H "x-modme-gateway-namespace: local-llm" http://127.0.0.1:8080/v1/models

# Inbox → LS
yarn intake:orchestrate
node scripts/label-studio/sync-inbox-tasks.mjs

# Promote
node scripts/label-studio/promote-approved.mjs
```

## Project Structure

```
docs/adr/0016-vllm-microvm-agent-gateway.md
docs/adr/0017-label-studio-ai-annotation-loop.md
docs/adr/TODO-0018-obsidian-first-auto-tagging-option-a.md
docs/specs/2026-07-12-agent-gateway-llm-label-studio.spec.md
docs/local-llm/vllm-microvm.md
docs/architecture/Project_Architecture_Blueprint-agent-gateway-llm.md
config/vllm/docker-compose.microvm.yml
config/vllm/serve-gemma4.sh
config/vllm/llama-cpp-fallback.sh
config/agentgateway/routes.example.yaml          # extend
config/agentgateway/policies/resource-management.yaml
services/label-studio-ml/modme_inbox_backend/
scripts/label-studio/sync-inbox-tasks.mjs
scripts/label-studio/promote-approved.mjs
templates/obsidian-clipper/modme-inbox-interpreter-ollama.json  # extend → gateway
data/agent-citizens/label-studio-annotator.yaml
```

## Code Style

Follow repo conventions: kebab-case files, Zod for contracts, early returns, no secrets in git. Prefer extending existing clipper JSON and `polis-router` (already at root) over new parallel systems.

## Testing Strategy

| Level | What |
| --- | --- |
| Unit | Route policy YAML load; sync-inbox dry-run; promote filter |
| Contract | Inbox contract v1 + LS task payload shape |
| Integration | Gateway → vLLM `/v1/chat/completions` smoke |
| Human | LS Data Manager low-confidence queue + benchmark acceptance rate |

## Boundaries

- **Always:** lean-ctx for repo I/O; respect ADR-0015 router layering; max 2 parallel agent starts; renumber ADRs from 0016.
- **Ask first:** GPU MicroVM host choice; production deploy of agentgateway-modme; changing inbox contract schema.
- **Never:** Commit HF tokens; recreate Obsidian unique-note pack; merge polis into GenUI routes; claim ADR 0013–0015.

## Success Criteria

1. Spec + ADR-0016/0017/TODO-0018 indexed.
2. `curl` OpenAI models via gateway namespace `local-llm`.
3. Clip → auto-tag → LS prediction visible → human approve → Supabase promote.
4. Option A deferred with beads TODO.
5. Wave commits serial; no P0/P1 from code-reviewer on docs/infra.

## Open Questions (tracked, non-blocking for Phase 0)

- Gemma4 `--tool-call-parser` exact flag for target vLLM version.
- WSL2 GPU passthrough vs dedicated MicroVM hypervisor (`cloud-hypervisor` / qemu) — see toolchain_km_microvm plan.
