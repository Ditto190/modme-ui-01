"""Generic Workbench Agent for Generative UI interaction."""

from __future__ import annotations

import json
import os
import atexit
from typing import Dict, Optional, Any

from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from dotenv import load_dotenv
from fastapi import FastAPI
from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest
from google.adk.models.llm_response import LlmResponse
from google.adk.tools import ToolContext
from google.genai import types
from pydantic import BaseModel, Field

# Import VT Code integration
from tools.code_tools import (
    edit_component,
    analyze_component_props,
    create_new_component,
    run_build_check,
)
from mcp_vtcode import get_vtcode_client

load_dotenv()

def upsert_ui_element(tool_context: ToolContext, id: str, type: str, props: Dict[str, Any]) -> Dict[str, str]:
    """
    Add or update a UI element in the workbench canvas.
    
    Args:
        "id": {"type": "string", "description": "Unique identifier for the element"},
        "type": {"type": "string", "description": "Type of component (e.g. StatCard, DataTable, ChartCard)"},
        "props": {"type": "object", "description": "The properties/data for the component"}
    """
    elements = tool_context.state.get("elements", [])
    new_element = {"id": id, "type": type, "props": props}
    
    # Check if element exists
    found = False
    for i, el in enumerate(elements):
        if el.get("id") == id:
            elements[i] = new_element
            found = True
            break
    
    if not found:
        elements.append(new_element)
    
    tool_context.state["elements"] = elements
    return {"status": "success", "message": f"Element '{id}' of type '{type}' updated."}

def remove_ui_element(tool_context: ToolContext, id: str) -> Dict[str, str]:
    """Remove a UI element from the canvas by its ID."""
    elements = tool_context.state.get("elements", [])
    tool_context.state["elements"] = [el for el in elements if el.get("id") != id]
    return {"status": "success", "message": f"Element '{id}' removed."}

def clear_canvas(tool_context: ToolContext) -> Dict[str, str]:
    """Remove all elements from the canvas."""
    tool_context.state["elements"] = []
    return {"status": "success", "message": "Canvas cleared."}

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
    
    original_instruction = llm_request.config.system_instruction or types.Content(role="system", parts=[])
    
    if not isinstance(original_instruction, types.Content):
        original_instruction = types.Content(role="system", parts=[types.Part(text=str(original_instruction))])
    
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
    original_instruction.parts[0].text = prefix + (original_instruction.parts[0].text or "")
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
    """,
    tools=[
        upsert_ui_element, 
        remove_ui_element, 
        clear_canvas,
        # VT Code integration tools
        edit_component,
        analyze_component_props,
        create_new_component,
        run_build_check,
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

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
