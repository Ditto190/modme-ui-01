"""
Relations Finder — Discovers bidirectional links between entries via
keyword overlap and pgvector cosine similarity.

@feature INBOX.ENTRY.CATEGORIZE
@domain INBOX
@layer AGENT
"""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Any

try:
    from autogen import AssistantAgent

    AG2_AVAILABLE = True
except ImportError:
    AssistantAgent = Any
    AG2_AVAILABLE = False

try:
    from supabase import Client
except ImportError:
    Client = Any

from ..models.schemas import InboxEntryInput


SEVERITY_RANK = {"low": 1, "medium": 2, "high": 3, "critical": 4}


class RelationsFinder:
    """Finds lightweight semantic relations between inbox entries."""

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        self.config = config or {}
        self.agent: AssistantAgent | None = None
        self.supabase: Client | None = self.config.get("supabase_client")

        if AG2_AVAILABLE:
            self.agent = AssistantAgent(
                name="RelationsFinder",
                system_message=(
                    "Discover related inbox entries using shared concepts, ADR signals, "
                    "and vector-friendly semantic overlap."
                ),
                llm_config={
                    "model": self.config.get("model", "gpt-4"),
                    "api_key": self.config.get("api_key", ""),
                    "temperature": 0,
                },
            )

    def _text_for_entry(self, entry: InboxEntryInput) -> str:
        return " ".join(
            filter(
                None,
                [
                    entry.title,
                    entry.summary,
                    entry.raw_content,
                    entry.extracted_text,
                    " ".join(entry.tags),
                ],
            )
        ).lower()

    def _tokenize(self, text: str) -> set[str]:
        return {
            token
            for token in re.findall(r"[a-z0-9][a-z0-9_\-]{2,}", text)
            if token not in {"the", "and", "for", "with", "from", "this"}
        }

    def _cosine_similarity(self, left: str, right: str) -> float:
        left_counter = Counter(self._tokenize(left))
        right_counter = Counter(self._tokenize(right))
        if not left_counter or not right_counter:
            return 0.0

        shared = set(left_counter) & set(right_counter)
        numerator = sum(left_counter[token] * right_counter[token] for token in shared)
        left_norm = math.sqrt(sum(value * value for value in left_counter.values()))
        right_norm = math.sqrt(sum(value * value for value in right_counter.values()))
        if not left_norm or not right_norm:
            return 0.0
        return numerator / (left_norm * right_norm)

    def find_keyword_relations(
        self, entry: InboxEntryInput, candidates: list[InboxEntryInput]
    ) -> list[dict[str, Any]]:
        """Find deterministic relations using keyword overlap and text similarity."""
        base_text = self._text_for_entry(entry)
        base_tokens = self._tokenize(base_text)
        relations: list[dict[str, Any]] = []

        for candidate in candidates:
            if candidate.content_hash == entry.content_hash:
                continue

            candidate_text = self._text_for_entry(candidate)
            overlap = base_tokens & self._tokenize(candidate_text)
            similarity = self._cosine_similarity(base_text, candidate_text)
            confidence = max(similarity, min(len(overlap) / 10, 0.95))
            if not overlap and confidence < 0.2:
                continue

            relation_type = "related"
            if candidate.category_id and candidate.category_id == entry.category_id:
                relation_type = "same-category"
            if self.detect_adr_candidate(entry) and self.detect_adr_candidate(candidate):
                relation_type = "adr-cluster"

            relations.append(
                {
                    "from_entry_id": entry.content_hash,
                    "to_entry_id": candidate.content_hash,
                    "relation_type": relation_type,
                    "confidence": round(confidence, 3),
                }
            )

        return sorted(relations, key=lambda relation: relation["confidence"], reverse=True)

    def detect_adr_candidate(self, entry: InboxEntryInput) -> bool:
        """Identify entries suitable for ADR generation or linkage."""
        tag_set = set(entry.tags)
        has_architecture_signal = "architecture" in tag_set or "decision" in tag_set
        return has_architecture_signal and SEVERITY_RANK.get(entry.severity, 2) >= 3
