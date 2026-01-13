"""Lightweight journal storage and simple search/indexing.

Stores entries as JSON lines with fields: id, ts, text, tags, embedding
"""

import json
import uuid
from datetime import datetime
from pathlib import Path

from .embeddings_gemma3n import embed_text_gemma3n as embed_text

class Journal:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.write_text("")

    def add(self, text: str, tags=None):
        tags = tags or []
        entry = {
            "id": str(uuid.uuid4()),
            "ts": datetime.utcnow().isoformat(),
            "text": text,
            "tags": tags,
            "embedding": embed_text(text)
        }
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        return entry

    def list(self):
        for line in self.path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            yield json.loads(line)

    def search(self, query: str, top_k=10):
        qvec = embed_text(query)
        # simple cosine-like similarity over hex bytes -> integer dot product proxy
        def score(e):
            a = int(e.get("embedding"), 16)
            b = int(qvec, 16)
            # avoid huge ops; use xor-distance inverted
            return -(a ^ b)

        items = list(self.list())
        items.sort(key=score, reverse=True)
        return items[:top_k]
