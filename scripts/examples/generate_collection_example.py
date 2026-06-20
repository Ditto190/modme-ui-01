#!/usr/bin/env python3
"""
Example: Generate GenUI Workbench Collection Programmatically

This script demonstrates how to use collection_manager.py to create
agent collections following the awesome-copilot pattern.
"""

import sys
from pathlib import Path

# Add agent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / "agent"))

from tools.collection_manager import (
    create_collection,
    create_mcp_server_collection,
    scan_repository_for_collection_items,
)


# Mock ToolContext for standalone execution
class MockToolContext:
    state = {}


def example_1_create_manual_collection():
    """Example 1: Create collection with manually defined items"""
    print("\n=== Example 1: Manual Collection Creation ===\n")
    
    repo_root = Path(__file__).parent.parent
    
    collection_id = "genui-workbench"
    name = "GenUI Workbench"
    description = "Generative UI patterns, component registry, and agentic interface development for ModMe GenUI"
    
    tags = [
        "genui",
        "generative-ui",
        "copilotkit",
        "adk",
        "python"
    ]
    
    items = [
        {
            "path": "instructions/generative-ui-architecture.instructions.md",
            "kind": "instruction",
            "usage": "GenUI architecture patterns and best practices"
        },
        {
            "path": "instructions/python-adk-agent.instructions.md",
            "kind": "instruction",
            "usage": "Google ADK agent development standards"
        },
        {
            "path": "prompts/create-genui-component.prompt.md",
            "kind": "prompt",
            "usage": "Generate GenUI registry components"
        },
        {
            "path": "agents/workbench-assistant.agent.md",
            "kind": "agent",
            "usage": "GenUI workbench development agent"
        }
    ]
    
    display = {
        "ordering": "manual",
        "show_badge": True,
        "featured": True
    }
    
    output_path = repo_root / "collections" / f"{collection_id}.collection.yml"
    
    result = create_collection(
        tool_context=MockToolContext(),
        collection_id=collection_id,
        name=name,
        description=description,
        items=items,
        tags=tags,
        display=display,
        output_path=str(output_path)
    )
    
    if result['status'] == 'success':
        print(f"✅ Collection created: {output_path}")
        print(f"\nYAML Preview:\n{result['yaml_content']}")
    else:
        print(f"❌ Error: {result['message']}")


def example_2_scan_and_create():
    """Example 2: Scan repository and auto-generate collection"""
    print("\n=== Example 2: Auto-Generate from Repository Scan ===\n")
    
    repo_root = Path(__file__).parent.parent
    
    # Scan for items with specific tags
    scan_result = scan_repository_for_collection_items(
        tool_context=MockToolContext(),
        repo_root=str(repo_root),
        tag_filter=["genui", "copilotkit"],
        kind_filter=["agent", "instruction"]
    )
    
    if scan_result['status'] == 'success':
        print(f"✅ Found {scan_result['count']} items matching criteria")
        
        if scan_result['count'] > 0:
            # Create collection from scanned items
            result = create_collection(
                tool_context=MockToolContext(),
                collection_id="genui-auto-generated",
                name="GenUI Auto-Generated Collection",
                description="Automatically generated collection from repository scan",
                items=scan_result['items'],
                tags=["genui", "auto-generated"],
                output_path=str(repo_root / "collections" / "genui-auto.collection.yml")
            )
            
            if result['status'] == 'success':
                print(f"\n✅ Collection created with {len(scan_result['items'])} items")
            else:
                print(f"\n❌ Error creating collection: {result['message']}")
    else:
        print(f"❌ Scan failed: {scan_result['message']}")


def example_3_mcp_server_collection():
    """Example 3: Create collection for agents using specific MCP server"""
    print("\n=== Example 3: MCP Server Collection ===\n")
    
    repo_root = Path(__file__).parent.parent
    
    result = create_mcp_server_collection(
        tool_context=MockToolContext(),
        mcp_server_name="github",
        repo_root=str(repo_root)
    )
    
    if result['status'] == 'success':
        print(f"✅ GitHub agents collection created")
        print(f"\nYAML Preview:\n{result['yaml_content']}")
    else:
        print(f"❌ Error: {result['message']}")


def main():
    """Run all examples"""
    print("\n" + "="*60)
    print("Agent Collection Programming Examples")
    print("Based on awesome-copilot patterns")
    print("="*60)
    
    # Run examples
    example_1_create_manual_collection()
    example_2_scan_and_create()
    example_3_mcp_server_collection()
    
    print("\n" + "="*60)
    print("Examples completed!")
    print("="*60 + "\n")


if __name__ == '__main__':
    main()
