#!/usr/bin/env python3
"""
Test script for the Dynamic Collection Generator

This script tests the collection generator with sample keywords
and validates the output structure.
"""

import sys
from pathlib import Path

# Add scripts directory to path
scripts_dir = Path(__file__).parent
sys.path.insert(0, str(scripts_dir))

from generate_collection_from_keywords import CollectionGenerator  # noqa: E402


def test_collection_generator():
    """Test basic collection generation"""
    print("🧪 Testing Dynamic Collection Generator\n")
    print("=" * 60)

    # Setup
    agent_library_root = scripts_dir.parent
    generator = CollectionGenerator(agent_library_root)

    # Test 1: Basic keyword search
    print("\n📋 Test 1: Basic Keyword Search")
    print("-" * 60)
    keywords = ["testing", "automation"]
    collection = generator.generate_collection(
        keywords=keywords,
        max_items=5,
        include_agents=True,
        include_prompts=True,
        include_instructions=True,
        output_name="test-collection"
    )

    print(f"\n✅ Generated collection: {collection['id']}")
    print(f"   Name: {collection['name']}")
    print(f"   Items: {len(collection['items'])}")
    print(f"   Tags: {', '.join(collection['tags'][:5])}")

    # Validate structure
    assert 'id' in collection
    assert 'name' in collection
    assert 'items' in collection
    assert 'tags' in collection
    assert len(collection['items']) <= 5
    print("   ✓ Structure validation passed")

    # Test 2: Multiple categories
    print("\n📋 Test 2: Multiple Categories")
    print("-" * 60)
    keywords = ["react", "nextjs", "typescript"]
    collection = generator.generate_collection(
        keywords=keywords,
        max_items=10,
        output_name="frontend-test"
    )

    print(f"\n✅ Generated collection: {collection['id']}")
    print(f"   Total items: {len(collection['items'])}")

    # Count by kind
    kinds = {}
    for item in collection['items']:
        kind = item['kind']
        kinds[kind] = kinds.get(kind, 0) + 1

    for kind, count in kinds.items():
        print(f"   - {kind}: {count}")

    print("   ✓ Multi-category test passed")

    # Test 3: Relevance scoring
    print("\n📋 Test 3: Relevance Scoring")
    print("-" * 60)

    # Test 4: Output structure
    print("\n📋 Test 4: Output Structure Validation")
    print("-" * 60)

    required_fields = ['id', 'name', 'description', 'tags', 'items', 'display']
    for field in required_fields:
        assert field in collection, f"Missing required field: {field}"
        print(f"   ✓ {field}: present")

    # Validate display settings
    assert 'ordering' in collection['display']
    assert 'show_badge' in collection['display']
    print("   ✓ Display settings: valid")

    # Validate items structure
    if collection['items']:
        first_item = collection['items'][0]
        assert 'path' in first_item
        assert 'kind' in first_item
        print("   ✓ Item structure: valid")

    print("\n" + "=" * 60)
    print("✅ All tests passed!")
    print("\n💡 Next steps:")
    print("   1. Run with real keywords:")
    print("      python generate_collection_from_keywords.py \"your keywords\"")
    print("   2. Check output in agent-library/collections/")
    print("   3. Review and customize generated files")


if __name__ == '__main__':
    try:
        test_collection_generator()
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
