"""
Quick Example - Fetch Context7 documentation for a library and topic.

Usage:
    python quick-example.py --library react --topic hooks
    python quick-example.py --library next.js --topic routing --mode info
    python quick-example.py --library express --topic middleware --verbose

Arguments:
    --library: Library name to look up (required)
    --topic: Specific topic to fetch (optional)
    --mode: Documentation mode - "code" or "info" (default: "code")
    --page: Page number for pagination (default: 1)
    --verbose: Enable verbose output
    --cache: Use session cache (default: True)
"""

import argparse
import sys
from typing import Any, Dict, Literal, Optional


# Simulated MCP tools (replace with actual MCP client calls)
def resolve_library_id(library_name: str) -> Dict[str, Any]:
    """
    Resolve library name to Context7 ID.

    In real implementation, this calls:
    mcp_io_github_ups_resolve_library_id(libraryName=library_name)
    """
    # Example response structure
    return {
        "libraries": [
            {
                "id": f"/{library_name.replace('.', '/')}",
                "name": library_name,
                "benchmarkScore": 95,
                "reputation": "High",
                "codeSnippets": 150
            }
        ]
    }

def get_library_docs(
    library_id: str,
    mode: Literal["code", "info"] = "code",
    topic: Optional[str] = None,
    page: int = 1
) -> Dict[str, Any]:
    """
    Fetch library documentation from Context7.

    In real implementation, this calls:
    mcp_io_github_ups_get_library_docs(
        context7CompatibleLibraryID=library_id,
        mode=mode,
        topic=topic,
        page=page
    )
    """
    # Example response structure
    return {
        "content": f"Documentation for {library_id}",
        "codeExamples": [
            {
                "language": "typescript",
                "code": "const example = 'code';",
                "description": "Example usage"
            }
        ],
        "metadata": {
            "version": "1.0.0",
            "hasMore": False
        }
    }

# Session cache
CACHE: Dict[str, Dict[str, Any]] = {}

def get_cache_key(library_id: str, mode: str, topic: Optional[str]) -> str:
    """Generate cache key from parameters."""
    return f"{library_id}:{mode}:{topic or 'none'}"

def main():
    parser = argparse.ArgumentParser(
        description="Fetch Context7 documentation for a library and topic"
    )
    parser.add_argument(
        "--library",
        required=True,
        help="Library name (e.g., react, next.js, express)"
    )
    parser.add_argument(
        "--topic",
        help="Specific topic to fetch (e.g., hooks, routing, middleware)"
    )
    parser.add_argument(
        "--mode",
        choices=["code", "info"],
        default="code",
        help="Documentation mode: 'code' for API reference, 'info' for concepts"
    )
    parser.add_argument(
        "--page",
        type=int,
        default=1,
        help="Page number for pagination (1-10)"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Disable cache"
    )

    args = parser.parse_args()

    # Step 1: Resolve library ID
    if args.verbose:
        print(f"🔍 Resolving library: {args.library}")

    try:
        resolved = resolve_library_id(args.library)
    except Exception as e:
        print(f"❌ Error resolving library: {e}", file=sys.stderr)
        return 1

    if not resolved.get("libraries"):
        print(f"❌ No libraries found for: {args.library}", file=sys.stderr)
        return 1

    # Select best library
    library = resolved["libraries"][0]
    library_id = library["id"]

    if args.verbose:
        print(f"✅ Resolved to: {library_id}")
        print(f"   Benchmark Score: {library.get('benchmarkScore', 'N/A')}")
        print(f"   Reputation: {library.get('reputation', 'N/A')}")

    # Step 2: Check cache
    cache_key = get_cache_key(library_id, args.mode, args.topic)

    if not args.no_cache and cache_key in CACHE:
        if args.verbose:
            print("💾 Using cached documentation")
        docs = CACHE[cache_key]
    else:
        # Step 3: Fetch documentation
        if args.verbose:
            print(f"📚 Fetching documentation (mode: {args.mode}, page: {args.page})")

        try:
            docs = get_library_docs(
                library_id=library_id,
                mode=args.mode,
                topic=args.topic,
                page=args.page
            )
        except Exception as e:
            print(f"❌ Error fetching docs: {e}", file=sys.stderr)
            return 1

        # Cache the result
        if not args.no_cache:
            CACHE[cache_key] = docs

    # Step 4: Display results
    if not docs.get("content"):
        print(f"⚠️  No content found for topic: {args.topic}", file=sys.stderr)
        print("💡 Try a broader topic or different mode", file=sys.stderr)
        return 1

    print("\n📖 Documentation Retrieved")
    print("=" * 60)
    print(docs["content"])

    if docs.get("codeExamples"):
        print("\n💻 Code Examples")
        print("-" * 60)
        for i, example in enumerate(docs["codeExamples"], 1):
            print(f"\nExample {i}: {example.get('description', 'No description')}")
            print(f"```{example.get('language', 'text')}")
            print(example.get("code", ""))
            print("```")

    if docs.get("metadata"):
        metadata = docs["metadata"]
        print("\n📊 Metadata")
        print("-" * 60)
        print(f"Version: {metadata.get('version', 'Unknown')}")
        print(f"Has More Pages: {metadata.get('hasMore', False)}")

    print("\n✅ Success!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
