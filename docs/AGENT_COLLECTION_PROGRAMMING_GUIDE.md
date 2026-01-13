# Agent Collection Programming Guide

> **Comprehensive guide for programmatically creating agent collection sets based on awesome-copilot repository patterns**

**Date**: January 7, 2026  
**References**:

- awesome-copilot repository structure
- collection.schema.json
- yaml-parser.js/mjs patterns
- schema_crawler_tool.py integration

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Collection Schema Structure](#collection-schema-structure)
3. [YAML Parser Patterns](#yaml-parser-patterns)
4. [TypeScript Implementation](#typescript-implementation)
5. [Python Integration](#python-integration)
6. [Programmatic Collection Creation](#programmatic-collection-creation)
7. [Validation Pipeline](#validation-pipeline)
8. [Complete Examples](#complete-examples)

---

## Overview

### Repository Structure Pattern (awesome-copilot)

```
awesome-copilot/
├── agents/              # .agent.md files
├── prompts/             # .prompt.md files
├── instructions/        # .instructions.md files
├── skills/              # SKILL.md folders
├── collections/         # .collection.yml files
├── eng/                 # Engineering scripts
│   ├── create-collection.mjs
│   ├── validate-collections.mjs
│   ├── yaml-parser.mjs
│   └── constants.mjs
└── .schemas/
    └── collection.schema.json
```

### Key Concepts

1. **Collections**: Curated groups of agents, prompts, instructions organized by theme
2. **Frontmatter**: YAML metadata in markdown files (agents, prompts, instructions)
3. **Pure YAML**: Collections are standalone YAML files (no markdown wrapper)
4. **Validation**: Schema-based validation using collection.schema.json

---

## Collection Schema Structure

### Schema Definition (collection.schema.json)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Collection Manifest",
  "type": "object",
  "required": ["id", "name", "description", "items"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$",
      "minLength": 1,
      "maxLength": 50
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100
    },
    "description": {
      "type": "string",
      "minLength": 1,
      "maxLength": 500
    },
    "tags": {
      "type": "array",
      "items": { "type": "string", "pattern": "^[a-z0-9-]+$" },
      "uniqueItems": true,
      "maxItems": 10
    },
    "items": {
      "type": "array",
      "minItems": 1,
      "maxItems": 50,
      "items": {
        "type": "object",
        "required": ["path", "kind"],
        "properties": {
          "path": {
            "type": "string",
            "pattern": "^(prompts|instructions|agents|skills)/[^/]+\\.(prompt|instructions|agent)\\.md$"
          },
          "kind": {
            "type": "string",
            "enum": ["prompt", "instruction", "agent", "skill"]
          },
          "usage": { "type": "string" }
        }
      }
    },
    "display": {
      "type": "object",
      "properties": {
        "ordering": { "enum": ["manual", "alpha"], "default": "alpha" },
        "show_badge": { "type": "boolean", "default": false },
        "featured": { "type": "boolean", "default": false }
      }
    }
  }
}
```

### Example Collection YAML

```yaml
# collections/frontend-web-dev.collection.yml
id: frontend-web-dev
name: Frontend & Web Development
description: React 19+, Next.js patterns, TypeScript conventions, and modern web development best practices
tags:
  - react
  - nextjs
  - typescript
  - frontend
  - web-dev

items:
  - path: instructions/reactjs.instructions.md
    kind: instruction
    usage: React 19+ coding standards

  - path: instructions/nextjs.instructions.md
    kind: instruction
    usage: Next.js App Router patterns (2025)

  - path: prompts/component-generator.prompt.md
    kind: prompt
    usage: Generate React components with TypeScript

  - path: agents/frontend-specialist.agent.md
    kind: agent
    usage: Expert React/Next.js development agent

display:
  ordering: manual
  show_badge: true
  featured: true
```

---

## YAML Parser Patterns

### Pattern 1: Parse Collection YAML (Pure YAML Files)

**From attached yaml-parser.js:**

```javascript
const fs = require("fs");
const yaml = require("js-yaml");

/**
 * Parse a collection YAML file (.collection.yml)
 * Collections are pure YAML files without frontmatter delimiters
 */
function parseCollectionYaml(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");

    // Collections are pure YAML, parse directly
    return yaml.load(content, { schema: yaml.JSON_SCHEMA });
  } catch (error) {
    console.error(`Error parsing ${filePath}: ${error.message}`);
    return null;
  }
}
```

**TypeScript equivalent (yaml-parser.mjs):**

```typescript
import fs from "fs";
import yaml from "js-yaml";

export function parseCollectionYaml(filePath: string): Collection | null {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = yaml.load(content, { schema: yaml.JSON_SCHEMA });

    // Validate against schema
    return validateCollection(parsed);
  } catch (error) {
    console.error(`Error parsing collection ${filePath}:`, error.message);
    return null;
  }
}

interface Collection {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  items: CollectionItem[];
  display?: {
    ordering?: "manual" | "alpha";
    show_badge?: boolean;
    featured?: boolean;
  };
}

interface CollectionItem {
  path: string;
  kind: "prompt" | "instruction" | "agent" | "skill";
  usage?: string;
}
```

### Pattern 2: Parse Frontmatter (Markdown with YAML)

**From attached yaml-parser.js:**

```javascript
const { VFile } = require("vfile");
const { matter } = require("vfile-matter");

/**
 * Parse frontmatter from markdown files (agents, prompts, instructions)
 * Works with files that have YAML frontmatter between --- delimiters
 */
function parseFrontmatter(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const file = new VFile({ path: filePath, value: content });

    // Parse frontmatter using vfile-matter
    matter(file);

    const frontmatter = file.data.matter;

    // Normalize string fields (trim trailing newlines/spaces)
    if (frontmatter) {
      Object.keys(frontmatter).forEach((key) => {
        if (typeof frontmatter[key] === "string") {
          frontmatter[key] = frontmatter[key].trim();
        }
      });
    }

    return frontmatter;
  } catch (error) {
    console.error(`Error parsing frontmatter ${filePath}:`, error.message);
    return null;
  }
}
```

**TypeScript equivalent:**

```typescript
import { VFile } from "vfile";
import { matter } from "vfile-matter";

export function parseFrontmatter(filePath: string): AgentFrontmatter | null {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const file = new VFile({ path: filePath, value: content });

    matter(file);

    const frontmatter = file.data.matter as AgentFrontmatter;

    // Normalize strings
    if (frontmatter) {
      Object.keys(frontmatter).forEach((key) => {
        if (typeof frontmatter[key] === "string") {
          frontmatter[key] = frontmatter[key].trim();
        }
      });
    }

    return frontmatter;
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
    return null;
  }
}

interface AgentFrontmatter {
  agent?: string;
  mode?: string; // Legacy, prefer 'agent'
  name?: string;
  description?: string;
  tools?: string[];
  "mcp-servers"?: Record<string, MCPServerConfig>;
}

interface MCPServerConfig {
  type?: "remote" | "local";
  url?: string;
  command?: string;
  args?: string[];
  headers?: Record<string, string>;
}
```

### Pattern 3: Extract MCP Server Configs

**From attached yaml-parser.js:**

```javascript
/**
 * Extract MCP server names from an agent file
 */
function extractMcpServers(filePath) {
  const metadata = extractAgentMetadata(filePath);

  if (!metadata || !metadata.mcpServers) {
    return [];
  }

  return Object.keys(metadata.mcpServers);
}

/**
 * Extract full MCP server configs from an agent file
 */
function extractMcpServerConfigs(filePath) {
  const metadata = extractAgentMetadata(filePath);
  if (!metadata || !metadata.mcpServers) return [];

  return Object.entries(metadata.mcpServers).map(([name, cfg]) => {
    const copy = { ...cfg };
    copy.name = name;
    return copy;
  });
}
```

---

## TypeScript Implementation

### Complete yaml-parser.mjs Implementation

```typescript
// eng/yaml-parser.mjs
import fs from "fs";
import yaml from "js-yaml";
import { VFile } from "vfile";
import { matter } from "vfile-matter";

/**
 * Safe file operation wrapper
 */
function safeFileOperation<T>(
  operation: () => T,
  filePath: string,
  defaultValue: T | null = null
): T | null {
  try {
    return operation();
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error.message}`);
    return defaultValue;
  }
}

/**
 * Parse collection YAML file
 */
export function parseCollectionYaml(filePath: string): Collection | null {
  return safeFileOperation(
    () => {
      const content = fs.readFileSync(filePath, "utf8");
      return yaml.load(content, { schema: yaml.JSON_SCHEMA }) as Collection;
    },
    filePath,
    null
  );
}

/**
 * Parse markdown frontmatter
 */
export function parseFrontmatter(filePath: string): Frontmatter | null {
  return safeFileOperation(
    () => {
      const content = fs.readFileSync(filePath, "utf8");
      const file = new VFile({ path: filePath, value: content });

      matter(file);

      const frontmatter = file.data.matter as Frontmatter;

      // Normalize string fields
      if (frontmatter) {
        Object.keys(frontmatter).forEach((key) => {
          if (typeof frontmatter[key] === "string") {
            frontmatter[key] = frontmatter[key].trim();
          }
        });
      }

      return frontmatter;
    },
    filePath,
    null
  );
}

/**
 * Extract agent metadata including MCP servers
 */
export function extractAgentMetadata(filePath: string): AgentMetadata | null {
  const frontmatter = parseFrontmatter(filePath);

  if (!frontmatter) return null;

  return {
    name: frontmatter.name || null,
    description: frontmatter.description || null,
    tools: frontmatter.tools || [],
    mcpServers: frontmatter["mcp-servers"] || {},
  };
}

/**
 * Extract MCP server names
 */
export function extractMcpServers(filePath: string): string[] {
  const metadata = extractAgentMetadata(filePath);
  if (!metadata || !metadata.mcpServers) return [];
  return Object.keys(metadata.mcpServers);
}

/**
 * Extract full MCP server configs
 */
export function extractMcpServerConfigs(filePath: string): MCPServerWithName[] {
  const metadata = extractAgentMetadata(filePath);
  if (!metadata || !metadata.mcpServers) return [];

  return Object.entries(metadata.mcpServers).map(([name, cfg]) => ({
    name,
    ...cfg,
  }));
}

// Type definitions
export interface Collection {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  items: CollectionItem[];
  display?: {
    ordering?: "manual" | "alpha";
    show_badge?: boolean;
    featured?: boolean;
  };
}

export interface CollectionItem {
  path: string;
  kind: "prompt" | "instruction" | "agent" | "skill";
  usage?: string;
}

export interface Frontmatter {
  agent?: string;
  mode?: string;
  name?: string;
  description?: string;
  tools?: string[];
  "mcp-servers"?: Record<string, MCPServerConfig>;
}

export interface MCPServerConfig {
  type?: "remote" | "local";
  url?: string;
  command?: string;
  args?: string[];
  headers?: Record<string, string>;
}

export interface AgentMetadata {
  name: string | null;
  description: string | null;
  tools: string[];
  mcpServers: Record<string, MCPServerConfig>;
}

export interface MCPServerWithName extends MCPServerConfig {
  name: string;
}
```

---

## Python Integration

### Python Wrapper for YAML Parser

```python
# agent/tools/collection_manager.py
"""
Collection Manager Tool - Programmatically create and manage agent collections
"""

import json
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Any, Optional
from google.adk.tools import ToolContext

# Path to yaml-parser.mjs
YAML_PARSER_PATH = Path(__file__).parent.parent.parent / "eng" / "yaml-parser.mjs"

def parse_collection_yaml(
    tool_context: ToolContext,
    collection_path: str
) -> Dict[str, Any]:
    """
    Parse a collection YAML file using the TypeScript yaml-parser.

    Args:
        collection_path: Path to .collection.yml file

    Returns:
        Dictionary with:
        - status: "success" or "error"
        - collection: Parsed collection object
        - error: Error message (if status is "error")
    """
    try:
        # Validate path
        path = Path(collection_path)
        if not path.exists():
            return {
                "status": "error",
                "error": f"Collection file not found: {collection_path}"
            }

        if not path.suffix == '.yml':
            return {
                "status": "error",
                "error": f"Invalid file type. Expected .yml, got: {path.suffix}"
            }

        # Call TypeScript parser via Node.js
        script = f"""
        import {{ parseCollectionYaml }} from '{YAML_PARSER_PATH}';
        const collection = parseCollectionYaml('{collection_path}');
        console.log(JSON.stringify(collection));
        """

        with tempfile.NamedTemporaryFile(mode='w', suffix='.mjs', delete=False) as tmp:
            tmp.write(script)
            tmp_path = tmp.name

        result = subprocess.run(
            ['node', tmp_path],
            capture_output=True,
            text=True,
            timeout=10
        )

        Path(tmp_path).unlink()

        if result.returncode != 0:
            return {
                "status": "error",
                "error": f"Parser failed: {result.stderr}"
            }

        collection = json.loads(result.stdout)

        return {
            "status": "success",
            "collection": collection
        }

    except subprocess.TimeoutExpired:
        return {
            "status": "error",
            "error": "Parser timed out (10s limit)"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }


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
        collection_id: Unique identifier (lowercase-hyphenated)
        name: Display name for collection
        description: Description of collection purpose
        items: List of items with 'path', 'kind', optional 'usage'
        tags: Optional list of tags for discovery
        display: Optional display settings (ordering, show_badge, featured)
        output_path: Optional path to write collection file

    Returns:
        Dictionary with:
        - status: "success" or "error"
        - yaml_content: Generated YAML as string
        - file_path: Path where file was written (if output_path provided)
    """
    try:
        # Validate collection_id format
        import re
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

        # Validate items
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
                "message": f"Collection created: {collection_id}",
                "yaml_content": yaml_content,
                "file_path": str(output_file)
            }

        return {
            "status": "success",
            "message": f"Collection created: {collection_id}",
            "yaml_content": yaml_content
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


def validate_collection(
    tool_context: ToolContext,
    collection_path: str,
    schema_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Validate a collection against the JSON schema.

    Args:
        collection_path: Path to .collection.yml file
        schema_path: Optional path to collection.schema.json (defaults to .schemas/collection.schema.json)

    Returns:
        Dictionary with:
        - status: "valid" or "invalid"
        - errors: List of validation errors (if invalid)
    """
    try:
        # Parse collection
        parse_result = parse_collection_yaml(tool_context, collection_path)
        if parse_result['status'] == 'error':
            return {
                "status": "invalid",
                "errors": [parse_result['error']]
            }

        collection = parse_result['collection']

        # Load schema
        if not schema_path:
            schema_path = Path(__file__).parent.parent.parent / ".schemas" / "collection.schema.json"

        with open(schema_path, 'r') as f:
            schema = json.load(f)

        # Validate against schema
        from jsonschema import validate, ValidationError

        try:
            validate(instance=collection, schema=schema)
            return {
                "status": "valid",
                "message": "Collection is valid"
            }
        except ValidationError as e:
            return {
                "status": "invalid",
                "errors": [str(e)]
            }

    except Exception as e:
        return {
            "status": "error",
            "errors": [str(e)]
        }
```

---

## Programmatic Collection Creation

### Pattern 1: From Existing Files

```python
# Example: Scan repository and create collection from matching files
from pathlib import Path

def create_collection_from_pattern(
    tool_context: ToolContext,
    pattern: str,
    collection_id: str,
    name: str,
    description: str,
    tags: List[str]
) -> Dict[str, str]:
    """
    Create collection by scanning for files matching a pattern.

    Example: Create "frontend-web-dev" collection from all React/Next.js instructions
    """
    repo_root = Path("/workspaces/modme-ui-01")

    # Find matching files
    items = []

    # Scan instructions
    instructions_dir = repo_root / "instructions"
    if instructions_dir.exists():
        for file in instructions_dir.glob("*.instructions.md"):
            frontmatter = parseFrontmatter(str(file))
            if frontmatter and any(tag in (frontmatter.get('tags', []) or []) for tag in tags):
                items.append({
                    "path": f"instructions/{file.name}",
                    "kind": "instruction",
                    "usage": frontmatter.get('description', '')
                })

    # Scan prompts
    prompts_dir = repo_root / "prompts"
    if prompts_dir.exists():
        for file in prompts_dir.glob("*.prompt.md"):
            frontmatter = parseFrontmatter(str(file))
            if frontmatter and any(tag in (frontmatter.get('tags', []) or []) for tag in tags):
                items.append({
                    "path": f"prompts/{file.name}",
                    "kind": "prompt",
                    "usage": frontmatter.get('description', '')
                })

    # Scan agents
    agents_dir = repo_root / "agents"
    if agents_dir.exists():
        for file in agents_dir.glob("*.agent.md"):
            frontmatter = parseFrontmatter(str(file))
            if frontmatter and any(tag in (frontmatter.get('tags', []) or []) for tag in tags):
                items.append({
                    "path": f"agents/{file.name}",
                    "kind": "agent",
                    "usage": frontmatter.get('description', '')
                })

    # Create collection
    output_path = repo_root / "collections" / f"{collection_id}.collection.yml"

    return create_collection(
        tool_context,
        collection_id=collection_id,
        name=name,
        description=description,
        items=items,
        tags=tags,
        display={
            "ordering": "alpha",
            "show_badge": True,
            "featured": False
        },
        output_path=str(output_path)
    )
```

### Pattern 2: From MCP Server Dependencies

```python
def create_mcp_server_collection(
    tool_context: ToolContext,
    mcp_server_name: str
) -> Dict[str, str]:
    """
    Create collection of all agents that use a specific MCP server.

    Example: Create "github-agents" collection with all agents using GitHub MCP
    """
    repo_root = Path("/workspaces/modme-ui-01")
    agents_dir = repo_root / "agents"

    items = []

    if agents_dir.exists():
        for file in agents_dir.glob("*.agent.md"):
            mcp_servers = extractMcpServers(str(file))
            if mcp_server_name in mcp_servers:
                frontmatter = parseFrontmatter(str(file))
                items.append({
                    "path": f"agents/{file.name}",
                    "kind": "agent",
                    "usage": frontmatter.get('description', '') if frontmatter else ''
                })

    collection_id = f"{mcp_server_name}-agents"

    return create_collection(
        tool_context,
        collection_id=collection_id,
        name=f"{mcp_server_name.title()} Agents",
        description=f"Agents that integrate with {mcp_server_name} MCP server",
        items=items,
        tags=[mcp_server_name, "mcp", "agents"],
        display={"ordering": "alpha"},
        output_path=str(repo_root / "collections" / f"{collection_id}.collection.yml")
    )
```

---

## Validation Pipeline

### Schema Validation Script

```typescript
// eng/validate-collections.mjs
import fs from "fs";
import path from "path";
import Ajv from "ajv";
import { parseCollectionYaml } from "./yaml-parser.mjs";

export async function validateCollections(collectionsDir: string, schemaPath: string) {
  const ajv = new Ajv({ allErrors: true });
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const validate = ajv.compile(schema);

  const results = [];

  // Find all .collection.yml files
  const collectionFiles = fs
    .readdirSync(collectionsDir)
    .filter((file) => file.endsWith(".collection.yml"));

  for (const file of collectionFiles) {
    const filePath = path.join(collectionsDir, file);
    const collection = parseCollectionYaml(filePath);

    if (!collection) {
      results.push({
        file,
        valid: false,
        errors: ["Failed to parse YAML"],
      });
      continue;
    }

    const valid = validate(collection);

    results.push({
      file,
      valid,
      errors: valid ? [] : validate.errors?.map((err) => err.message) || [],
    });
  }

  return results;
}

// Run validation
if (process.argv[1] === import.meta.url) {
  const collectionsDir = process.argv[2] || "./collections";
  const schemaPath = process.argv[3] || "./.schemas/collection.schema.json";

  validateCollections(collectionsDir, schemaPath).then((results) => {
    const failed = results.filter((r) => !r.valid);

    console.log(`\n✅ Validated ${results.length} collections`);
    console.log(`✅ ${results.length - failed.length} valid`);
    console.log(`❌ ${failed.length} invalid\n`);

    if (failed.length > 0) {
      console.error("❌ Validation Errors:\n");
      failed.forEach(({ file, errors }) => {
        console.error(`  ${file}:`);
        errors.forEach((err) => console.error(`    - ${err}`));
      });
      process.exit(1);
    }
  });
}
```

---

## Complete Examples

### Example 1: GenUI Workbench Collection

```yaml
# collections/genui-workbench.collection.yml
id: genui-workbench
name: GenUI Workbench
description: Generative UI patterns, component registry, and agentic interface development for ModMe GenUI
tags:
  - genui
  - generative-ui
  - copilotkit
  - adk
  - python

items:
  - path: instructions/generative-ui-architecture.instructions.md
    kind: instruction
    usage: GenUI architecture patterns and best practices

  - path: instructions/python-adk-agent.instructions.md
    kind: instruction
    usage: Google ADK agent development standards

  - path: prompts/create-genui-component.prompt.md
    kind: prompt
    usage: Generate GenUI registry components

  - path: agents/workbench-assistant.agent.md
    kind: agent
    usage: GenUI workbench development agent

  - path: agents/component-specialist.agent.md
    kind: agent
    usage: React component generation for GenUI canvas

display:
  ordering: manual
  show_badge: true
  featured: true
```

### Example 2: Python Script to Generate Collection

```python
# scripts/generate-genui-collection.py
"""
Generate GenUI Workbench collection programmatically
"""

from agent.tools.collection_manager import create_collection
from pathlib import Path

def main():
    repo_root = Path(__file__).parent.parent

    # Define collection
    collection_id = "genui-workbench"
    name = "GenUI Workbench"
    description = "Generative UI patterns, component registry, and agentic interface development for ModMe GenUI"

    tags = [
        "genui",
        "generative-ui",
        "copilotkit",
        "adk",
        "python"
    ]

    items = [
        {
            "path": "instructions/generative-ui-architecture.instructions.md",
            "kind": "instruction",
            "usage": "GenUI architecture patterns and best practices"
        },
        {
            "path": "instructions/python-adk-agent.instructions.md",
            "kind": "instruction",
            "usage": "Google ADK agent development standards"
        },
        {
            "path": "prompts/create-genui-component.prompt.md",
            "kind": "prompt",
            "usage": "Generate GenUI registry components"
        },
        {
            "path": "agents/workbench-assistant.agent.md",
            "kind": "agent",
            "usage": "GenUI workbench development agent"
        },
        {
            "path": "agents/component-specialist.agent.md",
            "kind": "agent",
            "usage": "React component generation for GenUI canvas"
        }
    ]

    display = {
        "ordering": "manual",
        "show_badge": True,
        "featured": True
    }

    output_path = repo_root / "collections" / f"{collection_id}.collection.yml"

    # Create collection (mocked tool_context)
    class MockToolContext:
        state = {}

    result = create_collection(
        tool_context=MockToolContext(),
        collection_id=collection_id,
        name=name,
        description=description,
        items=items,
        tags=tags,
        display=display,
        output_path=str(output_path)
    )

    if result['status'] == 'success':
        print(f"✅ Collection created: {output_path}")
        print(f"\n{result['yaml_content']}")
    else:
        print(f"❌ Error: {result['message']}")

if __name__ == '__main__':
    main()
```

### Example 3: Integration with schema_crawler_tool.py

```python
# agent/tools/schema_crawler_tool.py
"""
Enhanced with collection generation capabilities
"""

from .collection_manager import create_collection, parse_collection_yaml

def generate_collection_from_mcp_tools(
    tool_context: ToolContext,
    mcp_server_name: str,
    tools: List[Dict[str, Any]]
) -> Dict[str, str]:
    """
    Generate agent collection for tools from an MCP server.

    Example: After crawling GitHub MCP tools, create a collection
    of agents that use those tools.
    """

    # Scan for agents using these tools
    items = []
    agents_dir = Path("/workspaces/modme-ui-01/agents")

    tool_names = {tool['name'] for tool in tools}

    for agent_file in agents_dir.glob("*.agent.md"):
        frontmatter = parseFrontmatter(str(agent_file))
        if not frontmatter:
            continue

        agent_tools = set(frontmatter.get('tools', []))

        # Check if agent uses any of these tools
        if agent_tools & tool_names:
            items.append({
                "path": f"agents/{agent_file.name}",
                "kind": "agent",
                "usage": frontmatter.get('description', '')
            })

    collection_id = f"{mcp_server_name}-integration"

    return create_collection(
        tool_context,
        collection_id=collection_id,
        name=f"{mcp_server_name.title()} Integration",
        description=f"Agents integrating with {mcp_server_name} MCP server tools",
        items=items,
        tags=[mcp_server_name, "mcp", "integration"],
        output_path=f"collections/{collection_id}.collection.yml"
    )
```

---

## Summary

### Key Takeaways

1. **Collections are Pure YAML** - No markdown wrapper, parsed directly with js-yaml
2. **Frontmatter is in Markdown** - Agents/prompts/instructions use YAML frontmatter between `---`
3. **Schema Validation** - Always validate against collection.schema.json
4. **TypeScript + Python** - Use Node.js for YAML parsing, wrap in Python tools
5. **MCP Integration** - Collections can group agents by MCP server dependencies

### Workflow for Creating Collections Programmatically

1. **Scan Repository** - Find agents, prompts, instructions by pattern
2. **Extract Frontmatter** - Parse YAML frontmatter to get metadata
3. **Build Items Array** - Create collection items with path, kind, usage
4. **Generate YAML** - Use Python yaml.dump() or TypeScript yaml-parser
5. **Validate** - Run against collection.schema.json
6. **Write File** - Save to `collections/{id}.collection.yml`

### Integration Points

- **schema_crawler_tool.py**: Generate collections from MCP tool schemas
- **prompt_builder.py**: Use A2UI schemas to build prompt collections
- **yaml-parser.mjs**: TypeScript utilities for parsing/validating
- **collection_manager.py**: Python wrapper for programmatic creation

---

**References:**

- awesome-copilot: <https://github.com/github/awesome-copilot>
- Collection Schema: .schemas/collection.schema.json
- YAML Parser: eng/yaml-parser.mjs
- Validation: eng/validate-collections.mjs
