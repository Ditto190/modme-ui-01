"""
Comprehensive test suite for agent.skills_ref library.

Tests cover:
- Validator: name validation, description length, directory matching
- Parser: frontmatter parsing, SKILL.md discovery, required fields
- Prompt: XML generation, HTML escaping, multiple skills
- CLI: validate, read-properties, to-prompt commands
"""

import pytest
from pathlib import Path
from click.testing import CliRunner
import json

from agent.skills_ref import (
    SkillError,
    ParseError,
    ValidationError,
    SkillProperties,
    find_skill_md,
    validate,
    read_properties,
    to_prompt,
)
from agent.skills_ref.cli import main as cli_main
from agent.skills_ref.validator import (
    _validate_name,
    _validate_description,
    _validate_compatibility,
    validate_metadata,
)


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def valid_skill_dir(tmp_path):
    """Create a valid skill directory for testing."""
    skill_dir = tmp_path / "test-skill"
    skill_dir.mkdir()
    
    skill_md = skill_dir / "SKILL.md"
    skill_md.write_text("""---
name: test-skill
description: A test skill for unit testing
license: MIT
compatibility: Python 3.12+
---

# Test Skill

This is a test skill used in the test suite.

## Usage
Just for testing purposes.
""", encoding="utf-8")
    
    return skill_dir


@pytest.fixture
def skill_with_metadata(tmp_path):
    """Create a skill with additional metadata fields."""
    skill_dir = tmp_path / "advanced-skill"
    skill_dir.mkdir()
    
    skill_md = skill_dir / "SKILL.md"
    skill_md.write_text("""---
name: advanced-skill
description: Advanced skill with metadata
license: Apache-2.0
compatibility: Requires additional packages
allowed-tools: "python, jq, grep"
metadata:
  author: Test Author
  version: "1.0.0"
  tags: testing, advanced
---

# Advanced Skill

This skill has extra metadata.
""", encoding="utf-8")
    
    return skill_dir


@pytest.fixture
def skill_minimal(tmp_path):
    """Create a skill with only required fields."""
    skill_dir = tmp_path / "minimal-skill"
    skill_dir.mkdir()
    
    skill_md = skill_dir / "SKILL.md"
    skill_md.write_text("""---
name: minimal-skill
description: Minimal skill with only required fields
---

# Minimal Skill

Just the basics.
""", encoding="utf-8")
    
    return skill_dir


@pytest.fixture
def skill_lowercase_name(tmp_path):
    """Create a skill with lowercase SKILL.md filename."""
    skill_dir = tmp_path / "lower-skill"
    skill_dir.mkdir()
    
    skill_md = skill_dir / "skill.md"
    skill_md.write_text("""---
name: lower-skill
description: Uses lowercase skill.md filename
---

# Lower Skill
""", encoding="utf-8")
    
    return skill_dir


# =============================================================================
# VALIDATOR TESTS
# =============================================================================

class TestValidateName:
    """Tests for _validate_name function."""
    
    def test_valid_name(self, tmp_path):
        """Valid skill names should pass."""
        skill_dir = tmp_path / "valid-name"
        skill_dir.mkdir()
        
        errors = _validate_name("valid-name", skill_dir)
        assert errors == []
    
    def test_name_with_numbers(self, tmp_path):
        """Names with numbers should be valid."""
        skill_dir = tmp_path / "skill-123"
        skill_dir.mkdir()
        
        errors = _validate_name("skill-123", skill_dir)
        assert errors == []
    
    def test_uppercase_name(self, tmp_path):
        """Uppercase names should fail."""
        skill_dir = tmp_path / "InvalidName"
        skill_dir.mkdir()
        
        errors = _validate_name("InvalidName", skill_dir)
        assert len(errors) == 1
        assert "must be lowercase" in errors[0]
    
    def test_name_with_underscores(self, tmp_path):
        """Names with underscores should fail."""
        skill_dir = tmp_path / "invalid_name"
        skill_dir.mkdir()
        
        errors = _validate_name("invalid_name", skill_dir)
        assert len(errors) == 1
        assert "hyphens" in errors[0]
    
    def test_name_with_spaces(self, tmp_path):
        """Names with spaces should fail."""
        skill_dir = tmp_path / "invalid name"
        skill_dir.mkdir()
        
        errors = _validate_name("invalid name", skill_dir)
        assert len(errors) == 1
        assert "hyphens" in errors[0]
    
    def test_name_too_long(self, tmp_path):
        """Names over 64 characters should fail."""
        long_name = "a" * 65
        skill_dir = tmp_path / long_name
        skill_dir.mkdir()
        
        errors = _validate_name(long_name, skill_dir)
        assert len(errors) == 1
        assert "64 characters" in errors[0]
    
    def test_name_max_length(self, tmp_path):
        """Names exactly 64 characters should pass."""
        max_name = "a" * 64
        skill_dir = tmp_path / max_name
        skill_dir.mkdir()
        
        errors = _validate_name(max_name, skill_dir)
        assert errors == []
    
    def test_consecutive_hyphens(self, tmp_path):
        """Names with consecutive hyphens should fail."""
        skill_dir = tmp_path / "double--hyphen"
        skill_dir.mkdir()
        
        errors = _validate_name("double--hyphen", skill_dir)
        assert len(errors) == 1
        assert "consecutive hyphens" in errors[0]
    
    def test_directory_mismatch(self, tmp_path):
        """Name not matching directory should fail."""
        skill_dir = tmp_path / "actual-dir"
        skill_dir.mkdir()
        
        errors = _validate_name("different-name", skill_dir)
        assert len(errors) == 1
        assert "directory name" in errors[0]


class TestValidateDescription:
    """Tests for _validate_description function."""
    
    def test_valid_description(self):
        """Valid descriptions should pass."""
        errors = _validate_description("A valid description of the skill")
        assert errors == []
    
    def test_empty_description(self):
        """Empty descriptions should fail."""
        errors = _validate_description("")
        assert len(errors) == 1
        assert "non-empty" in errors[0]
    
    def test_whitespace_only(self):
        """Whitespace-only descriptions should fail."""
        errors = _validate_description("   \n\t  ")
        assert len(errors) == 1
        assert "non-empty" in errors[0]
    
    def test_description_too_long(self):
        """Descriptions over 1024 characters should fail."""
        long_desc = "a" * 1025
        errors = _validate_description(long_desc)
        assert len(errors) == 1
        assert "1024 characters" in errors[0]
    
    def test_description_max_length(self):
        """Descriptions exactly 1024 characters should pass."""
        max_desc = "a" * 1024
        errors = _validate_description(max_desc)
        assert errors == []


class TestValidateCompatibility:
    """Tests for _validate_compatibility function."""
    
    def test_valid_compatibility(self):
        """Valid compatibility strings should pass."""
        errors = _validate_compatibility("Python 3.12+, requires numpy")
        assert errors == []
    
    def test_none_compatibility(self):
        """None compatibility should pass (optional field)."""
        errors = _validate_compatibility(None)
        assert errors == []
    
    def test_empty_compatibility(self):
        """Empty string compatibility should pass."""
        errors = _validate_compatibility("")
        assert errors == []
    
    def test_compatibility_too_long(self):
        """Compatibility over 500 characters should fail."""
        long_compat = "a" * 501
        errors = _validate_compatibility(long_compat)
        assert len(errors) == 1
        assert "500 characters" in errors[0]
    
    def test_compatibility_max_length(self):
        """Compatibility exactly 500 characters should pass."""
        max_compat = "a" * 500
        errors = _validate_compatibility(max_compat)
        assert errors == []


class TestValidateMetadata:
    """Tests for validate_metadata function."""
    
    def test_valid_metadata(self, tmp_path):
        """Valid metadata should pass."""
        skill_dir = tmp_path / "test-skill"
        skill_dir.mkdir()
        
        metadata = {
            "name": "test-skill",
            "description": "Test description",
            "license": "MIT",
        }
        
        errors = validate_metadata(metadata, skill_dir)
        assert errors == []
    
    def test_missing_name(self, tmp_path):
        """Missing name should fail."""
        skill_dir = tmp_path / "test-skill"
        skill_dir.mkdir()
        
        metadata = {
            "description": "Test description",
        }
        
        errors = validate_metadata(metadata, skill_dir)
        assert len(errors) == 1
        assert "required field 'name'" in errors[0]
    
    def test_missing_description(self, tmp_path):
        """Missing description should fail."""
        skill_dir = tmp_path / "test-skill"
        skill_dir.mkdir()
        
        metadata = {
            "name": "test-skill",
        }
        
        errors = validate_metadata(metadata, skill_dir)
        assert len(errors) == 1
        assert "required field 'description'" in errors[0]
    
    def test_unexpected_field(self, tmp_path):
        """Unexpected fields should fail."""
        skill_dir = tmp_path / "test-skill"
        skill_dir.mkdir()
        
        metadata = {
            "name": "test-skill",
            "description": "Test",
            "invalid_field": "not allowed",
        }
        
        errors = validate_metadata(metadata, skill_dir)
        assert len(errors) == 1
        assert "unexpected fields" in errors[0]
        assert "invalid_field" in errors[0]
    
    def test_metadata_field_allowed(self, tmp_path):
        """Metadata subfields should be allowed."""
        skill_dir = tmp_path / "test-skill"
        skill_dir.mkdir()
        
        metadata = {
            "name": "test-skill",
            "description": "Test",
            "metadata": {
                "author": "Test Author",
                "version": "1.0",
            }
        }
        
        errors = validate_metadata(metadata, skill_dir)
        assert errors == []


class TestValidate:
    """Tests for validate function (main validation entry point)."""
    
    def test_valid_skill(self, valid_skill_dir):
        """Valid skill should return empty list."""
        errors = validate(valid_skill_dir)
        assert errors == []
    
    def test_minimal_valid_skill(self, skill_minimal):
        """Minimal valid skill should pass."""
        errors = validate(skill_minimal)
        assert errors == []
    
    def test_skill_with_metadata(self, skill_with_metadata):
        """Skill with extra metadata should pass."""
        errors = validate(skill_with_metadata)
        assert errors == []
    
    def test_nonexistent_directory(self, tmp_path):
        """Nonexistent directory should raise error."""
        with pytest.raises(SkillError, match="does not exist"):
            validate(tmp_path / "nonexistent")
    
    def test_not_a_directory(self, tmp_path):
        """File path (not directory) should raise error."""
        file_path = tmp_path / "file.txt"
        file_path.write_text("test")
        
        with pytest.raises(SkillError, match="not a directory"):
            validate(file_path)
    
    def test_missing_skill_md(self, tmp_path):
        """Directory without SKILL.md should raise ParseError."""
        skill_dir = tmp_path / "no-skill-md"
        skill_dir.mkdir()
        
        with pytest.raises(ParseError, match="SKILL.md not found"):
            validate(skill_dir)
    
    def test_invalid_yaml(self, tmp_path):
        """Invalid YAML should raise ParseError."""
        skill_dir = tmp_path / "bad-yaml"
        skill_dir.mkdir()
        
        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text("""---
name: bad-yaml
description: [unclosed
---

Content
""", encoding="utf-8")
        
        with pytest.raises(ParseError):
            validate(skill_dir)
    
    def test_no_frontmatter(self, tmp_path):
        """SKILL.md without frontmatter should raise ParseError."""
        skill_dir = tmp_path / "no-frontmatter"
        skill_dir.mkdir()
        
        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text("# Just markdown, no YAML frontmatter", encoding="utf-8")
        
        with pytest.raises(ParseError, match="frontmatter"):
            validate(skill_dir)
    
    def test_multiple_validation_errors(self, tmp_path):
        """Multiple errors should all be reported."""
        skill_dir = tmp_path / "BadSkillName"  # Uppercase = invalid
        skill_dir.mkdir()
        
        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text("""---
name: BadSkillName
description: ""
invalid_field: bad
---

Content
""", encoding="utf-8")
        
        errors = validate(skill_dir)
        assert len(errors) >= 2  # At least uppercase name + empty description


# =============================================================================
# PARSER TESTS
# =============================================================================

class TestFindSkillMd:
    """Tests for find_skill_md function."""
    
    def test_find_uppercase_skill_md(self, valid_skill_dir):
        """Should find SKILL.md (uppercase)."""
        skill_md = find_skill_md(valid_skill_dir)
        assert skill_md.exists()
        assert skill_md.name == "SKILL.md"
    
    def test_find_lowercase_skill_md(self, skill_lowercase_name):
        """Should find skill.md (lowercase)."""
        skill_md = find_skill_md(skill_lowercase_name)
        assert skill_md.exists()
        assert skill_md.name == "skill.md"
    
    def test_prefer_uppercase(self, tmp_path):
        """Should prefer SKILL.md over skill.md if both exist."""
        skill_dir = tmp_path / "both-files"
        skill_dir.mkdir()
        
        (skill_dir / "SKILL.md").write_text("uppercase", encoding="utf-8")
        (skill_dir / "skill.md").write_text("lowercase", encoding="utf-8")
        
        skill_md = find_skill_md(skill_dir)
        assert skill_md.name == "SKILL.md"
    
    def test_missing_skill_md(self, tmp_path):
        """Should raise ParseError if no SKILL.md found."""
        skill_dir = tmp_path / "empty"
        skill_dir.mkdir()
        
        with pytest.raises(ParseError, match="SKILL.md not found"):
            find_skill_md(skill_dir)


class TestReadProperties:
    """Tests for read_properties function."""
    
    def test_read_valid_properties(self, valid_skill_dir):
        """Should read all properties correctly."""
        props = read_properties(valid_skill_dir)
        
        assert props.name == "test-skill"
        assert props.description == "A test skill for unit testing"
        assert props.license == "MIT"
        assert props.compatibility == "Python 3.12+"
    
    def test_read_minimal_properties(self, skill_minimal):
        """Should handle minimal properties (only required fields)."""
        props = read_properties(skill_minimal)
        
        assert props.name == "minimal-skill"
        assert props.description == "Minimal skill with only required fields"
        assert props.license is None
        assert props.compatibility is None
    
    def test_read_with_metadata(self, skill_with_metadata):
        """Should read metadata dictionary."""
        props = read_properties(skill_with_metadata)
        
        assert props.name == "advanced-skill"
        assert props.allowed_tools == "python, jq, grep"
        assert "author" in props.metadata
        assert props.metadata["author"] == "Test Author"
    
    def test_to_dict_method(self, valid_skill_dir):
        """SkillProperties.to_dict() should exclude None values."""
        props = read_properties(valid_skill_dir)
        props_dict = props.to_dict()
        
        assert props_dict["name"] == "test-skill"
        assert props_dict["description"] == "A test skill for unit testing"
        assert "license" in props_dict
        
        # allowed_tools should be None, so not in dict
        assert "allowed_tools" not in props_dict or props_dict.get("allowed_tools") is None
    
    def test_missing_required_field(self, tmp_path):
        """Missing required field should raise ParseError."""
        skill_dir = tmp_path / "missing-field"
        skill_dir.mkdir()
        
        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text("""---
name: missing-field
---

Missing description
""", encoding="utf-8")
        
        with pytest.raises(ParseError, match="required field"):
            read_properties(skill_dir)


# =============================================================================
# PROMPT TESTS
# =============================================================================

class TestToPrompt:
    """Tests for to_prompt function."""
    
    def test_single_skill(self, valid_skill_dir):
        """Should generate XML for single skill."""
        xml = to_prompt([valid_skill_dir])
        
        assert "<available_skills>" in xml
        assert "</available_skills>" in xml
        assert "<skill>" in xml
        assert "<name>test-skill</name>" in xml
        assert "<description>A test skill for unit testing</description>" in xml
        assert "<location>" in xml
        assert "SKILL.md</location>" in xml
    
    def test_multiple_skills(self, valid_skill_dir, skill_minimal):
        """Should generate XML for multiple skills."""
        xml = to_prompt([valid_skill_dir, skill_minimal])
        
        assert xml.count("<skill>") == 2
        assert xml.count("</skill>") == 2
        assert "test-skill" in xml
        assert "minimal-skill" in xml
    
    def test_empty_list(self):
        """Empty list should generate minimal XML."""
        xml = to_prompt([])
        
        assert "<available_skills>" in xml
        assert "</available_skills>" in xml
        assert "<skill>" not in xml
    
    def test_html_escaping(self, tmp_path):
        """Special characters should be HTML-escaped."""
        skill_dir = tmp_path / "escape-test"
        skill_dir.mkdir()
        
        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text("""---
name: escape-test
description: Test <html> & "quotes"
---

Content
""", encoding="utf-8")
        
        xml = to_prompt([skill_dir])
        
        assert "&lt;html&gt;" in xml
        assert "&amp;" in xml
        assert "&quot;" in xml
    
    def test_location_path(self, valid_skill_dir):
        """Location should contain absolute path to SKILL.md."""
        xml = to_prompt([valid_skill_dir])
        
        expected_path = str(valid_skill_dir / "SKILL.md")
        assert expected_path in xml
    
    def test_multiline_format(self, valid_skill_dir):
        """XML should be properly formatted with newlines."""
        xml = to_prompt([valid_skill_dir])
        
        lines = xml.strip().split("\n")
        assert lines[0] == "<available_skills>"
        assert lines[-1] == "</available_skills>"
        assert any("<skill>" in line for line in lines)


# =============================================================================
# CLI TESTS
# =============================================================================

class TestCLI:
    """Tests for CLI commands."""
    
    @pytest.fixture
    def runner(self):
        """Create Click test runner."""
        return CliRunner()
    
    def test_validate_command_valid(self, runner, valid_skill_dir):
        """validate command should succeed for valid skill."""
        result = runner.invoke(cli_main, ["validate", str(valid_skill_dir)])
        
        assert result.exit_code == 0
        assert "Valid skill" in result.output
    
    def test_validate_command_invalid(self, runner, tmp_path):
        """validate command should fail for invalid skill."""
        skill_dir = tmp_path / "InvalidName"
        skill_dir.mkdir()
        
        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text("""---
name: InvalidName
description: Bad
---
""", encoding="utf-8")
        
        result = runner.invoke(cli_main, ["validate", str(skill_dir)])
        
        assert result.exit_code == 1
        assert "Validation errors" in result.output
    
    def test_validate_skill_md_path(self, runner, valid_skill_dir):
        """validate command should accept SKILL.md path directly."""
        skill_md_path = valid_skill_dir / "SKILL.md"
        result = runner.invoke(cli_main, ["validate", str(skill_md_path)])
        
        assert result.exit_code == 0
        assert "Valid skill" in result.output
    
    def test_read_properties_command(self, runner, valid_skill_dir):
        """read-properties command should output JSON."""
        result = runner.invoke(cli_main, ["read-properties", str(valid_skill_dir)])
        
        assert result.exit_code == 0
        
        # Parse JSON output
        output = json.loads(result.output)
        assert output["name"] == "test-skill"
        assert output["description"] == "A test skill for unit testing"
        assert output["license"] == "MIT"
    
    def test_read_properties_skill_md_path(self, runner, valid_skill_dir):
        """read-properties should accept SKILL.md path."""
        skill_md_path = valid_skill_dir / "SKILL.md"
        result = runner.invoke(cli_main, ["read-properties", str(skill_md_path)])
        
        assert result.exit_code == 0
        output = json.loads(result.output)
        assert output["name"] == "test-skill"
    
    def test_to_prompt_command_single(self, runner, valid_skill_dir):
        """to-prompt command should generate XML for single skill."""
        result = runner.invoke(cli_main, ["to-prompt", str(valid_skill_dir)])
        
        assert result.exit_code == 0
        assert "<available_skills>" in result.output
        assert "<name>test-skill</name>" in result.output
    
    def test_to_prompt_command_multiple(self, runner, valid_skill_dir, skill_minimal):
        """to-prompt command should handle multiple skills."""
        result = runner.invoke(
            cli_main,
            ["to-prompt", str(valid_skill_dir), str(skill_minimal)]
        )
        
        assert result.exit_code == 0
        assert result.output.count("<skill>") == 2
        assert "test-skill" in result.output
        assert "minimal-skill" in result.output
    
    def test_to_prompt_with_skill_md_paths(self, runner, valid_skill_dir, skill_minimal):
        """to-prompt should accept SKILL.md paths."""
        skill_md_1 = valid_skill_dir / "SKILL.md"
        skill_md_2 = skill_minimal / "SKILL.md"
        
        result = runner.invoke(
            cli_main,
            ["to-prompt", str(skill_md_1), str(skill_md_2)]
        )
        
        assert result.exit_code == 0
        assert result.output.count("<skill>") == 2


# =============================================================================
# INTEGRATION TESTS
# =============================================================================

class TestIntegration:
    """Integration tests for complete workflows."""
    
    def test_create_validate_read_prompt(self, tmp_path):
        """Complete workflow: create, validate, read, generate prompt."""
        # Create skill
        skill_dir = tmp_path / "integration-test"
        skill_dir.mkdir()
        
        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text("""---
name: integration-test
description: Integration test skill
license: MIT
---

# Integration Test

Test workflow.
""", encoding="utf-8")
        
        # Validate
        errors = validate(skill_dir)
        assert errors == []
        
        # Read properties
        props = read_properties(skill_dir)
        assert props.name == "integration-test"
        assert props.description == "Integration test skill"
        
        # Generate prompt
        xml = to_prompt([skill_dir])
        assert "<available_skills>" in xml
        assert "integration-test" in xml
    
    def test_mixed_valid_invalid_skills(self, tmp_path):
        """Handling mix of valid and invalid skills."""
        # Valid skill
        valid_dir = tmp_path / "valid"
        valid_dir.mkdir()
        (valid_dir / "SKILL.md").write_text("""---
name: valid
description: Valid skill
---
""", encoding="utf-8")
        
        # Invalid skill (uppercase name)
        invalid_dir = tmp_path / "Invalid"
        invalid_dir.mkdir()
        (invalid_dir / "SKILL.md").write_text("""---
name: Invalid
description: Bad
---
""", encoding="utf-8")
        
        # Valid skill passes
        assert validate(valid_dir) == []
        
        # Invalid skill fails
        assert len(validate(invalid_dir)) > 0
        
        # Prompt generation only works for valid
        xml = to_prompt([valid_dir])
        assert "valid" in xml


# =============================================================================
# EDGE CASES
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and boundary conditions."""
    
    def test_unicode_in_description(self, tmp_path):
        """Unicode characters in description should be handled."""
        skill_dir = tmp_path / "unicode-test"
        skill_dir.mkdir()
        
        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text("""---
name: unicode-test
description: Test with émojis 🎉 and ünïcödé
---
""", encoding="utf-8")
        
        props = read_properties(skill_dir)
        assert "émojis" in props.description
        assert "🎉" in props.description
    
    def test_very_long_valid_name(self, tmp_path):
        """Name at max length (64 chars) should work."""
        name = "a" * 64
        skill_dir = tmp_path / name
        skill_dir.mkdir()
        
        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text(f"""---
name: {name}
description: Max length name test
---
""", encoding="utf-8")
        
        errors = validate(skill_dir)
        assert errors == []
    
    def test_windows_path_handling(self, tmp_path):
        """Should handle Windows paths correctly."""
        skill_dir = tmp_path / "windows-test"
        skill_dir.mkdir()
        
        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text("""---
name: windows-test
description: Test
---
""", encoding="utf-8")
        
        # Should work regardless of platform
        xml = to_prompt([skill_dir])
        assert "windows-test" in xml
    
    def test_empty_metadata_dict(self, tmp_path):
        """Empty metadata dict should be valid."""
        skill_dir = tmp_path / "empty-metadata"
        skill_dir.mkdir()
        
        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text("""---
name: empty-metadata
description: Test
metadata: {}
---
""", encoding="utf-8")
        
        errors = validate(skill_dir)
        assert errors == []


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
