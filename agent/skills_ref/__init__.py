"""Reference library for Agent Skills - ModMe UI Workbench Adaptation.

This library provides utilities for working with Agent Skills:
- Parsing SKILL.md files
- Validating skill structure and metadata
- Generating agent prompt XML
- Managing skill library from Ai-Agent-Skills repository

Based on: https://github.com/agentskills/agentskills/tree/main/skills-ref
Skill Library: https://github.com/skillcreatorai/Ai-Agent-Skills
"""

from .errors import ParseError, SkillError, ValidationError
from .models import SkillProperties
from .parser import find_skill_md, read_properties
from .prompt import to_prompt
from .skill_library_manager import (
    SkillLibraryManager,
    SkillMetadata,
    generate_agent_prompt,
    install_recommended_skills,
)
from .validator import validate

__all__ = [
    # Original skills_ref
    "SkillError",
    "ParseError",
    "ValidationError",
    "SkillProperties",
    "find_skill_md",
    "validate",
    "read_properties",
    "to_prompt",
    # Skill library
    "SkillLibraryManager",
    "SkillMetadata",
    "install_recommended_skills",
    "generate_agent_prompt",
]

__version__ = "0.2.0"
