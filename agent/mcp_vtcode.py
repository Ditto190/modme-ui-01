"""MCP client for VT Code integration."""

import os
from typing import Dict, List, Optional, Any
import httpx
from pydantic import BaseModel


class MCPToolCall(BaseModel):
    """MCP tool call request."""
    tool: str
    params: Dict[str, Any]


class MCPToolResult(BaseModel):
    """MCP tool call result."""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None


class VTCodeMCPClient:
    """Client for VT Code MCP server."""
    
    def __init__(self, base_url: str = "http://localhost:8080"):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def call_tool(self, tool: str, params: Dict[str, Any]) -> MCPToolResult:
        """Call a VT Code tool via MCP protocol."""
        try:
            response = await self.client.post(
                f"{self.base_url}/mcp/invoke",
                json={"tool": tool, "params": params}
            )
            response.raise_for_status()
            result = response.json()
            return MCPToolResult(success=True, data=result)
        except Exception as e:
            return MCPToolResult(success=False, error=str(e))
    
    async def edit_file(
        self, 
        path: str, 
        edits: List[Dict[str, Any]]
    ) -> MCPToolResult:
        """Edit a file using VT Code's semantic editing."""
        return await self.call_tool("edit_file", {
            "path": path,
            "edits": edits
        })
    
    async def search_files(
        self, 
        pattern: str, 
        paths: Optional[List[str]] = None
    ) -> MCPToolResult:
        """Search files using grep."""
        return await self.call_tool("grep_file", {
            "pattern": pattern,
            "paths": paths or ["."]
        })
    
    async def read_file(self, path: str) -> MCPToolResult:
        """Read file contents."""
        return await self.call_tool("read_file", {"path": path})
    
    async def create_pty_session(
        self, 
        command: str, 
        args: Optional[List[str]] = None
    ) -> MCPToolResult:
        """Create a PTY session for shell execution."""
        return await self.call_tool("create_pty_session", {
            "command": command,
            "args": args or []
        })
    
    async def read_pty_output(self, session_id: str) -> MCPToolResult:
        """Read output from a PTY session."""
        return await self.call_tool("read_pty_session", {
            "session_id": session_id
        })
    
    async def search_symbols(
        self, 
        query: str, 
        language: str = "typescript"
    ) -> MCPToolResult:
        """Search for code symbols using Tree-sitter."""
        return await self.call_tool("search_symbols", {
            "query": query,
            "language": language
        })
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()


# Singleton instance
_vtcode_client: Optional[VTCodeMCPClient] = None


def get_vtcode_client() -> VTCodeMCPClient:
    """Get or create VT Code MCP client singleton."""
    global _vtcode_client
    if _vtcode_client is None:
        base_url = os.getenv("VTCODE_MCP_URL", "http://localhost:8080")
        _vtcode_client = VTCodeMCPClient(base_url=base_url)
    return _vtcode_client
