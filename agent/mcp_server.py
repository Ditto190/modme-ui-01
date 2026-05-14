"""MCP Server implementation exposing agent tools via Model Context Protocol.

Integrates patterns from:
- mcp-use: Full-stack MCP framework
- Containarium: MCP integration for tool management
- Goose: MCP server patterns for autonomous agents
"""

from __future__ import annotations

import asyncio
import json
from typing import Any, Callable, Dict, List, Optional

try:
    from mcp import Server, types
    from mcp.server import NotificationOptions
    from mcp.server.models import InitializationOptions
except ImportError:
    # Graceful degradation if mcp-use not installed
    Server = None
    types = None
    NotificationOptions = None
    InitializationOptions = None


class MCPServerWrapper:
    """Wraps agent tools as MCP server resources and tools."""

    def __init__(self, agent_name: str = "ModMe GenUI Agent"):
        """Initialize MCP server wrapper.

        Args:
            agent_name: Name of the agent for MCP server info
        """
        self.agent_name = agent_name
        self.tools_registry: Dict[str, Callable] = {}
        self.resources_registry: Dict[str, Dict[str, Any]] = {}
        self.server: Optional[Any] = None

        if Server is None:
            print(
                "Warning: mcp-use not installed. MCP server functionality disabled."
            )
            return

        self.server = Server(agent_name)
        self._setup_handlers()

    def _setup_handlers(self):
        """Setup MCP protocol handlers."""
        if not self.server:
            return

        @self.server.list_tools()
        async def handle_list_tools() -> List[types.Tool]:
            """List all available tools."""
            tools = []
            for tool_name, tool_func in self.tools_registry.items():
                # Extract docstring and function signature
                doc = tool_func.__doc__ or f"Execute {tool_name}"
                tools.append(
                    types.Tool(
                        name=tool_name,
                        description=doc.strip(),
                        inputSchema={
                            "type": "object",
                            "properties": self._extract_tool_schema(tool_func),
                        },
                    )
                )
            return tools

        @self.server.call_tool()
        async def handle_call_tool(
            name: str, arguments: dict
        ) -> List[types.TextContent]:
            """Execute a tool call."""
            if name not in self.tools_registry:
                raise ValueError(f"Unknown tool: {name}")

            tool_func = self.tools_registry[name]

            # Create mock ToolContext for MCP calls
            # In production, this should use proper context from agent
            from google.adk.tools import ToolContext

            mock_context = ToolContext(state={})

            try:
                # Call the tool
                result = tool_func(mock_context, **arguments)

                # Return result as TextContent
                return [
                    types.TextContent(
                        type="text", text=json.dumps(result, indent=2)
                    )
                ]
            except Exception as e:
                return [
                    types.TextContent(
                        type="text",
                        text=json.dumps(
                            {"status": "error", "message": str(e)}, indent=2
                        ),
                    )
                ]

        @self.server.list_resources()
        async def handle_list_resources() -> List[types.Resource]:
            """List all available resources."""
            resources = []
            for resource_id, resource_data in self.resources_registry.items():
                resources.append(
                    types.Resource(
                        uri=f"resource://{resource_id}",
                        name=resource_data.get("name", resource_id),
                        description=resource_data.get("description", ""),
                        mimeType=resource_data.get("mimeType", "application/json"),
                    )
                )
            return resources

        @self.server.read_resource()
        async def handle_read_resource(uri: str) -> str:
            """Read a resource by URI."""
            # Extract resource ID from URI
            resource_id = uri.replace("resource://", "")

            if resource_id not in self.resources_registry:
                raise ValueError(f"Unknown resource: {uri}")

            resource_data = self.resources_registry[resource_id]
            content = resource_data.get("content", {})

            return json.dumps(content, indent=2)

    def register_tool(self, name: str, func: Callable):
        """Register an agent tool for MCP exposure.

        Args:
            name: Tool name (should match agent tool name)
            func: Tool function
        """
        self.tools_registry[name] = func

    def register_resource(
        self,
        resource_id: str,
        name: str,
        description: str,
        content: Dict[str, Any],
        mime_type: str = "application/json",
    ):
        """Register a resource for MCP exposure.

        Args:
            resource_id: Unique resource identifier
            name: Human-readable name
            description: Resource description
            content: Resource data (JSON-serializable)
            mime_type: MIME type (default: application/json)
        """
        self.resources_registry[resource_id] = {
            "name": name,
            "description": description,
            "content": content,
            "mimeType": mime_type,
        }

    def _extract_tool_schema(self, func: Callable) -> Dict[str, Any]:
        """Extract JSON schema from function signature.

        Args:
            func: Function to analyze

        Returns:
            JSON schema properties dict
        """
        import inspect

        sig = inspect.signature(func)
        properties = {}

        for param_name, param in sig.parameters.items():
            # Skip ToolContext parameter
            if param_name == "tool_context":
                continue

            # Basic type inference
            param_type = "string"
            if param.annotation != inspect.Parameter.empty:
                if param.annotation == int:
                    param_type = "integer"
                elif param.annotation == bool:
                    param_type = "boolean"
                elif param.annotation == dict or param.annotation == Dict:
                    param_type = "object"
                elif param.annotation == list or param.annotation == List:
                    param_type = "array"

            properties[param_name] = {
                "type": param_type,
                "description": f"Parameter: {param_name}",
            }

        return properties

    async def run(self, transport="stdio"):
        """Run the MCP server.

        Args:
            transport: Transport type (stdio or sse)
        """
        if not self.server:
            raise RuntimeError("MCP server not initialized (mcp-use not installed)")

        if transport == "stdio":
            from mcp.server.stdio import stdio_server

            async with stdio_server() as (read_stream, write_stream):
                await self.server.run(
                    read_stream,
                    write_stream,
                    InitializationOptions(
                        server_name=self.agent_name,
                        server_version="1.0.0",
                        capabilities=self.server.get_capabilities(
                            notification_options=NotificationOptions(),
                            experimental_capabilities={},
                        ),
                    ),
                )
        else:
            raise ValueError(f"Unsupported transport: {transport}")


# Global MCP server instance
_mcp_server: Optional[MCPServerWrapper] = None


def get_mcp_server() -> MCPServerWrapper:
    """Get or create the global MCP server instance."""
    global _mcp_server
    if _mcp_server is None:
        _mcp_server = MCPServerWrapper()
    return _mcp_server


def register_agent_tools_as_mcp(tools: List[Callable]):
    """Register all agent tools with the MCP server.

    Args:
        tools: List of tool functions to register
    """
    mcp_server = get_mcp_server()
    for tool in tools:
        mcp_server.register_tool(tool.__name__, tool)


async def start_mcp_server():
    """Start the MCP server (for standalone mode)."""
    mcp_server = get_mcp_server()
    await mcp_server.run(transport="stdio")


if __name__ == "__main__":
    # Standalone MCP server mode
    asyncio.run(start_mcp_server())
