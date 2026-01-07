"""
Collection Manager Tool - Programmatically create and manage agent collections

Integrates with:
- yaml-parser patterns from awesome-copilot
- collection.schema.json validation
- schema_crawler_tool for MCP integration
- ModMe GenUI agent toolsets
"""

import json
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from google.adk.tools import ToolContext


def create_collection(
    tool_context: ToolContext,
    collection_id: str,
    name: str,
    description: str,
    items: List[Dict[str, str]],
    tags: Optional[List[str]] = None,
    display: Optional[Dict[str, Any]] = None,
    output_path: Optional[str] = None
) -> Dict[str, str]:
    """
    Programmatically create a collection YAML file.
    
    Args:
        collection_id: Unique identifier (lowercase-hyphenated, max 50 chars)
        name: Display name for collection (max 100 chars)
        description: Description of collection purpose (max 500 chars)
        items: List of items with 'path', 'kind', optional 'usage'
        tags: Optional list of tags for discovery (max 10 tags)
        display: Optional display settings (ordering, show_badge, featured)
        output_path: Optional path to write collection file
    
    Returns:
        Dictionary with:
        - status: "success" or "error"
        - message: Success/error message
        - yaml_content: Generated YAML as string
        - file_path: Path where file was written (if output_path provided)
    
    Example:
        >>> create_collection(
        ...     tool_context,
        ...     collection_id="genui-workbench",
        ...     name="GenUI Workbench",
        ...     description="Generative UI patterns and components",
        ...     items=[
        ...         {"path": "agents/workbench.agent.md", "kind": "agent"}
        ...     ],
        ...     tags=["genui", "copilotkit"],
        ...     output_path="collections/genui-workbench.collection.yml"
        ... )
    """
    try:
        # Validate collection_id format (lowercase, numbers, hyphens only)
        if not re.match(r'^[a-z0-9-]+$', collection_id):
            return {
                "status": "error",
                "message": "collection_id must be lowercase letters, numbers, and hyphens only"
            }
        
        if len(collection_id) > 50:
            return {
                "status": "error",
                "message": "collection_id must be 50 characters or less"
            }
        
        # Validate name length
        if len(name) > 100:
            return {
                "status": "error",
                "message": "name must be 100 characters or less"
            }
        
        # Validate description length
        if len(description) > 500:
            return {
                "status": "error",
                "message": "description must be 500 characters or less"
            }
        
        # Validate items (min 1, max 50)
        if not items or len(items) == 0:
            return {
                "status": "error",
                "message": "Collection must have at least one item"
            }
        
        if len(items) > 50:
            return {
                "status": "error",
                "message": "Collection cannot have more than 50 items"
            }
        
        # Validate item structure
        valid_kinds = {'prompt', 'instruction', 'agent', 'skill'}
        for i, item in enumerate(items):
            if 'path' not in item or 'kind' not in item:
                return {
                    "status": "error",
                    "message": f"Item {i} missing required 'path' or 'kind' field"
                }
            
            if item['kind'] not in valid_kinds:
                return {
                    "status": "error",
                    "message": f"Item {i} has invalid kind '{item['kind']}'. Must be one of: {valid_kinds}"
                }
            
            # Validate path pattern
            path_pattern = r'^(prompts|instructions|agents|skills)/[^/]+\.(prompt|instructions|agent)\.md$'
            if not re.match(path_pattern, item['path']):
                return {
                    "status": "error",
                    "message": f"Item {i} path '{item['path']}' doesn't match required pattern: prompts|instructions|agents|skills/*.*.md"
                }
        
        # Validate tags (max 10, lowercase-hyphenated)
        if tags:
            if len(tags) > 10:
                return {
                    "status": "error",
                    "message": "Collections cannot have more than 10 tags"
                }
            
            for tag in tags:
                if not re.match(r'^[a-z0-9-]+$', tag):
                    return {
                        "status": "error",
                        "message": f"Tag '{tag}' must be lowercase letters, numbers, and hyphens only"
                    }
                
                if len(tag) > 30:
                    return {
                        "status": "error",
                        "message": f"Tag '{tag}' must be 30 characters or less"
                    }
        
        # Build collection object
        collection = {
            'id': collection_id,
            'name': name,
            'description': description,
            'items': items
        }
        
        if tags:
            collection['tags'] = tags
        
        if display:
            # Validate display settings
            if 'ordering' in display and display['ordering'] not in ['manual', 'alpha']:
                return {
                    "status": "error",
                    "message": "display.ordering must be 'manual' or 'alpha'"
                }
            collection['display'] = display
        
        # Convert to YAML
        import yaml
        yaml_content = yaml.dump(
            collection,
            default_flow_style=False,
            sort_keys=False,
            allow_unicode=True
        )
        
        # Write to file if output_path provided
        if output_path:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            output_file.write_text(yaml_content, encoding='utf-8')
            
            return {
                "status": "success",
                "message": f"Collection '{collection_id}' created successfully",
                "yaml_content": yaml_content,
                "file_path": str(output_file)
            }
        
        return {
            "status": "success",
            "message": f"Collection '{collection_id}' created successfully",
            "yaml_content": yaml_content
        }
    
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to create collection: {str(e)}"
        }


def scan_repository_for_collection_items(
    tool_context: ToolContext,
    repo_root: str,
    tag_filter: Optional[List[str]] = None,
    kind_filter: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Scan repository for agents, prompts, instructions and build collection items.
    
    Args:
        repo_root: Path to repository root
        tag_filter: Optional list of tags to filter by
        kind_filter: Optional list of kinds to include (agent, prompt, instruction, skill)
    
    Returns:
        Dictionary with:
        - status: "success" or "error"
        - items: List of collection items found
        - count: Number of items found
    
    Example:
        >>> scan_repository_for_collection_items(
        ...     tool_context,
        ...     repo_root="/workspaces/modme-ui-01",
        ...     tag_filter=["genui", "copilotkit"],
        ...     kind_filter=["agent", "instruction"]
        ... )
    """
    try:
        repo_path = Path(repo_root)
        if not repo_path.exists():
            return {
                "status": "error",
                "message": f"Repository path not found: {repo_root}"
            }
        
        items = []
        
        # Define directories to scan based on kind_filter
        scan_dirs = []
        if not kind_filter or 'instruction' in kind_filter:
            scan_dirs.append(('instructions', 'instruction', '*.instructions.md'))
        if not kind_filter or 'prompt' in kind_filter:
            scan_dirs.append(('prompts', 'prompt', '*.prompt.md'))
        if not kind_filter or 'agent' in kind_filter:
            scan_dirs.append(('agents', 'agent', '*.agent.md'))
        if not kind_filter or 'skill' in kind_filter:
            scan_dirs.append(('skills', 'skill', '*/SKILL.md'))
        
        # Scan each directory
        for dir_name, kind, pattern in scan_dirs:
            dir_path = repo_path / dir_name
            if not dir_path.exists():
                continue
            
            for file in dir_path.glob(pattern):
                # Parse frontmatter to check tags (simplified - assumes YAML frontmatter)
                try:
                    content = file.read_text(encoding='utf-8')
                    
                    # Extract frontmatter between --- markers
                    if content.startswith('---'):
                        parts = content.split('---', 2)
                        if len(parts) >= 3:
                            import yaml
                            frontmatter = yaml.safe_load(parts[1])
                            
                            # Check tag filter
                            if tag_filter:
                                file_tags = frontmatter.get('tags', [])
                                if not any(tag in file_tags for tag in tag_filter):
                                    continue
                            
                            # Build item
                            relative_path = file.relative_to(repo_path)
                            items.append({
                                'path': str(relative_path).replace('\\', '/'),
                                'kind': kind,
                                'usage': frontmatter.get('description', '')
                            })
                
                except Exception as e:
                    # Skip files that can't be parsed
                    continue
        
        return {
            "status": "success",
            "items": items,
            "count": len(items)
        }
    
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to scan repository: {str(e)}"
        }


def create_mcp_server_collection(
    tool_context: ToolContext,
    mcp_server_name: str,
    repo_root: str
) -> Dict[str, str]:
    """
    Create collection of all agents that use a specific MCP server.
    
    Args:
        mcp_server_name: Name of MCP server (e.g., "github", "filesystem")
        repo_root: Path to repository root
    
    Returns:
        Dictionary with:
        - status: "success" or "error"
        - message: Success/error message
        - yaml_content: Generated YAML
        - file_path: Path where collection was saved
    
    Example:
        >>> create_mcp_server_collection(
        ...     tool_context,
        ...     mcp_server_name="github",
        ...     repo_root="/workspaces/modme-ui-01"
        ... )
    """
    try:
        repo_path = Path(repo_root)
        agents_dir = repo_path / "agents"
        
        if not agents_dir.exists():
            return {
                "status": "error",
                "message": f"Agents directory not found: {agents_dir}"
            }
        
        items = []
        
        # Scan all agent files
        for file in agents_dir.glob("*.agent.md"):
            try:
                content = file.read_text(encoding='utf-8')
                
                # Extract frontmatter
                if content.startswith('---'):
                    parts = content.split('---', 2)
                    if len(parts) >= 3:
                        import yaml
                        frontmatter = yaml.safe_load(parts[1])
                        
                        # Check if agent uses this MCP server
                        mcp_servers = frontmatter.get('mcp-servers', {})
                        if mcp_server_name in mcp_servers:
                            items.append({
                                'path': f"agents/{file.name}",
                                'kind': 'agent',
                                'usage': frontmatter.get('description', '')
                            })
            
            except Exception:
                continue
        
        if not items:
            return {
                "status": "error",
                "message": f"No agents found using MCP server '{mcp_server_name}'"
            }
        
        # Create collection
        collection_id = f"{mcp_server_name}-agents"
        name = f"{mcp_server_name.title()} Agents"
        description = f"Agents that integrate with {mcp_server_name} MCP server"
        tags = [mcp_server_name, "mcp", "agents"]
        
        output_path = repo_path / "collections" / f"{collection_id}.collection.yml"
        
        return create_collection(
            tool_context,
            collection_id=collection_id,
            name=name,
            description=description,
            items=items,
            tags=tags,
            display={"ordering": "alpha"},
            output_path=str(output_path)
        )
    
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to create MCP server collection: {str(e)}"
        }


# Tool metadata for registration
TOOL_METADATA = {
    "create_collection": {
        "description": "Programmatically create a collection YAML file for organizing agents, prompts, and instructions",
        "parameters": {
            "collection_id": "str (lowercase-hyphenated, max 50 chars)",
            "name": "str (display name, max 100 chars)",
            "description": "str (purpose description, max 500 chars)",
            "items": "List[Dict] (path, kind, optional usage)",
            "tags": "Optional[List[str]] (max 10 tags)",
            "display": "Optional[Dict] (ordering, show_badge, featured)",
            "output_path": "Optional[str] (path to write .collection.yml)"
        }
    },
    "scan_repository_for_collection_items": {
        "description": "Scan repository for agents, prompts, instructions to build collection items",
        "parameters": {
            "repo_root": "str (repository root path)",
            "tag_filter": "Optional[List[str]] (filter by tags)",
            "kind_filter": "Optional[List[str]] (filter by kind: agent, prompt, instruction, skill)"
        }
    },
    "create_mcp_server_collection": {
        "description": "Create collection of all agents that use a specific MCP server",
        "parameters": {
            "mcp_server_name": "str (MCP server name)",
            "repo_root": "str (repository root path)"
        }
    }
}
