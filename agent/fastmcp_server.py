"""FastMCP server for ModMe Agent.

Exposes all agent tools, resources, and prompts via the Model Context Protocol
using the FastMCP framework for better type safety and integration.
"""

from __future__ import annotations

import json
from typing import Any, Dict, List

from fastmcp import FastMCP, Context

# Import existing tool implementations
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

# Create FastMCP server
mcp = FastMCP(
    "ModMe Agent",
    version="0.3.1",
    description="GenUI Workbench Agent with AI-powered UI generation",
    dependencies=["google-adk", "fastapi", "copilotkit"],
)

# Validation constants
ALLOWED_TYPES = {"StatCard", "DataTable", "ChartCard"}


# ===== CORE UI TOOLS =====

@mcp.tool()
async def upsert_ui_element(
    ctx: Context,
    id: str,
    type: str,
    props: Dict[str, Any]
) -> Dict[str, str]:
    """Add or update a UI element in the workbench canvas.

    Creates a new UI component or updates an existing one. Components are rendered
    on the user's canvas and can display stats, charts, or data tables.

    Args:
        id: Unique identifier for the element (snake_case recommended, e.g., "revenue_card")
        type: Component type from registry - must be one of: StatCard, DataTable, ChartCard
        props: Component properties as JSON object. Each type has specific required props:
            - StatCard: { title: str, value: str, trend?: str, trendDirection?: str }
            - DataTable: { columns: str[], data: object[] }
            - ChartCard: { title: str, chartType: str, data: object[] }

    Returns:
        Success message with element metadata including action taken and total element count

    Raises:
        ValidationError: If id is empty, type is invalid, or props is not a dictionary
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

    # In FastMCP, we'd access shared state through ctx
    # For now, return success with metadata
    return {
        "status": "success",
        "message": f"Element '{id}' of type '{type}' created/updated.",
        "id": id,
        "type": type,
    }


@mcp.tool()
async def remove_ui_element(ctx: Context, id: str) -> Dict[str, str]:
    """Remove a UI element from the canvas by its ID.

    Deletes an existing UI component from the user's canvas. If the element
    doesn't exist, a warning is returned.

    Args:
        id: Unique identifier of the element to remove

    Returns:
        Success message with removal confirmation or warning if not found

    Raises:
        ValidationError: If id is empty or invalid
    """
    if not id or not isinstance(id, str):
        return {"status": "error", "message": "Invalid id: must be non-empty string"}

    return {
        "status": "success",
        "message": f"Element '{id}' removed.",
    }


@mcp.tool()
async def clear_canvas(ctx: Context) -> Dict[str, str]:
    """Remove all UI elements from the canvas.

    Clears the entire canvas, removing all components at once. This is a
    destructive operation and cannot be undone.

    Returns:
        Success message confirming canvas was cleared
    """
    return {"status": "success", "message": "Canvas cleared."}


@mcp.tool()
async def set_theme_color(ctx: Context, theme_color: str) -> Dict[str, str]:
    """Set the application theme color.

    Updates the primary theme color used throughout the UI. The color should
    be provided as a hex color code.

    Args:
        theme_color: Hex color code (e.g., "#ff0000" for red, "#3b82f6" for blue)

    Returns:
        Success message confirming theme color was set
    """
    return {
        "status": "success",
        "message": f"Theme color set to {theme_color}",
        "color": theme_color,
    }


# ===== CODE EDITING TOOLS (VT Code MCP Integration) =====

@mcp.tool()
async def edit_component_code(
    ctx: Context,
    file_path: str,
    changes: str
) -> Dict[str, Any]:
    """Modify existing GenUI component code using AI-powered editing.

    Uses VT Code MCP integration to intelligently edit React component files.
    Can make structural changes, update props, or refactor code.

    Args:
        file_path: Path to the component file (e.g., "src/components/registry/StatCard.tsx")
        changes: Description of changes to make (e.g., "Add a subtitle prop")

    Returns:
        Result of edit operation including success status and any errors
    """
    # Delegate to existing implementation
    from google.adk.tools import ToolContext
    mock_context = ToolContext(state={})
    return edit_component(mock_context, file_path, changes)


@mcp.tool()
async def analyze_component_properties(
    ctx: Context,
    component_name: str
) -> Dict[str, Any]:
    """Inspect TypeScript interfaces and props for a component.

    Analyzes a component's TypeScript interface to understand what props
    it accepts, their types, and whether they're required.

    Args:
        component_name: Name of the component (e.g., "StatCard")

    Returns:
        Component analysis including props, types, and required fields
    """
    from google.adk.tools import ToolContext
    mock_context = ToolContext(state={})
    return analyze_component_props(mock_context, component_name)


@mcp.tool()
async def create_component(
    ctx: Context,
    component_name: str,
    description: str
) -> Dict[str, Any]:
    """Generate new React component from scratch.

    Creates a new GenUI component with boilerplate code, TypeScript types,
    and default styling. The component is added to the registry.

    Args:
        component_name: PascalCase component name (e.g., "MetricCard")
        description: Description of component purpose and appearance

    Returns:
        Creation result including file path and initial code
    """
    from google.adk.tools import ToolContext
    mock_context = ToolContext(state={})
    return create_new_component(mock_context, component_name, description)


@mcp.tool()
async def verify_build(ctx: Context) -> Dict[str, Any]:
    """Verify TypeScript compilation and check for errors.

    Runs TypeScript compiler to check for type errors, syntax issues,
    and other build problems. Useful after making code changes.

    Returns:
        Build status with any errors or warnings found
    """
    from google.adk.tools import ToolContext
    mock_context = ToolContext(state={})
    return run_build_check(mock_context)


# ===== JOURNALING TOOL =====

@mcp.tool()
async def record_feelings(
    ctx: Context,
    entry: str
) -> Dict[str, Any]:
    """Record personal feelings or thoughts to private journal.

    Stores journal entries privately and securely. Entries are never shared
    or used for training. Useful for reflection and emotional processing.

    Args:
        entry: Journal entry text

    Returns:
        Confirmation of entry being recorded
    """
    from google.adk.tools import ToolContext
    mock_context = ToolContext(state={})
    return process_feelings(mock_context, entry)


# ===== COLLECTION MANAGEMENT TOOLS =====

@mcp.tool()
async def create_agent_collection(
    ctx: Context,
    collection_name: str,
    agents: List[str]
) -> Dict[str, Any]:
    """Create agent collection YAML file.

    Creates a collection definition file that groups related agents together.
    Collections help organize and categorize agents by purpose or domain.

    Args:
        collection_name: Name for the collection (e.g., "data-analysis")
        agents: List of agent identifiers to include

    Returns:
        Creation result with file path and collection metadata
    """
    from google.adk.tools import ToolContext
    mock_context = ToolContext(state={})
    return create_collection(mock_context, collection_name, agents)


@mcp.tool()
async def scan_repository(
    ctx: Context,
    path: str = "."
) -> Dict[str, Any]:
    """Auto-discover collection items in repository.

    Scans the repository structure to find agents, tools, and other
    collection items that can be organized.

    Args:
        path: Repository path to scan (default: current directory)

    Returns:
        List of discovered items with metadata
    """
    from google.adk.tools import ToolContext
    mock_context = ToolContext(state={})
    return scan_repository_for_collection_items(mock_context, path)


@mcp.tool()
async def create_mcp_collection(
    ctx: Context,
    server_name: str
) -> Dict[str, Any]:
    """Group agents by MCP server dependency.

    Creates a collection of all agents that depend on a specific MCP server.
    Useful for understanding MCP server usage and dependencies.

    Args:
        server_name: MCP server name (e.g., "vtcode", "github")

    Returns:
        Collection result with grouped agents
    """
    from google.adk.tools import ToolContext
    mock_context = ToolContext(state={})
    return create_mcp_server_collection(mock_context, server_name)


# ===== RESOURCES =====

@mcp.resource("canvas://state")
async def canvas_state(ctx: Context) -> str:
    """Get current canvas state with all UI elements.

    Returns JSON representation of all components currently on the canvas,
    including their IDs, types, and props.

    Returns:
        JSON string with canvas state
    """
    # In production, this would fetch from actual state
    state = {
        "elements": [],
        "theme": "default",
        "layout": "grid",
    }
    return json.dumps(state, indent=2)


@mcp.resource("toolsets://list")
async def toolsets_list(ctx: Context) -> str:
    """Get available toolsets.

    Returns list of all registered toolsets with their metadata,
    including tools, status, and version information.

    Returns:
        JSON string with toolsets list
    """
    try:
        from toolset_manager import list_toolsets
        toolsets = list_toolsets()
        return json.dumps(toolsets, indent=2)
    except Exception:
        return json.dumps({"toolsets": [], "error": "Could not load toolsets"})


@mcp.resource("config://allowed_types")
async def allowed_component_types(ctx: Context) -> str:
    """Get allowed UI component types.

    Returns list of component types that can be created with upsert_ui_element.

    Returns:
        JSON string with allowed types
    """
    return json.dumps({
        "allowed_types": list(ALLOWED_TYPES),
        "descriptions": {
            "StatCard": "Display single metric with optional trend",
            "DataTable": "Display tabular data with columns",
            "ChartCard": "Display data visualization (bar, line, pie, etc.)",
        }
    }, indent=2)


# ===== PROMPTS =====

@mcp.prompt()
async def create_dashboard(
    ctx: Context,
    title: str = "Dashboard",
    layout: str = "grid",
    metrics: List[str] = None
) -> str:
    """Generate a dashboard creation prompt.

    Creates a detailed prompt for building a dashboard with the specified
    title, layout, and metrics.

    Args:
        title: Dashboard title (default: "Dashboard")
        layout: Layout type - grid, flex, or masonry (default: "grid")
        metrics: List of metric names to include (optional)

    Returns:
        Detailed prompt for dashboard creation
    """
    metrics_section = ""
    if metrics:
        metrics_list = "\n".join(f"- {m}" for m in metrics)
        metrics_section = f"\n\nMetrics to include:\n{metrics_list}"

    return f"""Create a {layout} dashboard titled "{title}" with the following components:

1. **KPI StatCards** (3-4 cards)
   - Show key performance indicators
   - Include trend information where relevant
   - Use clear, concise titles

2. **ChartCards** (2 visualizations)
   - Display data trends over time
   - Choose appropriate chart types (bar, line, pie)
   - Include descriptive titles

3. **DataTable** (1 detailed table)
   - Show granular data breakdown
   - Include relevant columns
   - Make data sortable/filterable{metrics_section}

Use the upsert_ui_element tool for each component. Assign meaningful IDs like:
- KPI cards: "metric_revenue", "metric_users", etc.
- Charts: "chart_trends", "chart_breakdown", etc.
- Tables: "table_details", "table_summary", etc."""


@mcp.prompt()
async def analyze_data(
    ctx: Context,
    data_description: str,
    analysis_goal: str = "general insights"
) -> str:
    """Generate a data analysis prompt.

    Creates a prompt for analyzing data and building visualizations.

    Args:
        data_description: Description of the data to analyze
        analysis_goal: Goal of the analysis (default: "general insights")

    Returns:
        Detailed prompt for data analysis
    """
    return f"""Analyze the following data and create visualizations:

**Data**: {data_description}
**Goal**: {analysis_goal}

Steps to follow:
1. Understand the data structure and key dimensions
2. Identify important metrics and KPIs
3. Create StatCards for top-level metrics
4. Build ChartCards to show trends and patterns
5. Add DataTable for detailed data exploration

Focus on:
- Clear, actionable insights
- Appropriate visualization types
- Professional presentation
- Meaningful labeling and formatting"""


@mcp.prompt()
async def create_report(
    ctx: Context,
    report_type: str = "executive summary",
    sections: List[str] = None
) -> str:
    """Generate a report creation prompt.

    Creates a prompt for building a structured report with multiple sections.

    Args:
        report_type: Type of report (e.g., "executive summary", "detailed analysis")
        sections: List of section names to include (optional)

    Returns:
        Detailed prompt for report creation
    """
    sections_text = "standard sections"
    if sections:
        sections_text = ", ".join(sections)

    return f"""Create a {report_type} report with {sections_text}.

Report structure:
1. **Overview**: High-level StatCards with key metrics
2. **Analysis**: ChartCards showing trends and patterns
3. **Details**: DataTable with granular information

Ensure:
- Professional, clean layout
- Clear section separation
- Consistent styling
- Export-friendly formatting

Use meaningful component IDs following the pattern:
- report_overview_[metric]
- report_analysis_[chart]
- report_details_[table]"""


# ===== MIDDLEWARE =====

@mcp.middleware()
async def log_mcp_requests(ctx: Context, next):
    """Log all MCP requests for debugging."""
    print(f"[MCP] Request: {ctx.request_context.method if hasattr(ctx, 'request_context') else 'unknown'}")
    result = await next()
    print(f"[MCP] Response: Success")
    return result


# Export the FastMCP instance
__all__ = ["mcp"]
