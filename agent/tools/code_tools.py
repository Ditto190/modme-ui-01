"""Code editing tools powered by VT Code MCP."""

from typing import Dict, List
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp_vtcode import get_vtcode_client


async def edit_component(
    component_name: str,
    changes_description: str
) -> Dict[str, str]:
    """
    Edit a GenUI component file using VT Code's semantic editing.
    
    Args:
        component_name: Name of the component (e.g., "StatCard")
        changes_description: Natural language description of changes
    
    Returns:
        Result of the edit operation
    """
    vtcode = get_vtcode_client()
    
    path = f"src/components/registry/{component_name}.tsx"
    
    # VT Code will use its LLM to interpret the changes
    result = await vtcode.edit_file(
        path=path,
        edits=[{
            "type": "refactor",
            "instructions": changes_description
        }]
    )
    
    if result.success:
        return {
            "status": "success",
            "message": f"Edited {component_name}",
            "details": result.data
        }
    else:
        return {
            "status": "error",
            "message": f"Failed to edit {component_name}",
            "error": result.error
        }


async def analyze_component_props(component_name: str) -> Dict[str, str]:
    """
    Analyze a component's TypeScript props interface.
    
    Args:
        component_name: Name of the component
    
    Returns:
        Component props schema
    """
    vtcode = get_vtcode_client()
    
    # Search for the interface definition
    result = await vtcode.search_symbols(
        query=f"{component_name}Props",
        language="typescript"
    )
    
    if result.success:
        return {
            "status": "success",
            "component": component_name,
            "props": result.data
        }
    else:
        return {
            "status": "error",
            "error": result.error
        }


async def create_new_component(
    component_name: str,
    component_type: str,
    props_schema: Dict
) -> Dict[str, str]:
    """
    Create a new GenUI component file.
    
    Args:
        component_name: Name for the new component
        component_type: Type (e.g., "chart", "card", "table")
        props_schema: JSON schema for component props
    
    Returns:
        Result of component creation
    """
    vtcode = get_vtcode_client()
    
    path = f"src/components/registry/{component_name}.tsx"
    
    # Generate component template
    template = f'''
import {{ Card }} from "@/components/ui/card";

export interface {component_name}Props {{
  // Props will be added by VT Code
}}

export function {component_name}(props: {component_name}Props) {{
  return (
    <Card>
      <div>TODO: Implement {component_name}</div>
    </Card>
  );
}}
'''
    
    # Create file and refactor
    result = await vtcode.edit_file(
        path=path,
        edits=[{
            "type": "create",
            "content": template
        }, {
            "type": "refactor",
            "instructions": f"Add props based on schema: {props_schema}"
        }]
    )
    
    if result.success:
        # Update registry index
        await vtcode.edit_file(
            path="src/components/registry/index.ts",
            edits=[{
                "type": "insert",
                "content": f"export {{ {component_name} }} from './{component_name}';\n",
                "position": "end"
            }]
        )
        
        return {
            "status": "success",
            "component": component_name,
            "path": path
        }
    else:
        return {
            "status": "error",
            "error": result.error
        }


async def run_build_check() -> Dict[str, str]:
    """
    Run Next.js build to verify no TypeScript errors.
    
    Returns:
        Build result
    """
    vtcode = get_vtcode_client()
    
    # Create PTY session for build
    session_result = await vtcode.create_pty_session(
        command="npm",
        args=["run", "build"]
    )
    
    if not session_result.success:
        return {
            "status": "error",
            "error": session_result.error
        }
    
    session_id = session_result.data.get("session_id")
    
    # Read build output
    output_result = await vtcode.read_pty_output(session_id)
    
    if output_result.success:
        return {
            "status": "success",
            "output": output_result.data.get("output", "")
        }
    else:
        return {
            "status": "error",
            "error": output_result.error
        }
