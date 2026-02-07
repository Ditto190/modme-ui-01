---
name: Text Embeddings
description: Foundational utility for text vectorization using Gemma models.
id: text-embeddings
version: 1.0.0
license: MIT
---

# Text Embeddings

Provides text-to-vector transformation for semantic applications.

## Tools

### `embed_text`
Generates a vector embedding for the input string.

## Technical Details
- Model: Gemma 3B/9B (via `gemma3n`).
- Output: Hex-encoded byte string for similarity calculations.
