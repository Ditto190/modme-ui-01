#!/usr/bin/env bash
# ADR-0016 — primary vLLM serve for Gemma4 GGUF (MicroVM / Docker host).
set -euo pipefail

MODEL_DIR="${MODME_MODEL_DIR:-./models/gemma4-v2}"
GGUF="${MODEL_DIR}/gemma4-v2-Q4_K_M.gguf"
PORT="${VLLM_PORT:-8000}"
PARSER="${VLLM_TOOL_CALL_PARSER:-hermes}"

if [[ ! -f "${GGUF}" ]]; then
  echo "Missing ${GGUF}. Download with:"
  echo "  hf download yuxinlu1/gemma-4-12B-agentic-fable5-composer2.5-v2-3.5x-tau2-GGUF \\"
  echo "    --include 'gemma4-v2-Q4_K_M.gguf' --local-dir ${MODEL_DIR}"
  exit 1
fi

python -m pip install --quiet 'vllm' 'vllm-gguf-plugin' || true

exec vllm serve "${GGUF}" \
  --tokenizer google/gemma-4-12B-it \
  --host 0.0.0.0 \
  --port "${PORT}" \
  --max-model-len 16384 \
  --gpu-memory-utilization 0.90 \
  --enable-auto-tool-choice \
  --tool-call-parser "${PARSER}"
