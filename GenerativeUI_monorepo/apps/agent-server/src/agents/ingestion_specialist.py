"""
Ingestion Specialist — Extracts structured fields from multi-format inbox entries.
Formats: md/txt (frontmatter parse), pdf/html (text extraction), jsx/ts (AST analysis), csv/url

@feature INBOX.ENTRY.INGEST
@domain INBOX
@layer AGENT
"""

from __future__ import annotations

import mimetypes
import re
from html import unescape
from pathlib import Path
from typing import Any, Optional

try:
    import yaml
except ImportError:
    yaml = None

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

try:
    from autogen import AssistantAgent

    AG2_AVAILABLE = True
except ImportError:
    AssistantAgent = Any
    AG2_AVAILABLE = False

from ..models.schemas import InboxEntryInput


class IngestionSpecialist:
    """Extracts structured metadata from raw inbox entries."""

    def __init__(self, config: Optional[dict[str, Any]] = None) -> None:
        self.config = config or {}
        self.agent: Optional[AssistantAgent] = None

        if AG2_AVAILABLE:
            self.agent = AssistantAgent(
                name="IngestionSpecialist",
                system_message=(
                    "Extract titles, summaries, format hints, and structured metadata "
                    "from inbox artefacts."
                ),
                llm_config={
                    "model": self.config.get("model", "gpt-4"),
                    "api_key": self.config.get("api_key", ""),
                    "temperature": 0,
                },
            )

    def extract_frontmatter(self, content: str) -> dict[str, Any]:
        """Parse YAML frontmatter from markdown content."""
        if not content.startswith("---"):
            return {}

        parts = content.split("---", 2)
        if len(parts) < 3:
            return {}

        frontmatter = parts[1].strip()
        if not frontmatter:
            return {}

        if yaml is not None:
            parsed = yaml.safe_load(frontmatter) or {}
            return parsed if isinstance(parsed, dict) else {}

        parsed: dict[str, Any] = {}
        for line in frontmatter.splitlines():
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            parsed[key.strip()] = value.strip().strip('"').strip("'")
        return parsed

    def extract_title_and_summary(self, text: str) -> tuple[str, str]:
        """Extract the first heading and first paragraph-like summary."""
        cleaned_lines = [line.strip() for line in text.splitlines()]
        title = ""
        summary_parts: list[str] = []

        for line in cleaned_lines:
            if not title and line.startswith("#"):
                title = re.sub(r"^#+\s*", "", line).strip()
                continue
            if not title and line:
                title = line[:120].strip()
                continue
            if line and not line.startswith("#"):
                summary_parts.append(line)
            elif summary_parts:
                break

        summary = " ".join(summary_parts).strip()
        if not summary and title:
            summary = title

        return title or "Untitled entry", summary[:280]

    def detect_format(self, filename: str, content: bytes) -> str:
        """Detect inbox source format from file extension and content hints."""
        suffix = Path(filename).suffix.lower()
        extension_map = {
            ".md": "md",
            ".markdown": "md",
            ".txt": "txt",
            ".pdf": "pdf",
            ".url": "url",
            ".html": "html",
            ".htm": "html",
            ".jsx": "jsx",
            ".tsx": "jsx",
            ".ts": "snippet",
            ".js": "snippet",
            ".csv": "csv",
        }
        if suffix in extension_map:
            return extension_map[suffix]

        mime, _ = mimetypes.guess_type(filename)
        if mime:
            if "html" in mime:
                return "html"
            if "csv" in mime:
                return "csv"
            if "pdf" in mime:
                return "pdf"
            if "text" in mime:
                return "txt"

        sample = content[:256].decode("utf-8", errors="ignore").lower()
        if "<html" in sample or "<body" in sample:
            return "html"
        if sample.startswith("http://") or sample.startswith("https://"):
            return "url"
        if "import " in sample or "export " in sample or "function " in sample:
            return "snippet"
        return "txt"

    def _extract_text(self, entry: InboxEntryInput) -> str:
        """Normalize text extraction with graceful fallbacks."""
        text = entry.extracted_text or entry.raw_content or ""

        if entry.source_format == "html":
            if BeautifulSoup is not None:
                return BeautifulSoup(text, "html.parser").get_text(" ", strip=True)
            return re.sub(r"<[^>]+>", " ", unescape(text)).strip()

        if entry.source_format == "pdf":
            return text.strip()

        if entry.source_format == "csv":
            return text.replace(",", ", ").strip()

        return text.strip()

    def ingest_entry(self, entry: InboxEntryInput) -> InboxEntryInput:
        """Enrich a single inbox entry with inferred metadata."""
        source_bytes = (entry.raw_content or entry.extracted_text or "").encode(
            "utf-8", errors="ignore"
        )
        detected_format = self.detect_format(entry.source_file, source_bytes)
        text = self._extract_text(
            entry.model_copy(update={"source_format": entry.source_format or detected_format})
        )
        frontmatter = (
            self.extract_frontmatter(entry.raw_content or "")
            if detected_format == "md"
            else {}
        )
        title, summary = self.extract_title_and_summary(text or entry.source_file)

        merged_tags = list(dict.fromkeys([*entry.tags, *frontmatter.get("tags", [])]))

        return entry.model_copy(
            update={
                "source_format": entry.source_format or detected_format,
                "extracted_text": text or entry.extracted_text,
                "title": entry.title or frontmatter.get("title") or title,
                "summary": entry.summary or frontmatter.get("summary") or summary,
                "tags": merged_tags,
                "agent_name": entry.agent_name or frontmatter.get("agent_name"),
                "agent_role": entry.agent_role or frontmatter.get("agent_role"),
                "entry_type": entry.entry_type or frontmatter.get("entry_type"),
                "category_id": entry.category_id or frontmatter.get("category_id"),
            }
        )
