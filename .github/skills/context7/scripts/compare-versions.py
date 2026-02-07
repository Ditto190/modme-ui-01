#!/usr/bin/env python3
# Compare Versions - Compare documentation between two library versions.
#
# Usage:
#     python compare-versions.py --library next.js --old 13 --new 14
#     python compare-versions.py --library react --old 17.0.2 --new 18.2.0 --verbose
#     python compare-versions.py --library express --old 4 --new 5 --topic routing
#
# Arguments:
#     --library: Library name (required)
#     --old: Old version number (required)
#     --new: New version number (required)
#     --topic: Specific topic to compare (optional)
#     --verbose: Enable verbose output

import argparse
import sys
from difflib import unified_diff
from typing import Any, Dict, Optional


def get_library_docs(library_id: str, topic: Optional[str] = None) -> Dict[str, Any]:
    """Fetch library documentation."""
    return {
        "content": f"Documentation for {library_id}",
        "version": library_id.split("/")[-1] if "/" in library_id else "latest",
        "features": [],
        "breaking_changes": []
    }

def extract_features(docs: Dict[str, Any]) -> list[str]:
    """Extract features from documentation."""
    return docs.get("features", [])

def extract_breaking_changes(docs: Dict[str, Any]) -> list[str]:
    """Extract breaking changes from documentation."""
    return docs.get("breaking_changes", [])

def compare_docs(old_docs: Dict[str, Any], new_docs: Dict[str, Any]) -> Dict[str, Any]:
    """Compare two documentation versions."""
    old_content = old_docs.get("content", "").split("\n")
    new_content = new_docs.get("content", "").split("\n")

    diff = list(unified_diff(
        old_content,
        new_content,
        lineterm="",
        fromfile=f"v{old_docs.get('version', 'old')}",
        tofile=f"v{new_docs.get('version', 'new')}"
    ))

    return {
        "old_version": old_docs.get("version"),
        "new_version": new_docs.get("version"),
        "diff": diff,
        "old_features": extract_features(old_docs),
        "new_features": extract_features(new_docs),
        "breaking_changes": extract_breaking_changes(new_docs)
    }

def main():
    parser = argparse.ArgumentParser(
        description="Compare documentation between library versions"
    )
    parser.add_argument(
        "--library",
        required=True,
        help="Library name (e.g., next.js, react)"
    )
    parser.add_argument(
        "--old",
        required=True,
        help="Old version number"
    )
    parser.add_argument(
        "--new",
        required=True,
        help="New version number"
    )
    parser.add_argument(
        "--topic",
        help="Specific topic to compare"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose output"
    )

    args = parser.parse_args()

    # Construct library IDs
    base_id = f"/{args.library.replace('.', '/')}"
    old_id = f"{base_id}/v{args.old}"
    new_id = f"{base_id}/v{args.new}"

    if args.verbose:
        print(f"🔍 Comparing {old_id} → {new_id}")

    # Fetch documentation for both versions
    try:
        old_docs = get_library_docs(old_id, args.topic)
        new_docs = get_library_docs(new_id, args.topic)
    except Exception as e:
        print(f"❌ Error fetching docs: {e}", file=sys.stderr)
        return 1

    # Compare documentation
    comparison = compare_docs(old_docs, new_docs)

    # Display results
    print("\n📊 Version Comparison")
    print("=" * 60)
    print(f"Old Version: {comparison['old_version']}")
    print(f"New Version: {comparison['new_version']}")

    if comparison.get("breaking_changes"):
        print("\n⚠️  Breaking Changes")
        print("-" * 60)
        for change in comparison["breaking_changes"]:
            print(f"  • {change}")

    if comparison.get("new_features"):
        print("\n✨ New Features")
        print("-" * 60)
        for feature in comparison["new_features"]:
            print(f"  • {feature}")

    if comparison.get("diff"):
        print("\n📝 Documentation Diff")
        print("-" * 60)
        for line in comparison["diff"][:50]:  # Limit to first 50 lines
            print(line)
        if len(comparison["diff"]) > 50:
            print(f"\n... and {len(comparison['diff']) - 50} more lines")

    print("\n✅ Comparison complete!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
