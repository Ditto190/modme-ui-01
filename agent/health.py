"""Health check for VT Code MCP connection."""

import httpx
import os


async def check_vtcode_health() -> bool:
    """Check if VT Code MCP server is accessible."""
    base_url = os.getenv("VTCODE_MCP_URL", "http://localhost:8080")
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{base_url}/health")
            return response.status_code == 200
    except Exception:
        return False


async def wait_for_vtcode(max_attempts: int = 10, delay: float = 2.0):
    """Wait for VT Code to become available."""
    import asyncio
    
    for attempt in range(max_attempts):
        if await check_vtcode_health():
            print("✅ VT Code MCP server is ready")
            return True
        
        print(f"⏳ Waiting for VT Code... (attempt {attempt + 1}/{max_attempts})")
        await asyncio.sleep(delay)
    
    print("❌ VT Code MCP server not available")
    return False
