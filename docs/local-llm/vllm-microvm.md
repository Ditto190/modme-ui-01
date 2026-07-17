# Local LLM — vLLM MicroVM (ADR-0016)

Serve Gemma4 agentic GGUF via **vLLM** inside MicroVM Docker; clients talk only to **Agent Gateway** (`:8080`, namespace `local-llm`).

## Model

| Field | Value |
| --- | --- |
| Repo | `yuxinlu1/gemma-4-12B-agentic-fable5-composer2.5-v2-3.5x-tau2-GGUF` |
| Quant | `gemma4-v2-Q4_K_M.gguf` (~7.4 GB) — recommended |
| Tokenizer | `google/gemma-4-12B-it` |
| License | Apache 2.0 |

```powershell
hf download yuxinlu1/gemma-4-12B-agentic-fable5-composer2.5-v2-3.5x-tau2-GGUF `
  --include "gemma4-v2-Q4_K_M.gguf" --local-dir ./models/gemma4-v2
```

## Ports

| Service | Port | Role |
| --- | --- | --- |
| Agent Gateway | 8080 | Client entry (required) |
| vLLM | 8000 | Primary OpenAI API |
| llama.cpp | 18080 | Fallback profile |
| Label Studio | 8081 | ADR-0017 visualization |
| ML Backend | 9090 | ADR-0017 predictions |

## Bring up (primary)

```powershell
$env:MODME_MODEL_DIR = (Resolve-Path ./models).Path
docker compose -f config/vllm/docker-compose.microvm.yml --profile primary up -d
curl -H "x-modme-gateway-namespace: local-llm" http://127.0.0.1:8080/v1/models
```

Host scripts (no compose):

```bash
bash config/vllm/serve-gemma4.sh
# fallback only:
bash config/vllm/llama-cpp-fallback.sh
```

## Sampling (agentic)

`temperature=1.0`, `top_p=0.95`, `top_k=64`, `repetition_penalty=1.1`. Preserve OpenAI `tools`. See `config/agentgateway/policies/resource-management.yaml`.

## Related

- [ADR-0016](../adr/0016-vllm-microvm-agent-gateway.md)
- [Spec](../specs/2026-07-12-agent-gateway-llm-label-studio.spec.md)
- Gateway stub: [`config/agentgateway/routes.example.yaml`](../../config/agentgateway/routes.example.yaml)
- MicroVM toolchain plan: `.cursor/plans/toolchain_km_microvm_41634f62.plan.md`
