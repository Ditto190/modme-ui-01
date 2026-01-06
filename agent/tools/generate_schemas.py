"""
Schema and Prompt Generator Tool for Agent

Converts the TypeScript generate.ts functionality to Python agent tools.
Generates JSON Schemas from TypeScript interfaces and agent prompts from skills.

Reference Implementation: agent-generator/src/scripts/generate.ts
"""

from google.adk.tools import ToolContext
from typing import Dict, Any, List, Optional
import json
import subprocess
import tempfile
from pathlib import Path
import re
from datetime import datetime

# Paths
AGENT_GENERATOR_ROOT = Path(__file__).parent.parent.parent / "agent-generator"
TOOLS_DIR = AGENT_GENERATOR_ROOT / "src" / "tools"
SKILLS_DIR = AGENT_GENERATOR_ROOT / "src" / "skills"
OUTPUT_DIR = AGENT_GENERATOR_ROOT / "output"


def generate_tool_schemas(
    tool_context: ToolContext,
    tools_dir: Optional[str] = None,
    output_file: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate JSON Schemas from TypeScript tool interface definitions.

    This tool replicates the TypeScript generateToolSchemas() function,
    extracting exported interfaces from TypeScript files and converting
    them to JSON Schema using typescript-json-schema.

    Args:
        tools_dir: Optional path to tools directory (defaults to src/tools)
        output_file: Optional path for output JSON (defaults to output/tools_schema.json)

    Returns:
        Dictionary with:
        - status: "success" or "error"
        - message: Status message
        - schemas_count: Number of schemas generated
        - output_path: Path where schemas were written
        - schemas: Dictionary of generated schemas (if successful)
    """
    try:
        # Resolve paths
        tools_path = Path(tools_dir) if tools_dir else TOOLS_DIR
        output_path = (
            Path(output_file) if output_file else OUTPUT_DIR / "tools_schema.json"
        )

        # Validate paths
        if not tools_path.exists():
            return {
                "status": "error",
                "message": f"Tools directory not found: {tools_path}",
            }

        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Find all TypeScript files in tools directory
        ts_files = list(tools_path.glob("**/*.ts"))

        if not ts_files:
            return {
                "status": "error",
                "message": f"No TypeScript files found in {tools_path}",
            }

        # Extract exported interfaces from files
        target_symbols = []
        for ts_file in ts_files:
            content = ts_file.read_text(encoding="utf-8")
            # Find exported interfaces
            matches = re.finditer(r"export\s+interface\s+(\w+)", content)
            for match in matches:
                target_symbols.append(match.group(1))

        if not target_symbols:
            return {
                "status": "warning",
                "message": "No exported interfaces found in TypeScript files",
                "schemas_count": 0,
                "output_path": str(output_path),
            }

        # Create temporary tsconfig for typescript-json-schema
        tsconfig = {
            "compilerOptions": {
                "strictNullChecks": True,
                "skipLibCheck": True,
                "target": "ES2020",
                "module": "commonjs",
            },
            "files": [str(f) for f in ts_files],
        }

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as tmp:
            json.dump(tsconfig, tmp)
            tsconfig_path = tmp.name

        try:
            # Run typescript-json-schema via Node.js
            # Note: Assumes typescript-json-schema is installed in agent-generator
            node_script = f"""
const TJS = require('typescript-json-schema');
const fs = require('fs');
const path = require('path');

const settings = {{
    required: true,
    ref: false
}};

const compilerOptions = {{
    strictNullChecks: true,
    skipLibCheck: true
}};

const program = TJS.getProgramFromFiles(
    {json.dumps([str(f) for f in ts_files])},
    compilerOptions,
    {json.dumps(str(tools_path))}
);

const generator = TJS.buildGenerator(program, settings);

if (!generator) {{
    console.error('Failed to create schema generator');
    process.exit(1);
}}

const schemas = {{}};
const symbols = {json.dumps(target_symbols)};

const outputPath = {json.dumps(str(output_path))};
// Ensure the output directory exists from Node as well (Windows-safe)
fs.mkdirSync(path.dirname(outputPath), {{ recursive: true }});

for (const symbol of symbols) {{
    try {{
        const schema = generator.getSchemaForSymbol(symbol);
        if (schema) {{
            schemas[symbol] = schema;
        }}
    }} catch (e) {{
        console.warn(`Error generating schema for ${{symbol}}:`, e.message);
    }}
}}

fs.writeFileSync(outputPath, JSON.stringify(schemas, null, 2));
console.log(JSON.stringify({{
    success: true,
    count: Object.keys(schemas).length,
    symbols: Object.keys(schemas)
}}));
"""

            # Execute Node.js script
            result = subprocess.run(
                ["node", "-e", node_script],
                cwd=AGENT_GENERATOR_ROOT,
                capture_output=True,
                text=True,
                timeout=60,
            )

            if result.returncode != 0:
                return {
                    "status": "error",
                    "message": f"Schema generation failed: {result.stderr}",
                }

            # Parse result
            result_data = json.loads(result.stdout.strip().split("\n")[-1])

            # Read generated schemas
            schemas = json.loads(output_path.read_text(encoding="utf-8"))

            return {
                "status": "success",
                "message": f"Generated {result_data['count']} schemas from {len(ts_files)} TypeScript files",
                "schemas_count": result_data["count"],
                "output_path": str(output_path),
                "schemas": schemas,
                "symbols_generated": result_data["symbols"],
            }

        finally:
            # Cleanup temp files
            Path(tsconfig_path).unlink(missing_ok=True)

    except Exception as e:
        return {
            "status": "error",
            "message": f"Unexpected error: {str(e)}",
            "error_type": type(e).__name__,
        }


def generate_agent_prompt(
    tool_context: ToolContext,
    skills_dir: Optional[str] = None,
    output_file: Optional[str] = None,
    include_instructions: bool = True,
) -> Dict[str, Any]:
    """
    Generate agent system prompt from skill SKILL.md files.

    This tool replicates the TypeScript generateAgentPrompt() function,
    scanning all SKILL.md files and compiling them into a single
    agent system prompt with <available_skills> XML structure.

    Args:
        skills_dir: Optional path to skills directory (defaults to src/skills)
        output_file: Optional path for output prompt (defaults to output/agent_prompt.md)
        include_instructions: Whether to include usage instructions in output

    Returns:
        Dictionary with:
        - status: "success" or "error"
        - message: Status message
        - skills_count: Number of skills processed
        - output_path: Path where prompt was written
        - prompt: Generated prompt content (if successful)
    """
    try:
        # Resolve paths
        skills_path = Path(skills_dir) if skills_dir else SKILLS_DIR
        output_path = (
            Path(output_file) if output_file else OUTPUT_DIR / "agent_prompt.md"
        )

        # Validate paths
        if not skills_path.exists():
            return {
                "status": "error",
                "message": f"Skills directory not found: {skills_path}",
            }

        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Find all SKILL.md files
        skill_files = list(skills_path.glob("**/SKILL.md"))

        if not skill_files:
            return {
                "status": "error",
                "message": f"No SKILL.md files found in {skills_path}",
            }

        # Build skills XML
        skills_xml = ["<available_skills>"]

        for skill_file in sorted(skill_files):
            skill_name = skill_file.parent.name
            content = skill_file.read_text(encoding="utf-8")

            # Extract description from first non-header paragraph
            description = _extract_skill_description(content)

            # Build skill XML entry
            skills_xml.append("  <skill>")
            skills_xml.append(f"    <name>{skill_name}</name>")
            skills_xml.append("    <description>")
            skills_xml.append(_indent(description, 6))
            skills_xml.append("    </description>")
            skills_xml.append("    <instructions>")
            skills_xml.append(_indent(content, 6))
            skills_xml.append("    </instructions>")
            skills_xml.append("  </skill>")

        skills_xml.append("</available_skills>")
        skills_xml_str = "\n".join(skills_xml)

        # Build complete prompt
        base_prompt = f"""# AI Agent System Prompt

You are a helpful AI assistant equipped with specific skills and tools.

{skills_xml_str}

"""

        if include_instructions:
            base_prompt += """## Instructions
1. Review the <available_skills> to understand what you can do.
2. If a user request matches a skill's capabilities, follow the instructions in that skill.
3. Use the provided tools when necessary to fulfill requests.
"""

        # Write to file
        output_path.write_text(base_prompt, encoding="utf-8")

        return {
            "status": "success",
            "message": f"Generated agent prompt from {len(skill_files)} skills",
            "skills_count": len(skill_files),
            "output_path": str(output_path),
            "prompt": base_prompt,
            "skills_processed": [f.parent.name for f in skill_files],
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Unexpected error: {str(e)}",
            "error_type": type(e).__name__,
        }


def generate_all(
    tool_context: ToolContext,
    tools_dir: Optional[str] = None,
    skills_dir: Optional[str] = None,
    output_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate both tool schemas and agent prompt in one operation.

    Convenience function that runs both generate_tool_schemas()
    and generate_agent_prompt() sequentially.

    Args:
        tools_dir: Optional path to tools directory
        skills_dir: Optional path to skills directory
        output_dir: Optional path for output files

    Returns:
        Dictionary with:
        - status: "success" or "error"
        - message: Status message
        - schemas_result: Result from generate_tool_schemas()
        - prompt_result: Result from generate_agent_prompt()
    """
    try:
        # Set output paths
        out_dir = Path(output_dir) if output_dir else OUTPUT_DIR
        schemas_file = out_dir / "tools_schema.json"
        prompt_file = out_dir / "agent_prompt.md"

        # Generate schemas
        schemas_result = generate_tool_schemas(
            tool_context, tools_dir=tools_dir, output_file=str(schemas_file)
        )

        # Generate prompt
        prompt_result = generate_agent_prompt(
            tool_context, skills_dir=skills_dir, output_file=str(prompt_file)
        )

        # Aggregate results
        overall_status = (
            "success"
            if (
                schemas_result["status"] in ("success", "warning")
                and prompt_result["status"] == "success"
            )
            else "error"
        )

        return {
            "status": overall_status,
            "message": (
                f"Generated {schemas_result.get('schemas_count', 0)} schemas "
                f"and prompt from {prompt_result.get('skills_count', 0)} skills"
            ),
            "schemas_result": schemas_result,
            "prompt_result": prompt_result,
            "output_directory": str(out_dir),
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Unexpected error: {str(e)}",
            "error_type": type(e).__name__,
        }


# ============================================================================
# Helper Functions
# ============================================================================


def _extract_skill_description(content: str) -> str:
    """
    Extract first meaningful description from SKILL.md content.

    Returns first non-empty, non-header line.
    """
    lines = content.split("\n")
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            return stripped
    return "No description provided."


def _indent(text: str, spaces: int) -> str:
    """Indent all lines in text by specified number of spaces."""
    indent_str = " " * spaces
    return "\n".join(indent_str + line for line in text.split("\n"))


# ============================================================================
# CLI Entry Point (for manual testing)
# ============================================================================

if __name__ == "__main__":
    import sys

    # Mock ToolContext for testing
    class MockToolContext:
        def __init__(self):
            self.state = {}

    mock_context = MockToolContext()

    if len(sys.argv) > 1:
        command = sys.argv[1]

        if command == "schemas":
            result = generate_tool_schemas(mock_context)
        elif command == "prompt":
            result = generate_agent_prompt(mock_context)
        elif command == "all":
            result = generate_all(mock_context)
        else:
            print(f"Unknown command: {command}")
            print("Usage: python generate_schemas.py [schemas|prompt|all]")
            sys.exit(1)

        print(json.dumps(result, indent=2))
    else:
        # Default: generate all
        result = generate_all(mock_context)
        print(json.dumps(result, indent=2))
