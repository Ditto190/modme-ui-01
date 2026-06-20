"""
Output Generator — Produces skills JSON, Storybook story stubs, ADR markdown.

@feature INBOX.ARTEFACT.GENERATE
@domain INBOX
@layer AGENT
"""

from __future__ import annotations

from typing import Any

try:
    from autogen import AssistantAgent

    AG2_AVAILABLE = True
except ImportError:
    AssistantAgent = Any
    AG2_AVAILABLE = False

from ..models.schemas import InboxEntryInput


class OutputGenerator:
    """Creates downstream artefacts from categorized inbox entries."""

    def __init__(self, config: dict[str, Any] | None = None) -> None:
        self.config = config or {}
        self.agent: AssistantAgent | None = None

        if AG2_AVAILABLE:
            self.agent = AssistantAgent(
                name="OutputGenerator",
                system_message=(
                    "Generate structured outputs for skills, Storybook stories, and ADRs."
                ),
                llm_config={
                    "model": self.config.get("model", "gpt-4"),
                    "api_key": self.config.get("api_key", ""),
                    "temperature": 0,
                },
            )

    def generate_skill_json(self, entry: InboxEntryInput, schema_type: str) -> dict[str, Any]:
        """Generate a deterministic skill-style payload."""
        return {
            "name": entry.title or entry.source_file,
            "schema_type": schema_type,
            "summary": entry.summary or "No summary provided.",
            "tags": entry.tags,
            "category_id": entry.category_id,
            "source": {
                "file": entry.source_file,
                "format": entry.source_format,
                "storage_url": entry.storage_url,
            },
        }

    def generate_adr_markdown(self, entry: InboxEntryInput) -> str:
        """Generate an ADR-style markdown document."""
        title = entry.title or "Untitled Decision"
        summary = entry.summary or "Decision summary pending."
        return "\n".join(
            [
                f"# ADR: {title}",
                "",
                "## Status",
                entry.severity.title(),
                "",
                "## Context",
                summary,
                "",
                "## Decision",
                entry.extracted_text or entry.raw_content or "TBD",
                "",
                "## Tags",
                ", ".join(entry.tags) or "none",
            ]
        )

    def generate_storybook_story(self, entry: InboxEntryInput, component_name: str) -> str:
        """Generate a lightweight Storybook story stub."""
        summary = entry.summary or "Generated from inbox pipeline."
        return "\n".join(
            [
                f'import type {{ Meta, StoryObj }} from "@storybook/react";',
                f'import {{ {component_name} }} from "./{component_name}";',
                "",
                f'const meta: Meta<typeof {component_name}> = {{',
                f'  title: "Inbox/{component_name}",',
                f"  component: {component_name},",
                f'  parameters: {{ docs: {{ description: {{ component: "{summary}" }} }} }},',
                "};",
                "",
                "export default meta;",
                f"type Story = StoryObj<typeof {component_name}>;",
                "",
                "export const Default: Story = {",
                "  args: {},",
                "};",
            ]
        )
