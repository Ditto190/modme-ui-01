#!/usr/bin/env bash
# ADR-0016 — llama.cpp fallback (installed + configured; not primary).
set -euo pipefail

MODEL_DIR="${MODME_MODEL_DIR:-./models/gemma4-v2}"
GGUF="${MODEL_DIR}/gemma4-v2-Q4_K_M.gguf"
PORT="${LLAMA_CPP_PORT:-18080}"

if [[ ! -f "${GGUF}" ]]; then
  echo "Missing ${GGUF}"
  exit 1
fi

exec llama-server \
  -m "${GGUF}" \
  --ctx-size 16384 \
  --n-gpu-layers 99 \
  --jinja \
  --temp 1.0 \
  --top-p 0.95 \
  --top-k 64 \
  --host 0.0.0.0 \
  --port "${PORT}"
