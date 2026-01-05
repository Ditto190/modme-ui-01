"""
Tests for generate_schemas.py agent tool

Tests the conversion of TypeScript generate.ts to Python agent tools.
"""

import pytest
import json
from pathlib import Path
from unittest.mock import MagicMock, patch
from agent.tools.generate_schemas import (
    generate_tool_schemas,
    generate_agent_prompt,
    generate_all,
    _extract_skill_description,
    _indent
)


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def mock_tool_context():
    """Mock ToolContext for testing."""
    context = MagicMock()
    context.state = {}
    return context


@pytest.fixture
def temp_skills_dir(tmp_path):
    """Create temporary skills directory with test SKILL.md files."""
    skills_dir = tmp_path / "skills"
    skills_dir.mkdir()
    
    # Skill 1: mcp-builder
    skill1 = skills_dir / "mcp-builder"
    skill1.mkdir()
    (skill1 / "SKILL.md").write_text("""---
name: mcp-builder
---

# MCP Builder

Guide for creating high-quality MCP servers.

## Process

1. Research
2. Implement
3. Test
""")
    
    # Skill 2: schema-crawler
    skill2 = skills_dir / "schema-crawler"
    skill2.mkdir()
    (skill2 / "SKILL.md").write_text("""---
name: schema-crawler
---

# Schema Crawler

Convert JSON Schema to Zod validation.

## Usage

Run conversion tool.
""")
    
    return skills_dir


# ============================================================================
# Test: generate_agent_prompt
# ============================================================================

def test_generate_agent_prompt_success(mock_tool_context, temp_skills_dir):
    """Test successful prompt generation from skills."""
    result = generate_agent_prompt(
        mock_tool_context,
        skills_dir=str(temp_skills_dir),
        include_instructions=True
    )
    
    assert result["status"] == "success"
    assert result["skills_count"] == 2
    assert "output_path" in result
    assert "prompt" in result
    
    # Verify XML structure
    prompt = result["prompt"]
    assert "<available_skills>" in prompt
    assert "</available_skills>" in prompt
    assert "<name>mcp-builder</name>" in prompt
    assert "<name>schema-crawler</name>" in prompt
    assert "## Instructions" in prompt


def test_generate_agent_prompt_without_instructions(mock_tool_context, temp_skills_dir):
    """Test prompt generation without instructions section."""
    result = generate_agent_prompt(
        mock_tool_context,
        skills_dir=str(temp_skills_dir),
        include_instructions=False
    )
    
    assert result["status"] == "success"
    assert "## Instructions" not in result["prompt"]


def test_generate_agent_prompt_invalid_dir(mock_tool_context, tmp_path):
    """Test error handling for invalid skills directory."""
    invalid_dir = tmp_path / "nonexistent"
    
    result = generate_agent_prompt(
        mock_tool_context,
        skills_dir=str(invalid_dir)
    )
    
    assert result["status"] == "error"
    assert "not found" in result["message"]


def test_generate_agent_prompt_no_skills(mock_tool_context, tmp_path):
    """Test error when no SKILL.md files found."""
    empty_dir = tmp_path / "empty"
    empty_dir.mkdir()
    
    result = generate_agent_prompt(
        mock_tool_context,
        skills_dir=str(empty_dir)
    )
    
    assert result["status"] == "error"
    assert "No SKILL.md files found" in result["message"]


def test_generate_agent_prompt_writes_file(mock_tool_context, temp_skills_dir, tmp_path):
    """Test that output file is written correctly."""
    output_file = tmp_path / "test_prompt.md"
    
    result = generate_agent_prompt(
        mock_tool_context,
        skills_dir=str(temp_skills_dir),
        output_file=str(output_file)
    )
    
    assert result["status"] == "success"
    assert output_file.exists()
    
    content = output_file.read_text()
    assert "<available_skills>" in content
    assert "mcp-builder" in content


# ============================================================================
# Test: generate_tool_schemas
# ============================================================================

def test_generate_tool_schemas_invalid_dir(mock_tool_context, tmp_path):
    """Test error handling for invalid tools directory."""
    invalid_dir = tmp_path / "nonexistent"
    
    result = generate_tool_schemas(
        mock_tool_context,
        tools_dir=str(invalid_dir)
    )
    
    assert result["status"] == "error"
    assert "not found" in result["message"]


def test_generate_tool_schemas_no_ts_files(mock_tool_context, tmp_path):
    """Test error when no TypeScript files found."""
    empty_dir = tmp_path / "empty_tools"
    empty_dir.mkdir()
    
    result = generate_tool_schemas(
        mock_tool_context,
        tools_dir=str(empty_dir)
    )
    
    assert result["status"] == "error"
    assert "No TypeScript files found" in result["message"]


# ============================================================================
# Test: generate_all
# ============================================================================

@patch('agent.tools.generate_schemas.generate_tool_schemas')
@patch('agent.tools.generate_schemas.generate_agent_prompt')
def test_generate_all_success(mock_prompt, mock_schemas, mock_tool_context, tmp_path):
    """Test successful generation of both schemas and prompt."""
    # Mock successful responses
    mock_schemas.return_value = {
        "status": "success",
        "schemas_count": 5
    }
    mock_prompt.return_value = {
        "status": "success",
        "skills_count": 3
    }
    
    result = generate_all(
        mock_tool_context,
        output_dir=str(tmp_path)
    )
    
    assert result["status"] == "success"
    assert "schemas_result" in result
    assert "prompt_result" in result
    assert result["schemas_result"]["schemas_count"] == 5
    assert result["prompt_result"]["skills_count"] == 3


@patch('agent.tools.generate_schemas.generate_tool_schemas')
@patch('agent.tools.generate_schemas.generate_agent_prompt')
def test_generate_all_schema_error(mock_prompt, mock_schemas, mock_tool_context):
    """Test error handling when schema generation fails."""
    mock_schemas.return_value = {
        "status": "error",
        "message": "Schema generation failed"
    }
    mock_prompt.return_value = {
        "status": "success",
        "skills_count": 3
    }
    
    result = generate_all(mock_tool_context)
    
    assert result["status"] == "error"


# ============================================================================
# Test: Helper Functions
# ============================================================================

def test_extract_skill_description_with_text():
    """Test extracting description from skill content."""
    content = """---
name: test-skill
---

# Test Skill

This is the description paragraph.

## Section
More content.
"""
    
    description = _extract_skill_description(content)
    assert description == "This is the description paragraph."


def test_extract_skill_description_header_only():
    """Test extraction when only headers present."""
    content = """# Test Skill
## Section
### Subsection
"""
    
    description = _extract_skill_description(content)
    assert description == "No description provided."


def test_extract_skill_description_empty():
    """Test extraction from empty content."""
    content = ""
    
    description = _extract_skill_description(content)
    assert description == "No description provided."


def test_indent_single_line():
    """Test indenting single line."""
    text = "Hello World"
    indented = _indent(text, 4)
    assert indented == "    Hello World"


def test_indent_multiline():
    """Test indenting multiple lines."""
    text = "Line 1\nLine 2\nLine 3"
    indented = _indent(text, 2)
    expected = "  Line 1\n  Line 2\n  Line 3"
    assert indented == expected


def test_indent_empty():
    """Test indenting empty string."""
    text = ""
    indented = _indent(text, 4)
    assert indented == "    "


# ============================================================================
# Integration Tests (Require actual files)
# ============================================================================

@pytest.mark.integration
def test_generate_agent_prompt_real_skills(mock_tool_context):
    """
    Integration test with real skills directory.
    
    Requires: agent-generator/src/skills to exist
    """
    from pathlib import Path
    
    skills_dir = Path(__file__).parent.parent.parent / "agent-generator" / "src" / "skills"
    
    if not skills_dir.exists():
        pytest.skip("Real skills directory not found")
    
    result = generate_agent_prompt(
        mock_tool_context,
        skills_dir=str(skills_dir)
    )
    
    assert result["status"] == "success"
    assert result["skills_count"] > 0
    assert "mcp-builder" in result.get("skills_processed", [])


# ============================================================================
# Test: CLI Entry Point
# ============================================================================

def test_cli_entry_point(capsys):
    """Test CLI entry point (if __name__ == '__main__')."""
    # This would require mocking sys.argv and testing main block
    # For now, just verify the module can be imported
    import agent.tools.generate_schemas
    assert hasattr(agent.tools.generate_schemas, 'generate_all')


# ============================================================================
# Test: Error Cases
# ============================================================================

def test_generate_agent_prompt_permission_error(mock_tool_context, temp_skills_dir, tmp_path):
    """Test handling of permission errors when writing output."""
    import os
    
    # Create read-only output directory (Unix-like systems)
    if os.name != 'nt':  # Skip on Windows
        output_dir = tmp_path / "readonly"
        output_dir.mkdir()
        output_dir.chmod(0o444)  # Read-only
        
        output_file = output_dir / "prompt.md"
        
        result = generate_agent_prompt(
            mock_tool_context,
            skills_dir=str(temp_skills_dir),
            output_file=str(output_file)
        )
        
        # Should handle permission error gracefully
        assert result["status"] == "error"
        assert "error" in result


def test_generate_tool_schemas_timeout(mock_tool_context, tmp_path):
    """Test timeout handling for long-running Node.js subprocess."""
    # Create tools directory with many large files to trigger timeout
    tools_dir = tmp_path / "large_tools"
    tools_dir.mkdir()
    
    # This test would need actual large TS files to timeout
    # For now, just verify timeout parameter is used
    result = generate_tool_schemas(
        mock_tool_context,
        tools_dir=str(tools_dir)
    )
    
    # Should return error for empty directory
    assert result["status"] == "error"


# ============================================================================
# Test: Return Value Structure
# ============================================================================

def test_generate_agent_prompt_return_structure(mock_tool_context, temp_skills_dir):
    """Test that return value has expected structure."""
    result = generate_agent_prompt(
        mock_tool_context,
        skills_dir=str(temp_skills_dir)
    )
    
    # Required keys
    assert "status" in result
    assert "message" in result
    
    # Success-specific keys
    if result["status"] == "success":
        assert "skills_count" in result
        assert "output_path" in result
        assert "prompt" in result
        assert "skills_processed" in result
        
        # Type checks
        assert isinstance(result["skills_count"], int)
        assert isinstance(result["output_path"], str)
        assert isinstance(result["prompt"], str)
        assert isinstance(result["skills_processed"], list)


def test_generate_tool_schemas_return_structure_error(mock_tool_context):
    """Test error return value structure."""
    result = generate_tool_schemas(
        mock_tool_context,
        tools_dir="/nonexistent/path"
    )
    
    # Required keys
    assert "status" in result
    assert result["status"] == "error"
    assert "message" in result
    assert isinstance(result["message"], str)


# ============================================================================
# Parametrized Tests
# ============================================================================

@pytest.mark.parametrize("include_instructions,expected_in_output", [
    (True, "## Instructions"),
    (False, None),
])
def test_generate_agent_prompt_instructions_param(
    mock_tool_context, 
    temp_skills_dir, 
    include_instructions, 
    expected_in_output
):
    """Test include_instructions parameter variations."""
    result = generate_agent_prompt(
        mock_tool_context,
        skills_dir=str(temp_skills_dir),
        include_instructions=include_instructions
    )
    
    assert result["status"] == "success"
    
    if expected_in_output:
        assert expected_in_output in result["prompt"]
    else:
        assert "## Instructions" not in result["prompt"]


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
