#!/usr/bin/env python3
"""
Standalone test script for collection generation.
Bypasses agent dependencies for testing purposes.
"""

import sys
from pathlib import Path

# Add agent directory to path
agent_dir = Path(__file__).parent.parent.parent / "agent"
sys.path.insert(0, str(agent_dir))

import re
from typing import Any, Dict, List, Optional

import yaml


# Mock ToolContext for standalone execution
class MockToolContext:
    state = {}

def create_collection(
    tool_context: MockToolContext,
    collection_id: str,
    name: str,
    description: str,
    items: List[Dict[str, Any]],
    tags: Optional[List[str]] = None,
    display: Optional[Dict[str, Any]] = None,
    output_path: Optional[str] = None
) -> Dict[str, str]:
    """Create a collection YAML file."""
    
    # Validate collection_id
    if not re.match(r'^[a-z0-9-]+$', collection_id):
        return {
            "status": "error",
            "message": f"Invalid collection_id: {collection_id}. Must be lowercase-hyphenated."
        }
    
    if len(collection_id) > 50:
        return {
            "status": "error",
            "message": f"collection_id too long: {len(collection_id)} chars (max 50)"
        }
    
    # Validate name length
    if len(name) > 100:
        return {
            "status": "error",
            "message": f"name too long: {len(name)} chars (max 100)"
        }
    
    # Validate description length
    if len(description) > 500:
        return {
            "status": "error",
            "message": f"description too long: {len(description)} chars (max 500)"
        }
    
    # Validate items count
    if not items or len(items) > 50:
        return {
            "status": "error",
            "message": f"items count invalid: {len(items)} (must be 1-50)"
        }
    
    # Validate tags count
    if tags and len(tags) > 10:
        return {
            "status": "error",
            "message": f"Too many tags: {len(tags)} (max 10)"
        }
    
    # Build collection structure
    collection = {
        "id": collection_id,
        "name": name,
        "description": description,
        "items": items
    }
    
    if tags:
        collection["tags"] = tags
    
    if display:
        collection["display"] = display
    
    # Generate YAML
    yaml_content = yaml.dump(
        collection,
        default_flow_style=False,
        sort_keys=False,
        allow_unicode=True
    )
    
    # Determine output path
    if output_path is None:
        output_path = f"collections/{collection_id}.collection.yml"
    
    # Write to file
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(yaml_content)
    
    return {
        "status": "success",
        "message": f"Collection '{name}' created at {output_path}",
        "yaml_content": yaml_content,
        "file_path": str(output_file.absolute())
    }


def example_1_create_manual_collection():
    """Example 1: Manual GenUI Workbench collection."""
    print("\n" + "="*60)
    print("EXAMPLE 1: Creating GenUI Workbench Collection (Manual)")
    print("="*60)
    
    ctx = MockToolContext()
    
    result = create_collection(
        tool_context=ctx,
        collection_id="genui-workbench",
        name="GenUI Workbench",
        description="Generative UI patterns for building AI-powered dashboards with CopilotKit and Google ADK",
        items=[
            {
                "path": "agents/genui-workbench-agent.agent.md",
                "kind": "agent",
                "usage": "Main agent for GenUI workbench operations"
            },
            {
                "path": "instructions/genui-best-practices.instructions.md",
                "kind": "instruction",
                "usage": "Best practices for GenUI implementation"
            },
            {
                "path": "prompts/component-generation.prompt.md",
                "kind": "prompt",
                "usage": "Generate UI components from natural language"
            }
        ],
        tags=["genui", "copilotkit", "adk", "dashboards"],
        display={
            "ordering": "manual",
            "show_badge": True,
            "featured": True
        }
    )
    
    if result["status"] == "success":
        print(f"✅ {result['message']}")
        print(f"📁 File: {result['file_path']}")
        print("\n📄 YAML Content:\n")
        print(result['yaml_content'])
    else:
        print(f"❌ Error: {result['message']}")
    
    return result


def example_2_simple_collection():
    """Example 2: Simple MCP Tools collection."""
    print("\n" + "="*60)
    print("EXAMPLE 2: Creating MCP Tools Collection (Simple)")
    print("="*60)
    
    ctx = MockToolContext()
    
    result = create_collection(
        tool_context=ctx,
        collection_id="mcp-tools-basics",
        name="MCP Tools Basics",
        description="Essential Model Context Protocol tools for agent development",
        items=[
            {
                "path": "agents/github-mcp-agent.agent.md",
                "kind": "agent",
                "usage": "GitHub MCP integration agent"
            },
            {
                "path": "instructions/mcp-server-setup.instructions.md",
                "kind": "instruction",
                "usage": "Set up MCP servers in your workspace"
            }
        ],
        tags=["mcp", "github", "tools"]
    )
    
    if result["status"] == "success":
        print(f"✅ {result['message']}")
        print(f"📁 File: {result['file_path']}")
    else:
        print(f"❌ Error: {result['message']}")
    
    return result


def example_3_validation_test():
    """Example 3: Test validation rules."""
    print("\n" + "="*60)
    print("EXAMPLE 3: Testing Validation Rules")
    print("="*60)
    
    ctx = MockToolContext()
    
    # Test invalid ID
    print("\n🧪 Test 1: Invalid collection ID (uppercase)")
    result = create_collection(
        tool_context=ctx,
        collection_id="GenUI-Workbench",  # Invalid: has uppercase
        name="Test Collection",
        description="Testing validation",
        items=[{"path": "agents/test.agent.md", "kind": "agent"}]
    )
    print(f"   Result: {result['status']} - {result['message']}")
    
    # Test ID too long
    print("\n🧪 Test 2: Collection ID too long")
    result = create_collection(
        tool_context=ctx,
        collection_id="a" * 51,  # Invalid: > 50 chars
        name="Test Collection",
        description="Testing validation",
        items=[{"path": "agents/test.agent.md", "kind": "agent"}]
    )
    print(f"   Result: {result['status']} - {result['message']}")
    
    # Test valid collection
    print("\n🧪 Test 3: Valid collection")
    result = create_collection(
        tool_context=ctx,
        collection_id="test-validation",
        name="Test Validation Collection",
        description="This should pass all validation rules",
        items=[{"path": "agents/test.agent.md", "kind": "agent"}],
        tags=["test"]
    )
    print(f"   Result: {result['status']} - {result['message']}")
    
    return result


def main():
    """Run all examples."""
    print("\n" + "🎯 AGENT COLLECTION GENERATION - STANDALONE TEST")
    print("=" * 60)
    print("Testing collection_manager functionality without agent dependencies\n")
    
    try:
        # Run examples
        example_1_create_manual_collection()
        example_2_simple_collection()
        example_3_validation_test()
        
        print("\n" + "="*60)
        print("✅ All examples completed!")
        print("="*60)
        print(f"\n📁 Check the collections/ directory for generated files:")
        print("   - collections/genui-workbench.collection.yml")
        print("   - collections/mcp-tools-basics.collection.yml")
        print("   - collections/test-validation.collection.yml")
        print("\n")
        
    except Exception as e:
        print(f"\n❌ Error during execution: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
