"""Generate custom instructions for GitLens-style AI integration.

Produces VSCode-compatible custom instructions that integrate with GitLens AI features,
GitHub Copilot, and agent skills systems. Supports multiple output formats:
- Anthropic XML (for Claude models)
- VSCode Settings JSON (for GitLens AI config)
- Markdown (for GitHub Copilot instructions)
"""

import html
import json
from pathlib import Path
from typing import Literal, Optional

from .parser import find_skill_md, read_properties


OutputFormat = Literal["xml", "vscode_json", "markdown", "gitlens_instructions"]


def to_prompt(
    skill_dirs: list[Path],
    format: OutputFormat = "xml",
    codebase_context: Optional[dict] = None,
) -> str:
    """Generate custom instructions in specified format.

    Args:
        skill_dirs: List of paths to skill directories
        format: Output format (xml, vscode_json, markdown, gitlens_instructions)
        codebase_context: Optional context about the codebase (architecture, patterns, etc.)

    Returns:
        Formatted custom instructions string

    Example usage:
        # Anthropic XML format
        xml = to_prompt(skills, format="xml")
        
        # VSCode settings.json integration
        vscode_config = to_prompt(skills, format="vscode_json", codebase_context={
            "architecture": "dual-runtime",
            "stack": ["Python 3.12+", "React 19", "Next.js 16"]
        })
        
        # GitLens custom instructions
        gitlens = to_prompt(skills, format="gitlens_instructions")
    """
    if format == "xml":
        return _generate_anthropic_xml(skill_dirs)
    elif format == "vscode_json":
        return _generate_vscode_settings(skill_dirs, codebase_context)
    elif format == "markdown":
        return _generate_markdown(skill_dirs, codebase_context)
    elif format == "gitlens_instructions":
        return _generate_gitlens_instructions(skill_dirs, codebase_context)
    else:
        raise ValueError(f"Unsupported format: {format}")


def _generate_anthropic_xml(skill_dirs: list[Path]) -> str:
    """Generate <available_skills> XML block for Anthropic/Claude models.
    
    This XML format is what Anthropic recommends for Claude models.
    """
    if not skill_dirs:
        return "<available_skills>\n</available_skills>"

    lines = ["<available_skills>"]

    for skill_dir in skill_dirs:
        skill_dir = Path(skill_dir).resolve()
        props = read_properties(skill_dir)

        lines.append("<skill>")
        lines.append("<name>")
        lines.append(html.escape(props.name))
        lines.append("</name>")
        lines.append("<description>")
        lines.append(html.escape(props.description))
        lines.append("</description>")

        skill_md_path = find_skill_md(skill_dir)
        lines.append("<location>")
        lines.append(str(skill_md_path))
        lines.append("</location>")

        lines.append("</skill>")

    lines.append("</available_skills>")

    return "\n".join(lines)


def _generate_vscode_settings(
    skill_dirs: list[Path],
    context: Optional[dict] = None,
) -> str:
    """Generate VSCode settings.json configuration for GitLens AI.
    
    Returns JSON that can be merged into VSCode settings for AI customization.
    """
    context = context or {}
    
    skills_list = []
    for skill_dir in skill_dirs:
        props = read_properties(skill_dir)
        skill_md_path = find_skill_md(skill_dir)
        
        skills_list.append({
            "name": props.name,
            "description": props.description,
            "location": str(skill_md_path) if skill_md_path else None,
        })
    
    config = {
        "gitlens.ai.generateCommitMessage.customInstructions": _generate_commit_instructions(context),
        "gitlens.ai.generateCommits.customInstructions": _generate_recompose_instructions(context),
        "gitlens.ai.explainChanges.customInstructions": _generate_explain_instructions(context),
        "gitlens.ai.experimental.composer.enabled": True,
        "gitlens.ai.enabled": True,
        "_comment": "Available skills for reference",
        "_available_skills": skills_list,
    }
    
    return json.dumps(config, indent=2)


def _generate_markdown(
    skill_dirs: list[Path],
    context: Optional[dict] = None,
) -> str:
    """Generate Markdown format custom instructions for GitHub Copilot."""
    context = context or {}
    lines = [
        "# AI Agent Custom Instructions",
        "",
        "## Project Context",
        "",
    ]
    
    if context.get("architecture"):
        lines.append(f"**Architecture**: {context['architecture']}")
    
    if context.get("stack"):
        lines.append(f"**Tech Stack**: {', '.join(context['stack'])}")
    
    lines.extend([
        "",
        "## Available Skills",
        "",
    ])
    
    for skill_dir in skill_dirs:
        props = read_properties(skill_dir)
        skill_md_path = find_skill_md(skill_dir)
        
        lines.append(f"### {props.name}")
        lines.append(f"> {props.description}")
        if skill_md_path:
            lines.append(f"**Location**: `{skill_md_path}`")
        lines.append("")
    
    return "\n".join(lines)


def _generate_gitlens_instructions(
    skill_dirs: list[Path],
    context: Optional[dict] = None,
) -> str:
    """Generate comprehensive GitLens-compatible custom instructions.
    
    Follows GitLens AI patterns for commit messages, code explanations, and recompose.
    """
    context = context or {}
    
    lines = [
        "# GitLens AI Custom Instructions",
        "",
        "## Codebase Architecture",
        "",
    ]
    
    # Add architecture context if provided
    if context.get("architecture"):
        lines.append(f"This codebase uses a **{context['architecture']}** architecture.")
        lines.append("")
    
    if context.get("patterns"):
        lines.append("**Key Patterns**:")
        for pattern in context["patterns"]:
            lines.append(f"- {pattern}")
        lines.append("")
    
    # Add commit message instructions
    lines.extend([
        "## Commit Message Guidelines",
        "",
        "When generating commit messages:",
        "- Use conventional commit format: `type(scope): description`",
        "- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`",
        "- Keep first line under 72 characters",
        "- Focus on **why** over **what** in the body",
        "- Reference issues/PRs when applicable",
        "",
    ])
    
    # Add code explanation instructions
    lines.extend([
        "## Code Explanation Guidelines",
        "",
        "When explaining changes:",
        "- Start with high-level intent",
        "- Explain architectural decisions",
        "- Highlight breaking changes or migrations",
        "- Connect to project patterns and conventions",
        "",
    ])
    
    # Add skills section
    lines.extend([
        "## Available Skills",
        "",
    ])
    
    for skill_dir in skill_dirs:
        props = read_properties(skill_dir)
        skill_md_path = find_skill_md(skill_dir)
        
        lines.append(f"### {props.name}")
        lines.append(f"{props.description}")
        if skill_md_path:
            lines.append(f"**Skill Definition**: `{skill_md_path}`")
        lines.append("")
    
    # Add constraints
    lines.extend([
        "## Constraints",
        "",
        "- Never modify files without explicit confirmation",
        "- Preserve existing code style and formatting",
        "- Follow project-specific linting and type checking rules",
        "- Validate against test suites before suggesting changes",
        "",
    ])
    
    return "\n".join(lines)


def _generate_commit_instructions(context: dict) -> str:
    """Generate custom instructions for commit message generation."""
    base = "Follow conventional commits format (type(scope): subject)."
    
    if context.get("architecture") == "dual-runtime":
        return f"{base} For dual-runtime changes, specify 'agent' or 'ui' scope. Example: 'feat(agent): add new tool for X'"
    
    return base


def _generate_recompose_instructions(context: dict) -> str:
    """Generate custom instructions for commit recomposition."""
    base = "Organize changes into logical commits that isolate features, fixes, and refactors."
    
    if context.get("architecture") == "dual-runtime":
        return f"{base} Separate agent-side (Python) from UI-side (React/TypeScript) changes."
    
    return base


def _generate_explain_instructions(context: dict) -> str:
    """Generate custom instructions for code explanations."""
    base = "Explain changes in terms of business value and architectural impact."
    
    patterns = context.get("patterns", [])
    if patterns:
        pattern_list = ", ".join(patterns[:3])
        return f"{base} Reference these project patterns: {pattern_list}."
    
    return base
