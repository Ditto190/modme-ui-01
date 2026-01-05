"""Reference library for Agent Skills - ModMe UI Workbench Adaptation.

This library provides utilities for working with Agent Skills:
- Parsing SKILL.md files
- Validating skill structure and metadata
- Generating agent prompt XML

Based on: https://github.com/agentskills/agentskills/tree/main/skills-ref
"""

from .errors import ParseError, SkillError, ValidationError
from .models import SkillProperties
from .parser import find_skill_md, read_properties
from .prompt import to_prompt
from .validator import validate

__all__ = [
    "SkillError",
    "ParseError",
    "ValidationError",
    "SkillProperties",
    "find_skill_md",
    "validate",
    "read_properties",
    "to_prompt",
]

__version__ = "0.1.0"
