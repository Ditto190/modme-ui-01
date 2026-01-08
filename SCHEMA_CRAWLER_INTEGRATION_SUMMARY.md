# Schema Crawler Tool Integration

## Overview

The schema-crawler tool is now integrated as a Python tool callable from the agent, allowing runtime JSON Schema → Zod + TypeScript conversion.

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `agent/tools/schema_crawler_tool.py` | Python wrapper for schema-crawler.ts | 250+ |
| `scripts/knowledge-management/anthropic-skill-converter.js` | Download & convert Anthropic skills | 450+ |
| `scripts/knowledge-management/skill-spec-validator.js` | Validate against Agent Skills spec | 350+ |
| `docs/ANTHROPIC_SKILLS_INTEGRATION.md` | Complete integration guide | 450+ |

## Usage Examples

### 1. Generate Zod Schema from Python Agent

```python
from agent.tools.schema_crawler_tool import generate_zod_module

# In agent tool function
result = generate_zod_module(
    tool_context,
    tool_name="upsertUIElement",
    input_schema={
        "type": "object",
        "properties": {
            "id": {"type": "string", "minLength": 1},
            "type": {"type": "string", "enum": ["StatCard", "DataTable", "ChartCard"]},
            "props": {"type": "object"}
        },
        "required": ["id", "type", "props"]
    },
    output_path="src/schemas/upsertUIElement.schema.ts"
)
```

### 2. Convert Anthropic Skills

```bash
# List all skills
node scripts/knowledge-management/anthropic-skill-converter.js --list

# Convert single skill
node scripts/knowledge-management/anthropic-skill-converter.js \
  --skill pdf \
  --output agent-generator/src/skills

# Batch convert all skills
node scripts/knowledge-management/anthropic-skill-converter.js \
  --batch \
  --output agent-generator/src/skills
```

### 3. Validate Converted Skills

```bash
node scripts/knowledge-management/skill-spec-validator.js \
  agent-generator/src/skills/pdf

# Output:
# ✅ Skill is valid!
# 
# 📊 Metrics:
#    - Body: 380 lines, 3,120 words
#    - Description: 142 chars, 21 words
#    - Context efficiency: Good
```

## GenAI Toolbox Integration

Updated `genai-toolbox/tools.yaml`:

```yaml
tools:
  generate_zod_schema:
    kind: python
    module: agent.tools.schema_crawler_tool
    function: generate_zod_from_json_schema
    description: "Convert JSON Schema to Zod validation schema"
    parameters:
      - name: json_schema
        type: object
      - name: schema_name
        type: string
      - name: output_path
        type: string

  generate_zod_module:
    kind: python
    module: agent.tools.schema_crawler_tool
    function: generate_zod_module
    description: "Generate complete Zod module for MCP tool"
    parameters:
      - name: tool_name
        type: string
      - name: input_schema
        type: object
      - name: output_schema
        type: object
      - name: output_path
        type: string
```

## Next Steps

1. **Install Dependencies**:

   ```bash
   npm install @octokit/rest js-yaml
   ```

2. **Set GitHub Token** (for API access):

   ```bash
   export GITHUB_TOKEN=ghp_your_token_here
   ```

3. **Test Conversion**:

   ```bash
   npm run skills:list
   npm run skills:convert -- skill-creator
   npm run skills:validate -- agent-generator/src/skills/skill-creator
   ```

4. **Generate Zod Schemas** for existing tools:

   ```python
   # In agent/main.py
   from agent.tools.schema_crawler_tool import generate_zod_module
   
   # Generate schema for upsert_ui_element tool
   generate_zod_module(
       tool_context,
       "upsertUIElement",
       UPSERT_UI_ELEMENT_SCHEMA,
       output_path="src/schemas/upsertUIElement.schema.ts"
   )
   ```

## Benefits

✅ **Type Safety**: Runtime validation with Zod ensures no bad data reaches tools  
✅ **Dual-Runtime Sync**: Python dict ↔ TypeScript interfaces stay in sync  
✅ **Skill Reusability**: Import battle-tested skills from Anthropic repo  
✅ **Spec Compliance**: Validator ensures adherence to Agent Skills spec  
✅ **Auto-Generated Code**: Reduces manual errors, accelerates development  

## Related Documentation

- [ANTHROPIC_SKILLS_INTEGRATION.md](../docs/ANTHROPIC_SKILLS_INTEGRATION.md) - Complete guide
- [SCHEMA_CRAWLER_README.md](../agent-generator/SCHEMA_CRAWLER_README.md) - schema-crawler.ts documentation
- [REFACTORING_PATTERNS.md](../docs/REFACTORING_PATTERNS.md) - Pattern 9 (JSON Schema to Zod)

---

**Status**: ✅ Complete - Ready for testing  
**Created**: January 3, 2026
