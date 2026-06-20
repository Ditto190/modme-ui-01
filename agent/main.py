"""Generic Workbench Agent for Generative UI interaction."""

from __future__ import annotations

import atexit
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from dotenv import load_dotenv
from fastapi import FastAPI, status
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

load_dotenv()

DEFAULT_ALLOWED_TYPES: Set[str] = {"StatCard", "DataTable", "ChartCard"}
MANIFEST_PATH = Path(__file__).resolve().parent.parent / "src/lib/element-manifest.json"


def _load_element_manifest() -> Dict[str, Any]:
    """Load shared UI manifest used by both React and the Python agent."""
    try:
        with MANIFEST_PATH.open("r", encoding="utf-8") as manifest_file:
            manifest = json.load(manifest_file)
            if isinstance(manifest, dict):
                return manifest
    except Exception:
        pass
    return {}


def _load_allowed_types() -> Set[str]:
    manifest = _load_element_manifest()
    elements = manifest.get("elements", [])
    manifest_type_values: List[str] = []
    for entry in elements:
        if not isinstance(entry, dict):
            continue
        entry_id = entry.get("id")
        if isinstance(entry_id, str):
            manifest_type_values.append(entry_id)
    manifest_types = set(manifest_type_values)
    return manifest_types or DEFAULT_ALLOWED_TYPES


def _load_canvas_presets() -> Dict[str, List[Dict[str, Any]]]:
    manifest = _load_element_manifest()
    presets = manifest.get("presets", [])
    preset_map: Dict[str, List[Dict[str, Any]]] = {}

    for preset in presets:
        if not isinstance(preset, dict):
            continue
        preset_id = preset.get("id")
        preset_elements = preset.get("elements")
        if not isinstance(preset_id, str) or not isinstance(preset_elements, list):
            continue
        valid_elements = [
            el
            for el in preset_elements
            if isinstance(el, dict)
            and isinstance(el.get("id"), str)
            and isinstance(el.get("type"), str)
            and isinstance(el.get("props"), dict)
        ]
        if valid_elements:
            preset_map[preset_id] = valid_elements

    return preset_map


ALLOWED_TYPES = _load_allowed_types()
CANVAS_PRESETS = _load_canvas_presets()
DEFAULT_CANVAS_PRESET = os.getenv("DEFAULT_CANVAS_PRESET")


def _clone_elements(elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Deep-copy element payloads to avoid mutating shared preset templates."""
    return json.loads(json.dumps(elements))


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
            "message": f"Unknown type '{type}'. Allowed types: {', '.join(sorted(ALLOWED_TYPES))}",
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


def apply_canvas_preset(
    tool_context: ToolContext, preset_id: str, replace_existing: bool = True
) -> Dict[str, Any]:
    """Apply a named starter preset to the canvas."""
    if not preset_id or not isinstance(preset_id, str):
        return {
            "status": "error",
            "message": "Invalid preset_id: must be a non-empty string",
        }

    preset_elements = CANVAS_PRESETS.get(preset_id)
    if not preset_elements:
        available_presets = ", ".join(sorted(CANVAS_PRESETS.keys())) or "none"
        return {
            "status": "error",
            "message": f"Unknown preset '{preset_id}'. Available: {available_presets}",
        }

    filtered_elements = [
        element for element in preset_elements if element.get("type") in ALLOWED_TYPES
    ]
    if not filtered_elements:
        return {
            "status": "error",
            "message": f"Preset '{preset_id}' has no elements with allowed types.",
        }

    cloned_elements = _clone_elements(filtered_elements)
    if replace_existing:
        next_elements = cloned_elements
    else:
        current_elements = tool_context.state.get("elements", [])
        if not isinstance(current_elements, list):
            current_elements = []
        next_elements = current_elements + cloned_elements

    tool_context.state["elements"] = next_elements

    return {
        "status": "success",
        "message": f"Applied preset '{preset_id}' with {len(filtered_elements)} elements.",
        "preset_id": preset_id,
        "element_count": len(next_elements),
    }


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
    preset_elements = (
        CANVAS_PRESETS.get(DEFAULT_CANVAS_PRESET, [])
        if DEFAULT_CANVAS_PRESET
        else []
    )
    if (
        DEFAULT_CANVAS_PRESET
        and not callback_context.state.get("elements")
        and len(preset_elements) > 0
    ):
        callback_context.state["elements"] = _clone_elements(preset_elements)
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

    available_types = ", ".join(sorted(ALLOWED_TYPES))
    available_presets = ", ".join(sorted(CANVAS_PRESETS.keys())) or "none"

    prefix = f"""You are the Workbench Assistant. You help the user build dashboards and tools.
Current Canvas Elements:
{elements_json}

When asked to create or update UI, use 'upsert_ui_element'.
Available Types: {available_types}.
Available Presets: {available_presets}.

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
    4. Apply presets with apply_canvas_preset for starter project management dashboards.
    
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
        apply_canvas_preset,
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

app = FastAPI(title="GenUI Workbench Agent")

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


# Health check endpoints
@app.get("/health")
async def health_check():
    """Liveness probe - basic service availability."""
    return JSONResponse(
        content={
            "status": "healthy",
            "service": "GenUI Workbench Agent",
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat(),
            "model": "gemini-2.5-flash",
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


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
