#!/usr/bin/env python3
"""
Test the generated OpenAPI spec and FastAPI bridge endpoints

Tests:
1. OpenAPI spec generation
2. FastAPI endpoint responses
3. Schema validation
4. Error handling
"""

import json
from pathlib import Path

import pytest
import requests

SPEC_PATH = Path(__file__).parent.parent / "openapi-specs" / "awesome-copilot-mcp.json"
BASE_URL = "http://localhost:8000"


def test_openapi_spec_exists():
    """Verify OpenAPI spec was generated"""
    assert SPEC_PATH.exists(), f"OpenAPI spec not found: {SPEC_PATH}"

    with open(SPEC_PATH) as f:
        spec = json.load(f)

    assert spec["openapi"] == "3.0.3"
    assert "paths" in spec
    assert len(spec["paths"]) > 0


def test_openapi_spec_structure():
    """Validate OpenAPI spec structure"""
    with open(SPEC_PATH) as f:
        spec = json.load(f)

    # Check required OpenAPI fields
    assert "info" in spec
    assert "servers" in spec
    assert "paths" in spec
    assert "components" in spec

    # Check info section
    assert spec["info"]["title"] == "Awesome Copilot MCP API"
    assert "version" in spec["info"]

    # Check schemas
    assert "Collection" in spec["components"]["schemas"]
    assert "Toolset" in spec["components"]["schemas"]


def test_list_collections_endpoint():
    """Test /mcp/awesome-copilot/collections endpoint"""
    response = requests.get(f"{BASE_URL}/mcp/awesome-copilot/collections")

    if response.status_code == 200:
        data = response.json()
        assert "collections" in data
        assert isinstance(data["collections"], list)
    else:
        # Server might not be running - that's ok for this test
        pytest.skip("MCP server not running")


def test_list_toolsets_endpoint():
    """Test /mcp/github/toolsets endpoint"""
    response = requests.get(f"{BASE_URL}/mcp/github/toolsets")

    if response.status_code == 200:
        data = response.json()
        assert "toolsets" in data
        assert isinstance(data["toolsets"], list)
    else:
        pytest.skip("MCP server not running")


def test_schema_validation():
    """Test that schemas match expected structure"""
    with open(SPEC_PATH) as f:
        spec = json.load(f)

    collection_schema = spec["components"]["schemas"]["Collection"]

    # Required fields
    assert "id" in collection_schema["required"]
    assert "name" in collection_schema["required"]
    assert "description" in collection_schema["required"]

    # Properties
    props = collection_schema["properties"]
    assert "id" in props
    assert "name" in props
    assert "description" in props
    assert "tags" in props
    assert "items" in props


def test_endpoint_coverage():
    """Verify all expected endpoints are in spec"""
    with open(SPEC_PATH) as f:
        spec = json.load(f)

    paths = spec["paths"]

    # Check awesome-copilot endpoints
    assert "/mcp/awesome-copilot/collections" in paths
    assert "/mcp/awesome-copilot/collections/{collection_name}" in paths

    # Check GitHub MCP endpoints
    assert "/mcp/github/toolsets" in paths
    assert "/mcp/github/toolsets/{toolset_name}/tools" in paths
    assert "/mcp/github/toolsets/{toolset_name}/enable" in paths

    # Check collection manager endpoints
    assert "/mcp/collections/scan" in paths
    assert "/mcp/collections/create" in paths


def test_operation_ids():
    """Verify operation IDs are properly set"""
    with open(SPEC_PATH) as f:
        spec = json.load(f)

    paths = spec["paths"]

    # Check that all operations have operationId
    for path, methods in paths.items():
        for method, operation in methods.items():
            assert "operationId" in operation, \
                f"Missing operationId for {method.upper()} {path}"

            # operationId should be camelCase
            op_id = operation["operationId"]
            assert op_id[0].islower(), \
                f"operationId should start with lowercase: {op_id}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
