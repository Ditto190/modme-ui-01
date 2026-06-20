"""
Syntactic Mapper — Maps entries to taxonomy categories and output schemas.

@feature INBOX.ENTRY.CATEGORIZE
@domain INBOX
@layer AGENT
"""

from __future__ import annotations

import re
from typing import Any

try:
    from autogen import AssistantAgent

    AG2_AVAILABLE = True
except ImportError:
    AssistantAgent = Any
    AG2_AVAILABLE = False

from ..models.schemas import InboxEntryInput


class SyntacticMapper:
    """Maps enriched entries into output schema metadata."""

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        self.config = config or {}
        self.agent: AssistantAgent | None = None

        if AG2_AVAILABLE:
            self.agent = AssistantAgent(
                name="SyntacticMapper",
                system_message=(
                    "Map inbox entries to downstream schema types and stable metadata."
                ),
                llm_config={
                    "model": self.config.get("model", "gpt-4"),
                    "api_key": self.config.get("api_key", ""),
                    "temperature": 0,
                },
            )

    def map_to_output_schema(self, entry: InboxEntryInput) -> str | None:
        """Return a best-fit downstream schema type."""
        tag_set = set(entry.tags)
        title = (entry.title or "").lower()

        if "agent" in tag_set or "prompt" in title:
            return "agent"
        if "component" in tag_set or entry.source_format == "jsx":
            return "component"
        if "frontend" in tag_set and "storybook" in (entry.raw_content or "").lower():
            return "storybook"
        if "documentation" in tag_set or entry.source_format in {"md", "txt", "html"}:
            return "doc"
        if entry.entry_type == "solution":
            return "skill"
        return None

    def generate_slug(self, title: str) -> str:
        """Generate a kebab-case slug from a title."""
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
        return slug or "untitled-entry"

    def build_output_metadata(self, entry: InboxEntryInput) -> dict[str, Any]:
        """Build metadata required by downstream artefact generators."""
        schema_type = self.map_to_output_schema(entry)
        title = entry.title or entry.source_file
        return {
            "schema_type": schema_type,
            "slug": self.generate_slug(title),
            "title": title,
            "source_format": entry.source_format,
            "category_id": entry.category_id,
            "tag_count": len(entry.tags),
        }
