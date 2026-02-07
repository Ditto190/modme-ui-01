# Quick Start: MCP Collection Generation

## Overview

Generate agent collections from MCP toolset metadata using three integrated tools.

## Installation

```bash
# Ensure you're in the project root
cd d:\Github_Projects\Modme_2026\modme-ui-01-test-worktree

# Python dependencies should already be installed
# For TypeScript tools:
cd agent-generator
npm install
```

## Usage Examples

### 1. Generate Collection from Keywords (Python)

```python
from agent.tools.collection_generator import generate_collection_from_search

# Basic usage
result = generate_collection_from_search(
    keywords="azure cloud devops",
    max_items=15
)

# Advanced usage with filters
result = generate_collection_from_search(
    keywords="api rest graphql testing",
    max_items=20,
    include_agents=True,
    include_prompts=True,
    include_instructions=True,
    include_skills=False,
    output_name="my-custom-collection"
)

print(f"Status: {result['status']}")
print(f"Collection ID: {result['collection_id']}")
print(f"Items: {result['item_count']}")
```

### 2. Generate Collection from Command Line

```bash
# Basic search
python agent-library/scripts/generate_collection_from_keywords.py "testing automation"

# With options
python agent-library/scripts/generate_collection_from_keywords.py \
  "react nextjs frontend" \
  --max-items 20 \
  --output my-react-collection

# Full control
python agent-library/scripts/generate_collection_from_keywords.py \
  "azure cloud security" \
  --max-items 15 \
  --include-agents \
  --include-prompts \
  --include-instructions \
  --output azure-security
```

### 3. Generate Zod Schemas from JSON Schema (TypeScript)

```typescript
import {
  generateZodFromJSONSchema,
  generateZodModule,
  generateSchemaFileStructure,
} from "./src/mcp-registry/schema-crawler";

// Example: MCP tool schema
const toolSchema = {
  type: "object",
  properties: {
    toolset_name: { type: "string" },
    max_items: { type: "number", minimum: 1, maximum: 50 },
  },
  required: ["toolset_name"],
};

// Generate Zod schema
const zodOutput = generateZodFromJSONSchema(toolSchema, "MyToolInput");
console.log(zodOutput.zodCode); // Zod schema code
console.log(zodOutput.typeDefinition); // TypeScript interface
console.log(zodOutput.validatorCode); // Validation functions

// Generate complete module
const moduleCode = generateZodModule("get_tools", toolSchema);
console.log(moduleCode);

// Generate file structure for multiple tools
const tools = [
  { name: "get_tools", inputSchema: toolSchema },
  { name: "list_tools", inputSchema: { type: "object", properties: {} } },
];

const files = generateSchemaFileStructure("my-mcp-server", tools);
files.forEach((content, path) => {
  console.log(`File: ${path}`);
  // Save to disk or process further
});
```

### 4. Run Schema Crawler Test

```bash
cd agent-generator
npx tsx test-schema-crawler.ts
```

### 5. Integration: MCP Toolset → Collection

```python
from agent.tests.test_integration_mcp_collection import (
    extract_keywords_from_toolset,
    generate_collection_from_mcp_toolset
)

# Simulate MCP toolset data
toolset_data = {
    "toolset_name": "my-mcp-server",
    "description": "Tools for database operations and API interactions",
    "tags": ["database", "api", "rest", "sql"],
    "tools": [
        {
            "name": "query_db",
            "description": "Execute SQL queries",
            "tags": ["database", "sql"]
        }
    ]
}

# Generate collection
result = generate_collection_from_mcp_toolset(
    toolset_data,
    max_items=15
)

if result['status'] == 'success':
    print(f"✅ Generated: {result['collection_id']}")
    print(f"   Items: {result['item_count']}")
    print(f"   Tags: {', '.join(result['tags'])}")
```

### 6. Run Full Integration Test

```bash
cd d:\Github_Projects\Modme_2026\modme-ui-01-test-worktree
python agent\tests\test_integration_mcp_collection.py
```

## Output Files

Each collection generates **two files** in `agent-library/collections/`:

1. **`{collection-id}.collection.yml`** - YAML manifest with embedded generation metadata

   ```yaml
   id: my-collection
   name: My Collection
   description: Auto-generated collection
   tags: [tag1, tag2]
   items:
     - kind: agent
       path: agents/my-agent.agent.md
   display:
     ordering: manual
     show_badge: true
     featured: false
   generation:
     generated_at: "2026-02-07T23:44:18.655504"
     keywords: [keyword1, keyword2]
     total_matches: 342
     selected_items: 10
   ```

2. **`{collection-id}.md`** - Markdown documentation

   ```markdown
   # My Collection

   Auto-generated collection focused on keywords...

   ## Collection Details

   - **Generated**: 2026-02-07T23:44:18.655504
   - **Keywords**: keyword1, keyword2
   - **Total Matches**: 342
   - **Selected Items**: 10

   ## Items (10)

   - **Agent**: my-agent
   - **Prompt**: my-prompt
   ```

**Note:** The `generation` field in YAML is an **optional extension** to the official GitHub Copilot collection format. It provides tracking information for auto-generated collections but doesn't interfere with standard collection functionality.

## Configuration

### Collection Generator Options

| Parameter            | Type   | Default  | Description               |
| -------------------- | ------ | -------- | ------------------------- |
| keywords             | string | required | Space-separated keywords  |
| max_items            | int    | 15       | Maximum items to include  |
| include_agents       | bool   | True     | Include agent files       |
| include_prompts      | bool   | True     | Include prompt files      |
| include_instructions | bool   | True     | Include instruction files |
| include_skills       | bool   | False    | Include skill files       |
| output_name          | string | auto     | Custom collection ID      |

### Schema Crawler Features

- ✅ Basic types: string, number, boolean, array, object
- ✅ Constraints: minLength, maxLength, pattern, min, max, enum
- ✅ Nested objects and arrays
- ✅ Optional properties
- ✅ Required fields validation
- ✅ Input/output schemas
- ✅ TypeScript interfaces
- ✅ Zod validator functions

## Real-World Workflow

### Scenario: Create Azure DevOps Collection from MCP Server

```python
# 1. Fetch toolset from MCP server (or use mock data)
toolset = {
    "toolset_name": "azure-devops",
    "description": "Azure DevOps integration tools",
    "tags": ["azure", "devops", "ci-cd", "pipelines"]
}

# 2. Generate collection
from agent.tools.collection_generator import generate_collection_from_search

result = generate_collection_from_search(
    keywords="azure devops ci cd pipelines",
    max_items=20,
    output_name="azure-devops-toolkit"
)

# 3. Use the collection in GitHub Copilot
# The generated .collection.yml file can now be used by Copilot
# to provide context-aware suggestions
```

### Scenario: Generate Type-Safe MCP Client

```typescript
import { generateSchemaFileStructure } from "./src/mcp-registry/schema-crawler";

// 1. Fetch MCP server tool definitions
const mcpTools = [
  {
    name: "create_pipeline",
    inputSchema: {
      /* JSON Schema */
    },
    outputSchema: {
      /* JSON Schema */
    },
  },
];

// 2. Generate Zod schemas
const files = generateSchemaFileStructure("azure-devops", mcpTools);

// 3. Save to disk
import { writeFileSync } from "fs";
files.forEach((content, path) => {
  writeFileSync(`./generated-schemas/${path}`, content);
});

// 4. Use in client code
import { azureDevopsTools } from "./generated-schemas/azure-devops/registry";

const result = azureDevopsTools.create_pipeline.inputSchema.parse(userInput);
```

## Troubleshooting

### Issue: "CollectionGenerator not available"

**Solution**: Ensure agent-library scripts are in Python path

```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "agent-library" / "scripts"))
```

### Issue: "agent-library not found"

**Solution**: Check directory structure

```bash
agent-library/
  agents/
  prompts/
  instructions/
  collections/
  scripts/
```

### Issue: TypeScript module not found

**Solution**: Install dependencies

```bash
cd agent-generator
npm install zod
```

### Issue: No matches found

**Solution**:

- Try broader keywords
- Check that agent-library has content
- Verify file naming conventions (_.agent.md, _.prompt.md, etc.)

## Advanced Usage

### Custom Relevance Scoring

Modify `search_in_file()` in `generate_collection_from_keywords.py`:

```python
def calculate_relevance(matches, frontmatter):
    score = matches * 10

    # Boost for featured items
    if frontmatter.get('featured'):
        score *= 1.5

    # Boost for specific tags
    tags = frontmatter.get('tags', [])
    if 'best-practice' in tags:
        score *= 1.2

    return score
```

### Schema Transformation Pipeline

```typescript
import { generateZodModule } from "./src/mcp-registry/schema-crawler";

// 1. Fetch from MCP server
const mcpToolDef = await fetch("http://mcp-server/tools/my-tool");

// 2. Transform to Zod
const zodModule = generateZodModule(
  mcpToolDef.name,
  mcpToolDef.inputSchema,
  mcpToolDef.outputSchema
);

// 3. Save and compile
writeFileSync(`./schemas/${mcpToolDef.name}.ts`, zodModule);

// 4. Use in application
import { MyToolInputSchema } from "./schemas/my-tool";
const validated = MyToolInputSchema.parse(rawInput);
```

## API Reference

See full documentation in:

- `agent/tools/collection_generator.py` - Collection generator tool
- `agent-library/scripts/generate_collection_from_keywords.py` - CLI script
- `agent-generator/src/mcp-registry/schema-crawler.ts` - Schema crawler

## Examples

See test files for complete examples:

- `agent/tests/test_integration_mcp_collection.py` - Full integration test
- `agent-generator/test-schema-crawler.ts` - Schema crawler tests

---

**Quick Reference**: Run tests to see all features in action

```bash
# Python collection generation
python agent\tests\test_integration_mcp_collection.py

# TypeScript schema generation
cd agent-generator && npx tsx test-schema-crawler.ts
```
