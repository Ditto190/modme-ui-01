"""
Taxonomy Specialist — Assigns tags, severity, and category to inbox entries.
Uses pattern matching with TAG_PATTERNS dict.

@feature INBOX.ENTRY.CATEGORIZE
@domain INBOX
@layer AGENT
"""

from __future__ import annotations

from typing import Any, Optional

try:
    from autogen import AssistantAgent

    AG2_AVAILABLE = True
except ImportError:
    AssistantAgent = Any
    AG2_AVAILABLE = False


TAG_PATTERNS: dict[str, list[str]] = {
    "architecture": ["architecture", "adr", "decision", "design pattern"],
    "frontend": ["react", "component", "storybook", "nextjs", "tailwind"],
    "backend": ["fastapi", "api", "route", "endpoint", "prisma", "supabase"],
    "devops": ["ci/cd", "github actions", "docker", "deploy", "pipeline"],
    "security": ["auth", "jwt", "rls", "rbac", "secret", "security"],
    "testing": ["test", "playwright", "vitest", "pytest", "coverage"],
    "performance": ["optimize", "latency", "cache", "index", "vector"],
    "agent": ["agent", "mcp", "llm", "copilot", "prompt", "autogen"],
    "research": ["research", "analysis", "benchmark", "investigation"],
    "database": ["sql", "postgres", "migration", "schema", "table"],
    "ui": ["ux", "ui", "layout", "interaction", "accessibility"],
    "documentation": ["docs", "readme", "guide", "tutorial", "reference"],
    "design": ["wireframe", "design", "prototype", "figma", "visual"],
    "component": ["widget", "card", "button", "form", "dialog"],
    "operations": ["monitoring", "alert", "incident", "runbook", "sre"],
    "data": ["csv", "dataset", "taxonomy", "metadata", "mapping"],
}


class TaxonomySpecialist:
    """Assigns tags, severity, and category slugs using deterministic heuristics."""

    def __init__(self, config: Optional[dict[str, Any]] = None) -> None:
        self.config = config or {}
        self.agent: Optional[AssistantAgent] = None

        if AG2_AVAILABLE:
            self.agent = AssistantAgent(
                name="TaxonomySpecialist",
                system_message=(
                    "Assign stable inbox taxonomy tags, severity, and categories "
                    "for engineering knowledge records."
                ),
                llm_config={
                    "model": self.config.get("model", "gpt-4"),
                    "api_key": self.config.get("api_key", ""),
                    "temperature": 0,
                },
            )

    def assign_tags(self, text: str) -> list[str]:
        """Assign tags based on simple phrase matching."""
        haystack = text.lower()
        tags = [
            tag
            for tag, patterns in TAG_PATTERNS.items()
            if any(pattern in haystack for pattern in patterns)
        ]
        return sorted(dict.fromkeys(tags))

    def classify_severity(self, tags: list[str], text: str) -> str:
        """Classify severity based on tag mix and notable risk terms."""
        lowered = text.lower()
        if "security" in tags or "architecture" in tags:
            return "critical"
        if "design" in tags or "agent" in tags:
            return "high"
        if any(term in lowered for term in ("urgent", "incident", "outage", "broken")):
            return "high"
        if "testing" in tags or "performance" in tags:
            return "medium"
        return "medium"

    def find_category(self, tags: list[str]) -> Optional[str]:
        """Map tags to a stable category slug."""
        category_map = {
            "architecture": "knowledge-architecture",
            "frontend": "engineering-frontend",
            "backend": "engineering-backend",
            "security": "risk-security",
            "devops": "platform-devops",
            "testing": "quality-testing",
            "performance": "quality-performance",
            "agent": "ai-agent-systems",
            "documentation": "knowledge-docs",
            "design": "product-design",
            "component": "component-library",
            "data": "data-taxonomy",
        }
        for tag in tags:
            if tag in category_map:
                return category_map[tag]
        return None
