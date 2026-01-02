"""Generic Workbench Agent for Generative UI interaction."""

from __future__ import annotations

import json
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
    """,
    tools=[upsert_ui_element, remove_ui_element, clear_canvas],
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

# Health check endpoints
@app.get("/health")
async def health_check():
    """Basic liveness check for the agent."""
    return {
        "status": "healthy",
        "service": "GenUI Workbench Agent",
        "version": "1.0.0"
    }

@app.get("/ready")
async def readiness_check():
    """Readiness check - ensure all dependencies are loaded."""
    try:
        # Check if toolsets are loaded
        from toolset_manager import toolset_manager
        toolsets = toolset_manager.list_available_toolsets()
        
        return {
            "status": "ready",
            "dependencies": {
                "toolsets_loaded": len(toolsets) > 0,
                "toolset_count": len(toolsets),
                "toolsets": toolsets
            }
        }
    except Exception as e:
        return {
            "status": "not_ready",
            "error": str(e)
        }

if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
