"""
Example Integration: Using Toolset Manager in Agent

This file shows how to integrate the toolset management system
into your agent/main.py file.
"""

from google import genai
from google.genai import types
from google.genai.types import Tool, ToolContext
from typing import Dict, Any
import logging

# Import toolset manager
from toolset_manager import (
    initialize_toolsets,
    get_toolset_manager,
    resolve_toolset,
    get_toolset,
    list_toolsets
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================================
# STEP 1: Initialize Toolsets on Agent Startup
# ============================================================================

def setup_agent():
    """Initialize agent with toolset support."""
    
    # Initialize toolset system
    logger.info("Initializing toolset management system...")
    initialize_toolsets()
    
    # Get manager instance
    manager = get_toolset_manager()
    
    # Log available toolsets
    logger.info(f"Loaded {len(manager.toolsets)} toolsets:")
    for toolset in manager.list_toolsets():
        logger.info(f"  - {toolset['id']}: {toolset['name']} ({len(toolset['tools'])} tools)")
    
    # Log any deprecation aliases
    if manager.aliases:
        logger.info(f"Active deprecation aliases: {len(manager.aliases)}")
        for old_id, new_id in manager.aliases.items():
            metadata = manager.get_deprecation_info(old_id)
            removal_date = metadata.get('removal_date', 'unknown') if metadata else 'unknown'
            logger.info(f"  - {old_id} -> {new_id} (removal: {removal_date})")


# ============================================================================
# STEP 2: Define Tools (Your Existing Tool Functions)
# ============================================================================

def upsert_ui_element(tool_context: ToolContext, id: str, type: str, props: Dict[str, Any]):
    """
    Add or update a UI element on the canvas.
    
    Args:
        tool_context: Tool execution context
        id: Unique element identifier
        type: Element type (StatCard, DataTable, ChartCard)
        props: Element properties (varies by type)
    """
    elements = tool_context.state.get("elements", [])
    
    # Remove existing element with same ID
    elements = [el for el in elements if el.get("id") != id]
    
    # Add new element
    elements.append({"id": id, "type": type, "props": props})
    tool_context.state["elements"] = elements
    
    return f"Element {id} upserted successfully"


def remove_ui_element(tool_context: ToolContext, id: str):
    """
    Remove a UI element from the canvas.
    
    Args:
        tool_context: Tool execution context
        id: Element identifier to remove
    """
    elements = tool_context.state.get("elements", [])
    elements = [el for el in elements if el.get("id") != id]
    tool_context.state["elements"] = elements
    
    return f"Element {id} removed"


def clear_canvas(tool_context: ToolContext):
    """Clear all UI elements from the canvas."""
    tool_context.state["elements"] = []
    return "Canvas cleared"


# ============================================================================
# STEP 3: Register Tools with Toolset Metadata
# ============================================================================

def register_tools() -> Dict[str, Any]:
    """
    Register all tools with their toolset associations.
    
    Returns:
        Dictionary mapping toolset IDs to tool lists
    """
    manager = get_toolset_manager()
    
    # Create tool registry
    tool_registry = {}
    
    for toolset in manager.list_toolsets():
        toolset_id = toolset['id']
        tool_names = toolset['tools']
        
        # Map tool names to actual functions
        # (In practice, you'd use a more sophisticated mapping)
        tool_functions = []
        for tool_name in tool_names:
            if tool_name in globals():
                tool_functions.append(globals()[tool_name])
        
        tool_registry[toolset_id] = {
            'metadata': toolset,
            'functions': tool_functions
        }
        
        logger.info(f"Registered toolset '{toolset_id}' with {len(tool_functions)} tools")
    
    return tool_registry


# ============================================================================
# STEP 4: Handle Toolset Resolution in System Instructions
# ============================================================================

def before_model_modifier(tool_context: ToolContext):
    """
    Modify system instructions before sending to model.
    Includes current canvas state and available toolsets.
    """
    manager = get_toolset_manager()
    
    # Get current state
    elements = tool_context.state.get("elements", [])
    
    # Build toolset information
    toolset_info = []
    for toolset in manager.list_toolsets():
        toolset_info.append(
            f"- **{toolset['name']}** ({toolset['id']}): {toolset['description']}\n"
            f"  Tools: {', '.join(toolset['tools'])}"
        )
    
    # Construct system instruction
    system_instruction = f"""
You are an agent that can create and modify UI elements on a canvas.

Current Canvas State:
- Elements: {len(elements)} elements
- Types: {', '.join(set(el.get('type', 'unknown') for el in elements))}

Available Toolsets:
{chr(10).join(toolset_info)}

Use the appropriate tools to help the user build their interface.
"""
    
    # Add to context
    tool_context.system_instruction = system_instruction


# ============================================================================
# STEP 5: Example Usage with Toolset Resolution
# ============================================================================

def example_toolset_usage():
    """Example of using toolset resolution."""
    
    # Initialize
    initialize_toolsets()
    manager = get_toolset_manager()
    
    # Example 1: Resolve toolset (handles deprecation)
    toolset_id = "ui_elements"
    resolved_id = manager.resolve_toolset(toolset_id)
    print(f"Resolved '{toolset_id}' to '{resolved_id}'")
    
    # Example 2: Get toolset definition
    toolset = manager.get_toolset("ui_elements")
    if toolset:
        print(f"\nToolset: {toolset['name']}")
        print(f"Description: {toolset['description']}")
        print(f"Tools: {', '.join(toolset['tools'])}")
    
    # Example 3: List all available toolsets
    print("\n=== All Toolsets ===")
    for ts in manager.list_toolsets():
        status = "✓" if ts.get('default') else " "
        deprecated = "⚠️ DEPRECATED" if ts.get('metadata', {}).get('deprecated') else ""
        print(f"[{status}] {ts['id']}: {ts['name']} {deprecated}")
    
    # Example 4: Check if toolset is deprecated
    if manager.is_deprecated("old_feature"):
        info = manager.get_deprecation_info("old_feature")
        print(f"\n⚠️  'old_feature' is deprecated!")
        print(f"Replacement: {info.get('replacement')}")
        print(f"Removal date: {info.get('removal_date')}")


# ============================================================================
# STEP 6: Full Agent Configuration
# ============================================================================

def create_agent_with_toolsets():
    """Create agent with toolset support."""
    
    # Initialize toolsets
    setup_agent()
    
    # Register tools
    tool_registry = register_tools()
    
    # Create client
    client = genai.Client(
        vertexai=True,
        project="your-project",
        location="us-central1"
    )
    
    # Configure agent with all tools
    all_tools = []
    for toolset_id, toolset_data in tool_registry.items():
        all_tools.extend(toolset_data['functions'])
    
    # Create agent configuration
    agent_config = types.GenerateContentConfig(
        system_instruction=None,  # Set in before_model_modifier
        tools=all_tools,
        temperature=0.7,
    )
    
    logger.info(f"Agent configured with {len(all_tools)} tools from {len(tool_registry)} toolsets")
    
    return client, agent_config


# ============================================================================
# STEP 7: Runtime Example with Deprecation Warning
# ============================================================================

def example_with_deprecated_toolset():
    """
    Example showing what happens when using a deprecated toolset name.
    
    This would log a warning to stderr but still work during grace period.
    """
    manager = get_toolset_manager()
    
    # Simulate using a deprecated name
    # (In reality, this would come from user config or API call)
    deprecated_name = "old_ui_elements"  # Example deprecated name
    
    # Resolution automatically handles deprecation
    canonical_name = manager.resolve_toolset(deprecated_name)
    
    # Warning is logged to stderr automatically:
    # ⚠️  Toolset 'old_ui_elements' is deprecated. Use 'ui_elements' instead.
    #     Reason: Consolidated UI toolsets
    #     Removal planned for: 2026-07-01
    #     See migration guide: docs/migration/old_ui_elements_to_ui_elements.md
    
    # Get the toolset (using canonical name)
    toolset = manager.get_toolset(canonical_name)
    
    return toolset


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    # Example 1: Basic initialization
    print("=== Example 1: Initialize Toolsets ===")
    initialize_toolsets()
    
    # Example 2: Usage examples
    print("\n=== Example 2: Toolset Operations ===")
    example_toolset_usage()
    
    # Example 3: Deprecated toolset handling
    print("\n=== Example 3: Deprecated Toolset ===")
    # Uncomment if you have deprecated toolsets:
    # example_with_deprecated_toolset()
    
    # Example 4: Full agent creation
    print("\n=== Example 4: Create Agent ===")
    # client, config = create_agent_with_toolsets()
    # print("Agent ready!")
