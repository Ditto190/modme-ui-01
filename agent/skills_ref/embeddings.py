"""Minimal, dependency-free embeddings shim.

This is a placeholder that produces a deterministic hex digest for text.
Replace with real embedding calls (OpenAI/Gemini) as needed.
"""

import hashlib


def embed_text(text: str) -> str:
    """Return a hex string representing a pseudo-embedding."""
    h = hashlib.sha256()
    h.update(text.encode("utf-8"))
    return h.hexdigest()


if __name__ == "__main__":
    print(embed_text("hello world"))
