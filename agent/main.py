"""Generic Workbench Agent for Generative UI interaction."""

from __future__ import annotations

import atexit
import json
import os
from datetime import datetime
from typing import Any, Dict, Optional

from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from dotenv import load_dotenv
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.adk.tools import ToolContext
from google.genai import types

from mcp_vtcode import get_vtcode_client

# Import VT Code integration
from tools.code_tools import (
    analyze_component_props,
    create_new_component,
    edit_component,
    run_build_check,
)
from tools.collection_manager import (
    create_collection,
    create_mcp_server_collection,
    scan_repository_for_collection_items,
)
from tools.journal_adapter import process_feelings

# Import new integration modules
from llm_providers import LLMProvider, LLMConfig, get_provider_manager
from mcp_server import get_mcp_server, register_agent_tools_as_mcp
from permissions import get_permission_manager, requires_permission, PermissionLevel
from recipes import get_recipe_manager, RecipeExecutor
from sse_handler import get_event_bus, sse_stream

# Import FastMCP server
from fastmcp_server import mcp as fastmcp_server

load_dotenv()

# Validation constants for type safety
ALLOWED_TYPES = {"StatCard", "DataTable", "ChartCard"}


def upsert_ui_element(
    tool_context: ToolContext, id: str, type: str, props: Dict[str, Any]
) -> Dict[str, str]:
    """
    Add or update a UI element in the workbench canvas.

    Args:
        id: Unique identifier for the element (snake_case recommended)
        type: Component type (PascalCase, must match registry)
        props: JSON-serializable properties (camelCase keys)

    Returns:
        Success message with element metadata
    """
    # Validate inputs
    if not id or not isinstance(id, str):
        return {"status": "error", "message": "Invalid id: must be non-empty string"}

    if type not in ALLOWED_TYPES:
        return {
            "status": "error",
            "message": f"Unknown type '{type}'. Allowed types: {', '.join(ALLOWED_TYPES)}",
        }

    if not isinstance(props, dict):
        return {"status": "error", "message": "Invalid props: must be a dictionary"}

    # Get current state safely
    elements = tool_context.state.get("elements", [])
    new_element = {"id": id, "type": type, "props": props}

    # Check if element exists (upsert logic)
    found = False
    for i, el in enumerate(elements):
        if el.get("id") == id:
            elements[i] = new_element
            found = True
            break

    if not found:
        elements.append(new_element)

    # Write back to state
    tool_context.state["elements"] = elements

    action = "updated" if found else "added"
    return {
        "status": "success",
        "message": f"Element '{id}' of type '{type}' {action}.",
        "element_count": len(elements),
    }


def remove_ui_element(tool_context: ToolContext, id: str) -> Dict[str, str]:
    """
    Remove a UI element from the canvas by its ID.

    Args:
        id: Unique identifier of the element to remove

    Returns:
        Success message with removal confirmation
    """
    # Validate input
    if not id or not isinstance(id, str):
        return {"status": "error", "message": "Invalid id: must be non-empty string"}

    # Get current state
    elements = tool_context.state.get("elements", [])
    initial_count = len(elements)

    # Filter out the element
    tool_context.state["elements"] = [el for el in elements if el.get("id") != id]
    final_count = len(tool_context.state["elements"])

    # Check if element was actually removed
    if initial_count == final_count:
        return {
            "status": "warning",
            "message": f"Element '{id}' not found (no change made)",
            "element_count": final_count,
        }

    return {
        "status": "success",
        "message": f"Element '{id}' removed.",
        "element_count": final_count,
    }


def clear_canvas(tool_context: ToolContext) -> Dict[str, str]:
    """Remove all elements from the canvas."""
    tool_context.state["elements"] = []
    return {"status": "success", "message": "Canvas cleared."}


def setThemeColor(transaction_context: ToolContext, themeColor: str) -> Dict[str, str]:
    """
    Set the application theme color.

    Args:
        themeColor: Hex color code (e.g. #ff0000)

    Returns:
        Success message
    """
    # This is primarily a frontend tool, but defined here for toolset consistency
    return {"status": "success", "message": f"Theme color set to {themeColor}"}


def on_before_agent(callback_context: CallbackContext):
    """Initialize state."""
    if "elements" not in callback_context.state:
        callback_context.state["elements"] = []
    return None


def before_model_modifier(
    callback_context: CallbackContext, llm_request: LlmRequest
) -> Optional[LlmResponse]:
    """Inject current canvas state into system instructions."""
    elements = callback_context.state.get("elements", [])
    elements_json = json.dumps(elements, indent=2)

    original_instruction = llm_request.config.system_instruction or types.Content(
        role="system", parts=[]
    )

    if not isinstance(original_instruction, types.Content):
        original_instruction = types.Content(
            role="system", parts=[types.Part(text=str(original_instruction))]
        )

    if not original_instruction.parts:
        original_instruction.parts = [types.Part(text="")]

    prefix = f"""You are the Workbench Assistant. You help the user build dashboards and tools.
Current Canvas Elements:
{elements_json}

When asked to create or update UI, use 'upsert_ui_element'.
Available Types: StatCard, DataTable, ChartCard.

Code Editing Capabilities (via VT Code MCP):
- You can edit existing components using 'edit_component'
- You can analyze component props using 'analyze_component_props'
- You can create new components using 'create_new_component'
- You can verify builds using 'run_build_check'
"""
    original_instruction.parts[0].text = prefix + (
        original_instruction.parts[0].text or ""
    )
    llm_request.config.system_instruction = original_instruction
    return None


def after_model_modifier(
    callback_context: CallbackContext, llm_response: LlmResponse
) -> Optional[LlmResponse]:
    """Stop the consecutive tool calling of the agent if it returns text."""
    if llm_response.content and llm_response.content.parts:
        if llm_response.content.role == "model" and llm_response.content.parts[0].text:
            callback_context._invocation_context.end_invocation = True
    return None


workbench_agent = LlmAgent(
    name="WorkbenchAgent",
    model="gemini-2.5-flash",
    instruction="""
    You manage a generative UI workbench. Use tools to create, update or remove elements from the user's view.
    
    Available Components & Props:
    1. StatCard: { title, value, trend, trendDirection }
    2. DataTable: { columns: string[], data: object[] }
    3. ChartCard: { title, chartType, data: object[] }
    
    Always use a meaningful unique 'id' for elements (e.g. 'rev_stat', 'user_table').
    
    Code Editing Tools (VT Code MCP Integration):
    - edit_component: Modify existing GenUI components
    - analyze_component_props: Inspect TypeScript interfaces
    - create_new_component: Generate new components from scratch
    - run_build_check: Verify TypeScript compilation
    
    Collection Management Tools:
    - create_collection: Create agent collection YAML files
    - scan_repository_for_collection_items: Auto-discover collection items
    - create_mcp_server_collection: Group agents by MCP server dependency
    """,
    tools=[
        upsert_ui_element,
        remove_ui_element,
        clear_canvas,
        setThemeColor,
        # VT Code integration tools
        edit_component,
        analyze_component_props,
        create_new_component,
        run_build_check,
        # Journalling tool (private journal adapter)
        process_feelings,
        # Collection management tools
        create_collection,
        scan_repository_for_collection_items,
        create_mcp_server_collection,
    ],
    before_agent_callback=on_before_agent,
    before_model_callback=before_model_modifier,
    after_model_callback=after_model_modifier,
)

adk_agent = ADKAgent(
    adk_agent=workbench_agent,
    user_id="demo_user",
    session_timeout_seconds=3600,
    use_in_memory_services=True,
)

# Create FastMCP HTTP app for mounting
try:
    fastmcp_http_app = fastmcp_server.http_app(path='/mcp')
    # Create FastAPI app with FastMCP lifespan for proper initialization
    app = FastAPI(
        title="GenUI Workbench Agent",
        version="0.3.1",
        lifespan=fastmcp_http_app.lifespan
    )
    # Mount FastMCP server at /mcp endpoint
    app.mount("/mcp", fastmcp_http_app)
    print("[FastMCP] ✅ MCP server mounted at /mcp")
except Exception as e:
    print(f"[FastMCP] ⚠️  Error mounting FastMCP server: {e}")
    # Fallback to regular FastAPI without MCP lifespan
    app = FastAPI(title="GenUI Workbench Agent", version="0.3.1")

# Configure CORS for Codespaces
# Allow requests from the Codespace UI URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://urban-giggle-v9rg679gv4j25ww-3000.github.dev",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

add_adk_fastapi_endpoint(app, adk_agent, path="/")


# Add cleanup handler for VT Code MCP connection
@atexit.register
def cleanup():
    """Cleanup MCP connections on shutdown."""
    import asyncio

    vtcode = get_vtcode_client()
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(vtcode.close())
        else:
            loop.run_until_complete(vtcode.close())
    except Exception as e:
        print(f"Error closing VT Code client: {e}")


# Register agent tools with MCP server
register_agent_tools_as_mcp(
    [
        upsert_ui_element,
        remove_ui_element,
        clear_canvas,
        setThemeColor,
        edit_component,
        analyze_component_props,
        create_new_component,
        run_build_check,
        process_feelings,
        create_collection,
        scan_repository_for_collection_items,
        create_mcp_server_collection,
    ]
)


# Health check endpoints
@app.get("/health")
async def health_check():
    """Liveness probe - basic service availability."""
    return JSONResponse(
        content={
            "status": "healthy",
            "service": "GenUI Workbench Agent",
            "version": "0.3.1",
            "timestamp": datetime.utcnow().isoformat(),
            "model": "gemini-2.5-flash",
            "features": [
                "fastmcp_server",
                "mcp_server",
                "sse_streaming",
                "multi_model_llm",
                "permissions",
                "recipes",
            ],
            "fastmcp": {
                "mounted": True,
                "endpoint": "/mcp",
                "version": fastmcp_server.version,
            },
        },
        status_code=status.HTTP_200_OK,
    )


@app.get("/ready")
async def readiness_check():
    """Readiness probe - all dependencies loaded."""
    try:
        # Check if toolsets are loaded
        from toolset_manager import list_toolsets

        toolsets = list_toolsets()

        # Verify dependencies
        toolsets_healthy = len(toolsets) > 0

        if not toolsets_healthy:
            return JSONResponse(
                content={
                    "status": "not_ready",
                    "dependencies": {"toolsets_loaded": False, "toolset_count": 0},
                    "timestamp": datetime.utcnow().isoformat(),
                },
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return JSONResponse(
            content={
                "status": "ready",
                "dependencies": {
                    "toolsets_loaded": True,
                    "toolset_count": len(toolsets),
                    "toolsets": [ts["id"] for ts in toolsets[:5]],  # First 5 IDs for brevity
                    "model": "gemini-2.5-flash",
                    "allowed_types": list(ALLOWED_TYPES),
                },
                "timestamp": datetime.utcnow().isoformat(),
            },
            status_code=status.HTTP_200_OK,
        )

    except Exception as e:
        return JSONResponse(
            content={
                "status": "not_ready",
                "error": str(e),
                "error_type": type(e).__name__,
                "timestamp": datetime.utcnow().isoformat(),
            },
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


# SSE Streaming endpoint
@app.get("/api/events")
async def events_stream(request: Request, channel: str = "default"):
    """Stream agent events via Server-Sent Events."""
    return await sse_stream(request, channel)


# Permission management endpoints
@app.get("/api/permissions/pending")
async def get_pending_permissions():
    """Get pending permission requests."""
    manager = get_permission_manager()
    requests = manager.get_pending_requests()
    return JSONResponse(
        content={
            "pending_requests": [
                {
                    "tool_name": req.tool_name,
                    "level": req.level.value,
                    "description": req.description,
                    "context": req.context,
                }
                for req in requests
            ]
        }
    )


@app.post("/api/permissions/approve")
async def approve_permission(request_data: Dict[str, Any]):
    """Approve a permission request."""
    # Implementation for approving permissions
    return JSONResponse(content={"status": "approved"})


# Recipe management endpoints
@app.get("/api/recipes")
async def list_recipes(category: Optional[str] = None):
    """List available recipes."""
    manager = get_recipe_manager()
    recipes = manager.list_recipes(category=category)
    return JSONResponse(
        content={
            "recipes": [
                {
                    "id": recipe.id,
                    "name": recipe.name,
                    "description": recipe.description,
                    "category": recipe.category,
                    "tags": recipe.tags,
                    "version": recipe.version,
                }
                for recipe in recipes
            ]
        }
    )


@app.get("/api/recipes/{recipe_id}")
async def get_recipe(recipe_id: str):
    """Get a specific recipe."""
    manager = get_recipe_manager()
    recipe = manager.get_recipe(recipe_id)
    if recipe:
        return JSONResponse(content=recipe.to_dict())
    return JSONResponse(
        content={"error": "Recipe not found"}, status_code=status.HTTP_404_NOT_FOUND
    )


@app.post("/api/recipes/{recipe_id}/execute")
async def execute_recipe(recipe_id: str, variables: Optional[Dict[str, Any]] = None):
    """Execute a recipe workflow."""
    manager = get_recipe_manager()
    recipe = manager.get_recipe(recipe_id)

    if not recipe:
        return JSONResponse(
            content={"error": "Recipe not found"},
            status_code=status.HTTP_404_NOT_FOUND,
        )

    # Create tool registry
    tool_registry = {
        "upsert_ui_element": upsert_ui_element,
        "remove_ui_element": remove_ui_element,
        "clear_canvas": clear_canvas,
    }

    executor = RecipeExecutor(tool_registry)

    # Create mock ToolContext
    from google.adk.tools import ToolContext

    mock_context = ToolContext(state={})

    result = await executor.execute_recipe(recipe, mock_context, variables or {})
    return JSONResponse(content=result)


# Multi-model LLM endpoints
@app.get("/api/llm/providers")
async def list_llm_providers():
    """List available LLM providers."""
    return JSONResponse(
        content={
            "providers": [
                {"id": "gemini", "name": "Google Gemini", "status": "active"},
                {"id": "openai", "name": "OpenAI GPT", "status": "available"},
                {"id": "anthropic", "name": "Anthropic Claude", "status": "available"},
                {"id": "ollama", "name": "Ollama (Local)", "status": "available"},
            ]
        }
    )


@app.get("/api/llm/usage")
async def get_llm_usage():
    """Get LLM usage statistics."""
    manager = get_provider_manager()
    summary = manager.get_usage_summary()
    return JSONResponse(content=summary)


@app.post("/api/llm/generate")
async def generate_text(request_data: Dict[str, Any]):
    """Generate text using specified LLM provider."""
    prompt = request_data.get("prompt", "")
    provider = request_data.get("provider", "gemini")
    model = request_data.get("model")

    manager = get_provider_manager()

    config = LLMConfig(
        provider=LLMProvider(provider),
        model=model or manager._get_default_model(LLMProvider(provider)),
    )

    result = await manager.generate(prompt, config=config)
    return JSONResponse(content={"text": result})


# MCP server info
@app.get("/api/mcp/info")
async def mcp_info():
    """Get MCP server information."""
    mcp_server = get_mcp_server()
    return JSONResponse(
        content={
            "server_name": mcp_server.agent_name,
            "tools_count": len(mcp_server.tools_registry),
            "resources_count": len(mcp_server.resources_registry),
            "tools": list(mcp_server.tools_registry.keys()),
            "resources": list(mcp_server.resources_registry.keys()),
        }
    )


if __name__ == "__main__":
    import uvicorn
    import fastapi

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
