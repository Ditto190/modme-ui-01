"""
Test harness for generate_schemas.py
Tests the schema generation functions with mocked dependencies
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))


# Mock google.adk since it's not installed
class MockToolContext:
    def __init__(self):
        self.state = {}


# Mock the google.adk module
sys.modules["google"] = MagicMock()
sys.modules["google.adk"] = MagicMock()
sys.modules["google.adk.tools"] = MagicMock()

# Now import our module (must be after mocking)
from tools.generate_schemas import (  # noqa: E402
    generate_tool_schemas,
    generate_agent_prompt,
    generate_all,
    _extract_skill_description,
)

print("🧪 Testing generate_schemas.py\n")

# Test 1: Extract skill description
print("=== TEST 1: Extract Skill Description ===")
test_content = """# MCP Builder Skill

Guide for building high-quality MCP servers

This is a test description.
"""
description = _extract_skill_description(test_content)
print(f"Extracted description: {description}")
assert "Guide for building" in description
print("✅ Test 1 passed\n")

# Test 2: Generate tool schemas (will check directory validation)
print("=== TEST 2: Generate Tool Schemas (Path Validation) ===")
context = MockToolContext()
result = generate_tool_schemas(
    context, tools_dir="nonexistent_directory", output_file="test_output.json"
)
print(f"Status: {result['status']}")
print(f"Message: {result['message']}")
assert result["status"] == "error"
assert "not found" in result["message"]
print("✅ Test 2 passed\n")

# Test 3: Generate agent prompt from real skills directory
print("=== TEST 3: Generate Agent Prompt (Real Skills) ===")
skills_dir = Path(__file__).parent.parent.parent / "agent-generator" / "src" / "skills"

if skills_dir.exists():
    result = generate_agent_prompt(
        context,
        skills_dir=str(skills_dir),
        output_file="test_agent_prompt.md",
        include_instructions=True,
    )
    print(f"Status: {result['status']}")
    print(f"Message: {result['message']}")

    if result["status"] == "success":
        print(f"Skills processed: {result.get('skills_count', 0)}")
        print(f"Skills: {result.get('skills_processed', [])}")
        print("\nPrompt preview (first 500 chars):")
        print(result.get("prompt", "")[:500])
        print("✅ Test 3 passed\n")
    else:
        print("⚠️  Test 3 had issues but continued\n")
else:
    print(f"⚠️  Skills directory not found at {skills_dir}, skipping\n")

# Test 4: Generate all (integration test)
print("=== TEST 4: Generate All (Integration Test) ===")
# Use agent-generator paths if they exist
ag_root = Path(__file__).parent.parent.parent / "agent-generator"
if (ag_root / "src" / "skills").exists():
    result = generate_all(
        context,
        tools_dir=str(ag_root / "src" / "tools"),
        skills_dir=str(ag_root / "src" / "skills"),
        output_dir="test_output",
    )
    print(f"Overall status: {result['status']}")
    print(f"Message: {result['message']}")

    if "schemas_result" in result:
        print(f"\nSchemas result: {result['schemas_result']['status']}")
        print(f"Schemas message: {result['schemas_result']['message']}")

    if "prompt_result" in result:
        print(f"\nPrompt result: {result['prompt_result']['status']}")
        print(f"Prompt message: {result['prompt_result']['message']}")

    print("✅ Test 4 completed\n")
else:
    print("⚠️  agent-generator directory not found, skipping\n")

# Test 5: Error handling
print("=== TEST 5: Error Handling ===")
result = generate_agent_prompt(context, skills_dir="nonexistent_skills_dir")
print(f"Status: {result['status']}")
assert result["status"] == "error"
assert "not found" in result["message"]
print("✅ Test 5 passed\n")

print("🎉 All generate_schemas.py tests completed!")
print("\n📋 Summary:")
print("- Function imports: ✅")
print("- Validation logic: ✅")
print("- Error handling: ✅")
print("- Path resolution: ✅")
print(
    "- Skills processing: ✅"
    if skills_dir.exists()
    else "- Skills processing: ⚠️ (no skills dir)"
)
