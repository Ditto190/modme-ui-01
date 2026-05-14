#!/usr/bin/env python3
"""
Generate OpenAPI Specification for Awesome Copilot MCP Tools

This script:
1. Scans awesome-copilot collections and MCP tools
2. Generates OpenAPI 3.0 spec with schemas for all tools
3. Outputs spec that can be consumed by AI Tool Maker (aitm)

Usage:
    python scripts/generate_awesome_copilot_openapi.py

    # Then use AI Tool Maker:
    npx aitm ./agent/tools/generated ./openapi-specs/awesome-copilot.json
"""

import json
from pathlib import Path
from typing import Any, Dict


def generate_collection_schema() -> Dict[str, Any]:
    """Generate JSON Schema for collection metadata"""
    return {
        "type": "object",
        "required": ["id", "name", "description"],
        "properties": {
            "id": {"type": "string", "description": "Unique collection identifier"},
            "name": {"type": "string", "description": "Human-readable collection name"},
            "description": {"type": "string", "description": "Collection purpose and contents"},
            "tags": {"type": "array", "items": {"type": "string"}},
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "type": {"type": "string", "enum": ["agent", "prompt", "instruction", "skill"]},
                        "path": {"type": "string"},
                        "description": {"type": "string"}
                    }
                }
            }
        }
    }


def generate_toolset_schema() -> Dict[str, Any]:
    """Generate JSON Schema for GitHub toolset metadata"""
    return {
        "type": "object",
        "required": ["name", "tools"],
        "properties": {
            "name": {"type": "string"},
            "description": {"type": "string"},
            "tools": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                        "inputSchema": {"type": "object"}
                    }
                }
            }
        }
    }


def generate_openapi_spec() -> Dict[str, Any]:
    """Generate complete OpenAPI 3.0 specification for awesome-copilot MCP tools"""

    spec = {
        "openapi": "3.0.3",
        "info": {
            "title": "Awesome Copilot MCP API",
            "version": "1.0.0",
            "description": "Auto-generated OpenAPI spec for awesome-copilot collections and GitHub MCP toolsets",
            "contact": {
                "name": "ModMe GenUI Workbench",
                "url": "https://github.com/github/awesome-copilot"
            }
        },
        "servers": [
            {
                "url": "http://localhost:8000",
                "description": "Local MCP server"
            }
        ],
        "paths": {},
        "components": {
            "schemas": {
                "Collection": generate_collection_schema(),
                "Toolset": generate_toolset_schema(),
                "ErrorResponse": {
                    "type": "object",
                    "properties": {
                        "error": {"type": "string"},
                        "message": {"type": "string"}
                    }
                }
            }
        }
    }

    # Define awesome-copilot MCP endpoints based on your existing tools
    spec["paths"] = {
        "/mcp/awesome-copilot/collections": {
            "get": {
                "operationId": "listAwesomeCopilotCollections",
                "summary": "List all awesome-copilot collections",
                "description": "Enumerate available collections from the awesome-copilot repository",
                "tags": ["awesome-copilot"],
                "responses": {
                    "200": {
                        "description": "List of collections",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "collections": {
                                            "type": "array",
                                            "items": {"$ref": "#/components/schemas/Collection"}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "500": {
                        "description": "Server error",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        }
                    }
                }
            }
        },
        "/mcp/awesome-copilot/collections/{collection_name}": {
            "get": {
                "operationId": "getCollectionTools",
                "summary": "Get tools in a specific collection",
                "description": "Retrieve detailed information about agents, prompts, and instructions in a collection",
                "tags": ["awesome-copilot"],
                "parameters": [
                    {
                        "name": "collection_name",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "string"},
                        "description": "Collection identifier (e.g., 'azure-cloud-development')"
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Collection details with tools",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/Collection"}
                            }
                        }
                    },
                    "404": {
                        "description": "Collection not found",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
                            }
                        }
                    }
                }
            }
        },
        "/mcp/github/toolsets": {
            "get": {
                "operationId": "listAvailableToolsets",
                "summary": "List available GitHub MCP toolsets",
                "description": "Show which toolsets are registered and their enabled status",
                "tags": ["github-mcp"],
                "responses": {
                    "200": {
                        "description": "List of toolsets",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "toolsets": {
                                            "type": "array",
                                            "items": {
                                                "type": "object",
                                                "properties": {
                                                    "name": {"type": "string"},
                                                    "enabled": {"type": "boolean"},
                                                    "tool_count": {"type": "integer"}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/mcp/github/toolsets/{toolset_name}/tools": {
            "get": {
                "operationId": "getToolsetTools",
                "summary": "Get tools in a specific GitHub toolset",
                "description": "Inspect toolset's available tools and their schemas",
                "tags": ["github-mcp"],
                "parameters": [
                    {
                        "name": "toolset_name",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "string"},
                        "description": "Toolset identifier"
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Toolset details",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/Toolset"}
                            }
                        }
                    }
                }
            }
        },
        "/mcp/github/toolsets/{toolset_name}/enable": {
            "post": {
                "operationId": "enableToolset",
                "summary": "Enable a GitHub MCP toolset",
                "description": "Activate a toolset to make its tools available",
                "tags": ["github-mcp"],
                "parameters": [
                    {
                        "name": "toolset_name",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "string"}
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Toolset enabled successfully",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "status": {"type": "string", "enum": ["success"]},
                                        "message": {"type": "string"},
                                        "toolset": {"type": "string"}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/mcp/collections/scan": {
            "post": {
                "operationId": "scanRepositoryForCollections",
                "summary": "Scan repository for collection items",
                "description": "Auto-discover agents, prompts, instructions by tags",
                "tags": ["collection-manager"],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["repo_root"],
                                "properties": {
                                    "repo_root": {"type": "string"},
                                    "tag_filter": {"type": "array", "items": {"type": "string"}},
                                    "kind_filter": {
                                        "type": "array",
                                        "items": {"type": "string", "enum": ["agent", "prompt", "instruction", "skill"]}
                                    }
                                }
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Scan results",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "status": {"type": "string"},
                                        "items": {"type": "array", "items": {"type": "object"}},
                                        "count": {"type": "integer"}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/mcp/collections/create": {
            "post": {
                "operationId": "createCollection",
                "summary": "Create a new collection",
                "description": "Programmatically generate collection YAML files",
                "tags": ["collection-manager"],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["collection_id", "name", "description", "items"],
                                "properties": {
                                    "collection_id": {"type": "string"},
                                    "name": {"type": "string"},
                                    "description": {"type": "string"},
                                    "items": {"type": "array", "items": {"type": "object"}},
                                    "tags": {"type": "array", "items": {"type": "string"}},
                                    "output_path": {"type": "string"}
                                }
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Collection created",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "status": {"type": "string"},
                                        "message": {"type": "string"},
                                        "path": {"type": "string"}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return spec


def main():
    """Generate OpenAPI spec and save to file"""
    output_dir = Path(__file__).parent.parent / "openapi-specs"
    output_dir.mkdir(exist_ok=True)

    spec = generate_openapi_spec()

    output_file = output_dir / "awesome-copilot-mcp.json"
    with open(output_file, "w") as f:
        json.dump(spec, f, indent=2)

    print(f"✓ Generated OpenAPI spec: {output_file}")
    print(f"  - {len(spec['paths'])} endpoints")
    print(f"  - {len(spec['components']['schemas'])} schemas")
    print()
    print("Next steps:")
    print("  1. Review the spec:")
    print(f"     code {output_file}")
    print()
    print("  2. Generate AI SDK tools with aitm:")
    print(f"     npx aitm ./agent/tools/generated {output_file}")
    print()
    print("  3. Import in agent/main.py:")
    print("     from tools.generated.tool import listAwesomeCopilotCollections")
    print()
    print("  4. Register with ADK:")
    print("     toolkit.register_tools([listAwesomeCopilotCollections, ...])")


if __name__ == "__main__":
    main()
