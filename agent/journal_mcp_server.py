"""MCP server wrapper for journal skill.

Exposes journal add/list/search as MCP tools via FastMCP.
Supports both HTTP and stdio transports.

Usage:
  # HTTP server
  python agent/journal_mcp_server.py

  # stdio (for MCP clients)
  python agent/journal_mcp_server.py --transport stdio
"""

from pathlib import Path

from fastmcp import Context, FastMCP

from skills_ref.journal import Journal

# Initialize FastMCP server
mcp = FastMCP(
    name="JournalServer",
    description="MCP server for managing journal entries with basic search",
)

# Data directory for journal storage
DATA_DIR = Path(__file__).parent / "agent_data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
JOURNAL_PATH = DATA_DIR / "journal.jsonl"


@mcp.tool()
async def journal_add(text: str, tags: str = "", ctx: Context = None) -> dict:
    """Add a new entry to the journal.
    
    Args:
        text: The entry text content (required)
        tags: Comma-separated tags (optional)
        
    Returns:
        Dict with entry id, timestamp, and confirmation message
    """
    if ctx:
        await ctx.info(f"Adding journal entry: {text[:50]}...")
    
    journal = Journal(JOURNAL_PATH)
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    entry = journal.add(text, tags=tag_list)
    
    return {
        "status": "success",
        "id": entry["id"],
        "timestamp": entry["ts"],
        "message": f"Entry added with id {entry['id']}"
    }


@mcp.tool()
async def journal_list(limit: int = 10, ctx: Context = None) -> dict:
    """List recent journal entries.
    
    Args:
        limit: Maximum number of entries to return (default 10)
        
    Returns:
        Dict with entries array and count
    """
    if ctx:
        await ctx.info(f"Listing up to {limit} journal entries")
    
    journal = Journal(JOURNAL_PATH)
    entries = list(journal.list())
    
    # Return most recent first, limit results
    entries.reverse()
    limited_entries = entries[:limit]
    
    # Clean up entries (remove embeddings for display)
    clean_entries = [
        {
            "id": e["id"],
            "timestamp": e["ts"],
            "text": e["text"],
            "tags": e.get("tags", [])
        }
        for e in limited_entries
    ]
    
    return {
        "status": "success",
        "count": len(clean_entries),
        "total": len(entries),
        "entries": clean_entries
    }


@mcp.tool()
async def journal_search(query: str, limit: int = 5, ctx: Context = None) -> dict:
    """Search journal entries by semantic similarity.
    
    Args:
        query: Search query text
        limit: Maximum number of results (default 5)
        
    Returns:
        Dict with matching entries ranked by relevance
    """
    if ctx:
        await ctx.info(f"Searching journal for: {query}")
    
    journal = Journal(JOURNAL_PATH)
    results = journal.search(query, top_k=limit)
    
    # Clean up results
    clean_results = [
        {
            "id": e["id"],
            "timestamp": e["ts"],
            "text": e["text"],
            "tags": e.get("tags", [])
        }
        for e in results
    ]
    
    return {
        "status": "success",
        "query": query,
        "count": len(clean_results),
        "results": clean_results
    }


# Add a resource that shows journal statistics
@mcp.resource("journal://stats")
def get_journal_stats() -> dict:
    """Provides statistics about the journal database."""
    journal = Journal(JOURNAL_PATH)
    entries = list(journal.list())
    
    # Collect tag statistics
    tag_counts = {}
    for entry in entries:
        for tag in entry.get("tags", []):
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    return {
        "total_entries": len(entries),
        "tag_counts": tag_counts,
        "storage_path": str(JOURNAL_PATH.resolve())
    }


if __name__ == "__main__":
    import sys
    
    # Check if stdio transport requested
    if "--transport" in sys.argv and "stdio" in sys.argv:
        # Run as stdio server (for MCP clients)
        mcp.run(transport="stdio")
    else:
        # Run as HTTP server (default)
        print("Starting Journal MCP server on http://localhost:8001")
        print(f"Journal storage: {JOURNAL_PATH.resolve()}")
        print("\nAvailable tools:")
        print("  - journal_add: Add new entry")
        print("  - journal_list: List recent entries")
        print("  - journal_search: Search entries")
        print("\nAvailable resources:")
        print("  - journal://stats: Journal statistics")
        mcp.run(transport="sse", port=8001)
