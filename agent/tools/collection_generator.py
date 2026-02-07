"""
Collection Generator Agent Tool

Generates GitHub Copilot collections dynamically from keyword searches.
"""

import sys
from pathlib import Path
from typing import Any, Dict

# Add agent-library scripts to path
agent_library_scripts = Path(__file__).parent.parent.parent / "agent-library" / "scripts"
sys.path.insert(0, str(agent_library_scripts))

try:
    from generate_collection_from_keywords import CollectionGenerator
except ImportError as e:
    print(f"Warning: Could not import CollectionGenerator: {e}")
    CollectionGenerator = None


def generate_collection_from_search(
    keywords: str,
    max_items: int = 15,
    include_agents: bool = True,
    include_prompts: bool = True,
    include_instructions: bool = True,
    include_skills: bool = False,
    output_name: str = None
) -> Dict[str, Any]:
    """
    Generate a collection based on keyword search.

    Args:
        keywords: Space-separated keywords to search for
        max_items: Maximum items to include (default: 15)
        include_agents: Include agent files (default: True)
        include_prompts: Include prompt files (default: True)
        include_instructions: Include instruction files (default: True)
        include_skills: Include skill files (default: False)
        output_name: Custom collection ID (optional)

    Returns:
        Dict with status, message, and collection data
    """
    if not CollectionGenerator:
        return {
            "status": "error",
            "message": "CollectionGenerator not available. Check dependencies."
        }

    try:
        # Find agent-library root
        agent_library_root = Path(__file__).parent.parent.parent / "agent-library"

        if not agent_library_root.exists():
            return {
                "status": "error",
                "message": f"agent-library not found at {agent_library_root}"
            }

        # Parse keywords
        keyword_list = keywords.strip().split()

        if not keyword_list:
            return {
                "status": "error",
                "message": "No keywords provided"
            }

        # Initialize generator
        generator = CollectionGenerator(agent_library_root)

        # Generate collection
        collection_data = generator.generate_collection(
            keywords=keyword_list,
            max_items=max_items,
            include_agents=include_agents,
            include_prompts=include_prompts,
            include_instructions=include_instructions,
            include_skills=include_skills,
            output_name=output_name
        )

        # Save collection
        generator.save_collection(collection_data)

        return {
            "status": "success",
            "message": f"Generated collection '{collection_data['id']}' with {len(collection_data['items'])} items",
            "collection_id": collection_data['id'],
            "collection_name": collection_data['name'],
            "item_count": len(collection_data['items']),
            "tags": collection_data['tags'][:5],  # First 5 tags
            "files_created": [
                f"collections/{collection_data['id']}.collection.yml",
                f"collections/{collection_data['id']}.md",
                f"collections/{collection_data['id']}.metadata.json"
            ]
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Collection generation failed: {str(e)}",
            "error_type": type(e).__name__
        }


# Example usage
if __name__ == "__main__":
    # Test the tool
    result = generate_collection_from_search(
        keywords="testing automation",
        max_items=5
    )

    print(f"Status: {result['status']}")
    print(f"Message: {result['message']}")

    if result['status'] == 'success':
        print(f"\nCollection ID: {result['collection_id']}")
        print(f"Item Count: {result['item_count']}")
        print(f"Tags: {', '.join(result['tags'])}")
        print("\nFiles created:")
        for file in result['files_created']:
            print(f"  - {file}")
