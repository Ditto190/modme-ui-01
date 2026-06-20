"""Agent tools for working with Agent Skills using the skills-ref library.

These tools wrap the skills_ref library functions to make them available
as Google ADK agent tools.
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from google.adk.tools import ToolContext

# Import skills_ref library
from skills_ref import validate, read_properties, to_prompt
from skills_ref.errors import SkillError


def validate_skill(tool_context: ToolContext, skill_path: str) -> Dict[str, Any]:
    """
    Validate an Agent Skill directory structure and SKILL.md file.

    Checks that the skill has valid frontmatter, correct naming conventions,
    required fields, and proper directory structure.

    Args:
        skill_path: Path to the skill directory to validate

    Returns:
        Dictionary with status, validation results, and error messages (if any)
    """
    try:
        path = Path(skill_path)

        if not path.exists():
            return {
                "status": "error",
                "message": f"Skill path does not exist: {skill_path}",
            }

        # Validate the skill
        errors = validate(path)

        if errors:
            return {
                "status": "invalid",
                "message": f"Skill validation failed with {len(errors)} error(s)",
                "errors": errors,
                "skill_path": str(path),
            }
        else:
            return {
                "status": "valid",
                "message": "Skill is valid",
                "skill_path": str(path),
            }

    except SkillError as e:
        return {
            "status": "error",
            "message": f"Skill error: {str(e)}",
            "error_type": type(e).__name__,
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Unexpected error: {str(e)}",
            "error_type": type(e).__name__,
        }


def read_skill_properties(tool_context: ToolContext, skill_path: str) -> Dict[str, Any]:
    """
    Read and return properties from a skill's SKILL.md frontmatter.

    Parses the YAML frontmatter and returns all skill properties including
    name, description, license, compatibility, and metadata.

    Args:
        skill_path: Path to the skill directory

    Returns:
        Dictionary with status and skill properties
    """
    try:
        path = Path(skill_path)

        if not path.exists():
            return {
                "status": "error",
                "message": f"Skill path does not exist: {skill_path}",
            }

        # Read properties
        props = read_properties(path)

        return {
            "status": "success",
            "message": f"Read properties for skill: {props.name}",
            "properties": props.to_dict(),
            "skill_path": str(path),
        }

    except SkillError as e:
        return {
            "status": "error",
            "message": f"Skill error: {str(e)}",
            "error_type": type(e).__name__,
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Unexpected error: {str(e)}",
            "error_type": type(e).__name__,
        }


def generate_skills_prompt(
    tool_context: ToolContext, skill_paths: List[str], output_file: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate <available_skills> XML block for agent system prompts.

    Creates the recommended XML format for including skill information
    in agent prompts, following Anthropic's Agent Skills specification.

    Args:
        skill_paths: List of paths to skill directories
        output_file: Optional path to write the prompt XML to

    Returns:
        Dictionary with status, prompt XML, and skills processed
    """
    try:
        if not skill_paths:
            return {"status": "error", "message": "No skill paths provided"}

        # Convert string paths to Path objects
        paths = [Path(p) for p in skill_paths]

        # Validate all paths exist
        for path in paths:
            if not path.exists():
                return {
                    "status": "error",
                    "message": f"Skill path does not exist: {path}",
                }

        # Generate prompt XML
        prompt_xml = to_prompt(paths)

        # Optionally write to file
        if output_file:
            output_path = Path(output_file)
            output_path.write_text(prompt_xml, encoding="utf-8")

            return {
                "status": "success",
                "message": f"Generated skills prompt from {len(paths)} skill(s) and wrote to {output_file}",
                "skills_count": len(paths),
                "output_file": str(output_path),
                "prompt_xml": prompt_xml,
            }
        else:
            return {
                "status": "success",
                "message": f"Generated skills prompt from {len(paths)} skill(s)",
                "skills_count": len(paths),
                "prompt_xml": prompt_xml,
            }

    except SkillError as e:
        return {
            "status": "error",
            "message": f"Skill error: {str(e)}",
            "error_type": type(e).__name__,
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Unexpected error: {str(e)}",
            "error_type": type(e).__name__,
        }


# CLI entry point for manual testing
if __name__ == "__main__":
    import sys

    class MockToolContext:
        def __init__(self):
            self.state = {}

    context = MockToolContext()

    if len(sys.argv) < 2:
        print("Usage: python skills_ref_tools.py <command> [args]")
        print("Commands:")
        print("  validate <skill_path>")
        print("  read-properties <skill_path>")
        print("  generate-prompt <skill_path1> [<skill_path2> ...] [--output <file>]")
        sys.exit(1)

    command = sys.argv[1]

    if command == "validate":
        if len(sys.argv) < 3:
            print("Error: skill_path required")
            sys.exit(1)
        result = validate_skill(context, sys.argv[2])
        print(json.dumps(result, indent=2))

    elif command == "read-properties":
        if len(sys.argv) < 3:
            print("Error: skill_path required")
            sys.exit(1)
        result = read_skill_properties(context, sys.argv[2])
        print(json.dumps(result, indent=2))

    elif command == "generate-prompt":
        if len(sys.argv) < 3:
            print("Error: at least one skill_path required")
            sys.exit(1)

        # Parse arguments
        skill_paths = []
        output_file = None
        i = 2
        while i < len(sys.argv):
            if sys.argv[i] == "--output" and i + 1 < len(sys.argv):
                output_file = sys.argv[i + 1]
                i += 2
            else:
                skill_paths.append(sys.argv[i])
                i += 1

        result = generate_skills_prompt(context, skill_paths, output_file)
        print(json.dumps(result, indent=2))

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
