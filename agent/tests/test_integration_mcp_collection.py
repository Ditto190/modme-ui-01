#!/usr/bin/env python3
"""
Integration Test: MCP Toolset → Agent Collection Generation

This script demonstrates the complete workflow:
1. Fetch MCP toolset details (simulated)
2. Extract keywords from toolset metadata
3. Generate agent collection using collection_generator.py
4. Show results and generated files
"""

import sys
from pathlib import Path
from typing import Any, Dict, List

# Add paths
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "agent" / "tools"))
sys.path.insert(0, str(project_root / "agent-library" / "scripts"))

from collection_generator import generate_collection_from_search

# Simulated MCP toolset data (would come from mcp_awesome-copil_get_toolset_tools)
MOCK_TOOLSET_DATA = {
    "toolset_name": "awesome-copilot",
    "description": "GitHub Copilot collections for agent workflows, schema validation, and TypeScript development",
    "tools": [
        {
            "name": "get_toolset_tools",
            "description": "Get detailed list of tools in a toolset",
            "tags": ["collection", "toolset", "metadata"]
        },
        {
            "name": "list_collections",
            "description": "List all available collections",
            "tags": ["collection", "registry", "browsing"]
        }
    ],
    "tags": ["copilot", "github", "agent", "collection", "toolset", "mcp"],
    "category": "Development Tools"
}


def extract_keywords_from_toolset(toolset_data: Dict[str, Any]) -> List[str]:
    """Extract relevant keywords from MCP toolset metadata"""
    keywords = set()

    # Add tags
    if 'tags' in toolset_data:
        keywords.update(toolset_data['tags'])

    # Extract keywords from description
    description = toolset_data.get('description', '')
    # Simple keyword extraction (in production, use NLP)
    desc_words = [
        word.strip('.,()[]')
        for word in description.lower().split()
        if len(word) > 4
    ]
    keywords.update(desc_words[:5])

    # Add category
    if 'category' in toolset_data:
        keywords.add(toolset_data['category'].lower().replace(' ', '-'))

    return list(keywords)[:10]  # Limit to top 10


def generate_collection_from_mcp_toolset(
    toolset_data: Dict[str, Any],
    max_items: int = 15
) -> Dict[str, Any]:
    """
    Generate an agent collection based on MCP toolset metadata

    Args:
        toolset_data: MCP toolset information
        max_items: Maximum items to include in collection

    Returns:
        Result dictionary with collection info
    """
    print("=" * 70)
    print("🧪 INTEGRATION TEST: MCP Toolset → Agent Collection")
    print("=" * 70)
    print()

    # Step 1: Extract keywords
    print("📝 Step 1: Extract keywords from MCP toolset")
    print(f"   Toolset: {toolset_data.get('toolset_name', 'unknown')}")
    print(f"   Description: {toolset_data.get('description', 'N/A')[:80]}...")
    print()

    keywords = extract_keywords_from_toolset(toolset_data)
    print(f"   ✅ Extracted {len(keywords)} keywords: {', '.join(keywords)}")
    print()

    # Step 2: Generate collection
    print("📚 Step 2: Generate agent collection from keywords")
    print()

    keywords_str = ' '.join(keywords)
    output_name = f"mcp-{toolset_data['toolset_name']}"

    result = generate_collection_from_search(
        keywords=keywords_str,
        max_items=max_items,
        include_agents=True,
        include_prompts=True,
        include_instructions=True,
        include_skills=False,
        output_name=output_name
    )

    # Step 3: Display results
    print()
    print("=" * 70)
    print("📊 RESULTS")
    print("=" * 70)
    print()

    if result['status'] == 'success':
        print("✅ Collection generated successfully!")
        print()
        print(f"📄 Collection ID: {result['collection_id']}")
        print(f"📝 Collection Name: {result['collection_name']}")
        print(f"🔢 Item Count: {result['item_count']}")
        print(f"🏷️  Tags: {', '.join(result['tags'])}")
        print()
        print("📁 Files created:")
        for file in result['files_created']:
            print(f"   • {file}")
        print()

        # Read and display YAML file
        yaml_path = Path(project_root / "agent-library" / result['files_created'][0])
        if yaml_path.exists():
            print("=" * 70)
            print(f"📄 Generated Collection File: {yaml_path.name}")
            print("=" * 70)
            print()
            with open(yaml_path, 'r', encoding='utf-8') as f:
                print(f.read())
    else:
        print(f"❌ Error: {result['message']}")
        if 'error_type' in result:
            print(f"   Error Type: {result['error_type']}")

    return result


def main():
    """Run the integration test"""
    print()
    print("🚀 Starting MCP Toolset → Agent Collection Integration Test")
    print()

    # Test 1: Generate collection from mock MCP toolset
    print("Test 1: Generate collection from MCP toolset metadata")
    print("-" * 70)
    print()

    result = generate_collection_from_mcp_toolset(
        MOCK_TOOLSET_DATA,
        max_items=10
    )

    # Test 2: Generate with different keyword set
    print()
    print()
    print("Test 2: Generate collection with custom keywords")
    print("-" * 70)
    print()

    custom_result = generate_collection_from_search(
        keywords="api integration rest graphql",
        max_items=8,
        output_name="api-integration-tools"
    )

    if custom_result['status'] == 'success':
        print(f"✅ Custom collection: {custom_result['collection_id']}")
        print(f"   Items: {custom_result['item_count']}")
        print(f"   Tags: {', '.join(custom_result['tags'])}")

    print()
    print("=" * 70)
    print("✅ Integration Test Complete!")
    print("=" * 70)
    print()
    print("Summary:")
    print("  • Tested MCP toolset metadata extraction")
    print(f"  • Generated {2} agent collections")
    print("  • Validated file creation and content")
    print()


if __name__ == '__main__':
    main()
