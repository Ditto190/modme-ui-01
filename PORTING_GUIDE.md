# ModMe GenUI Workbench - Porting Guide

> **Complete guide for porting this monorepo into other projects**

**Version**: 1.0.0  
**Date**: January 3, 2026  
**Status**: Production-Ready

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Portable Components](#portable-components)
4. [Integration Patterns](#integration-patterns)
5. [Dependency Map](#dependency-map)
6. [Migration Checklist](#migration-checklist)
7. [Common Porting Scenarios](#common-porting-scenarios)

---

## 🚀 Quick Start

### What is Portable?

This monorepo contains **highly portable components** organized into self-contained modules:

| Component Category | Portability | Dependencies | Lines of Code |
|-------------------|-------------|--------------|---------------|
| **Knowledge Base System** | ✅ Standalone | TypeScript, Node.js 22 | ~1,200 |
| **Component Registry** | ✅ Standalone | React 19, TypeScript | ~800 |
| **Toolset Management** | ✅ Standalone | Node.js, JSON | ~900 |
| **Agent Tools** | ⚠️ Requires ADK | Python 3.12+, Google ADK | ~420 |
| **GenAI Toolbox** | ✅ Standalone | Python, YAML | ~150 |
| **Schema Crawler** | ✅ Standalone | TypeScript, Zod | ~600 |
| **ChromaDB Integration** | ⚠️ Requires ChromaDB | Python, ChromaDB, Google AI | ~500 |

---

## 🏗️ Architecture Overview

### Dual-Runtime Architecture

```
┌─────────────────────────────────────┐
│    Python Agent Runtime (:8000)     │
│  ┌───────────────────────────────┐  │
│  │  agent/main.py                │  │
│  │  - Tool definitions           │  │
│  │  - State management           │  │
│  │  - Lifecycle hooks            │  │
│  └───────────────────────────────┘  │
└─────────────────┬───────────────────┘
                  │ HTTP / AG-UI Client
                  ▼
┌─────────────────────────────────────┐
│    React UI Runtime (:3000)         │
│  ┌───────────────────────────────┐  │
│  │  src/app/page.tsx             │  │
│  │  - GenerativeCanvas           │  │
│  │  - Component Registry         │  │
│  │  - CopilotSidebar             │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Key Independence Boundaries

1. **Knowledge Base System** (`scripts/knowledge-management/`)
   - No dependencies on GenUI or agent runtime
   - Can be ported to any GitHub repo with issues
   - Only requires: Node.js 22+, TypeScript

2. **Component Registry** (`src/components/registry/`)
   - Standalone React components
   - No ADK/agent coupling (just expects props)
   - Can be used in any React 19+ project

3. **Toolset Management** (`agent/toolsets.json`, `scripts/toolset-management/`)
   - JSON-based configuration
   - Can manage any tool registry
   - Validation scripts are standalone

4. **Schema Crawler** (`agent-generator/src/mcp-registry/schema-crawler.ts`)
   - Converts JSON Schema → Zod + TypeScript
   - Usable in any TypeScript project
   - Zero runtime deps (only Zod peer dependency)

---

## 📦 Portable Components

### 1. Knowledge Base Context Mapper

**Location**: `scripts/knowledge-management/`

**What It Does**: Semantic issue enrichment - analyzes GitHub issue text, detects concepts, suggests labels, links files/docs.

**Port to Another Repo**:

```bash
# 1. Copy directory
cp -r scripts/knowledge-management /target/project/scripts/

# 2. Update KNOWLEDGE_BASE in issue-context-mapper.ts
#    - Edit concepts to match target repo
#    - Update file paths
#    - Update documentation links

# 3. Install dependencies
cd /target/project/scripts/knowledge-management
npm install

# 4. Update GitHub Actions workflow
#    - Copy .github/workflows/issue-labeler.yml steps
#    - Integrate KB analysis step

# 5. Test
npm test
```

**Dependencies**:
```json
{
  "@types/node": "^20.10.0",
  "typescript": "^5.3.3"
}
```

**Customization Points**:
- `KNOWLEDGE_BASE` constant (line 35-238 in issue-context-mapper.ts)
- Label suggestion logic (line 276-290)
- Test cases (test-kb-mapper.js)

**Benefits for Target Repo**:
- Automatic issue tagging
- Context-aware issue comments
- File/doc linking
- Concept detection (customizable)

---

### 2. Component Registry (React)

**Location**: `src/components/registry/`

**What It Does**: Reusable GenUI molecules (StatCard, DataTable, ChartCard) with Zod validation.

**Port to Another React Project**:

```bash
# 1. Copy registry directory
cp -r src/components/registry /target/project/src/components/

# 2. Copy types
cp src/lib/types.ts /target/project/src/lib/

# 3. Install peer dependencies
npm install zod @mui/material

# 4. Use in your app
import { StatCard } from '@/components/registry/StatCard';

<StatCard title="Revenue" value={120000} trend="+12%" trendDirection="up" />
```

**Dependencies**:
```json
{
  "react": "^19.0.0",
  "zod": "^3.23.0",
  "@mui/material": "^5.15.0" // optional
}
```

**Components Available**:
- `StatCard.tsx` - Metric cards with trends
- `DataTable.tsx` - Data grids
- `ChartCard.tsx` - Chart wrappers

**Customization**:
- Styling (Tailwind/MUI classes)
- Validation schemas (Zod)
- Prop interfaces

---

### 3. Toolset Management System

**Location**: `agent/toolsets.json`, `scripts/toolset-management/`

**What It Does**: Manages tool registries with deprecation aliases, validation, documentation generation.

**Port to Another Project**:

```bash
# 1. Copy toolset files
cp agent/toolsets.json /target/project/config/
cp agent/toolset_aliases.json /target/project/config/
cp -r scripts/toolset-management /target/project/scripts/

# 2. Update toolsets.json to match target tools
vim /target/project/config/toolsets.json

# 3. Validate
cd /target/project/scripts/toolset-management
npm install ajv ajv-formats
node validate-toolsets.js

# 4. Generate docs
node sync-docs.js
```

**Benefits**:
- Tool versioning and deprecation
- Backward-compatible aliases
- Automatic documentation generation
- JSON schema validation

**Workflows Included**:
- `toolset-validate.yml` - Validation on PR
- `toolset-deprecate.yml` - Deprecation workflow
- `toolset-update.yml` - Auto-detect new tools

---

### 4. Schema Crawler

**Location**: `agent-generator/src/mcp-registry/schema-crawler.ts`

**What It Does**: Converts JSON Schema → Zod validation + TypeScript types.

**Port to TypeScript Project**:

```bash
# 1. Copy schema crawler
cp agent-generator/src/mcp-registry/schema-crawler.ts /target/project/scripts/

# 2. Install dependencies
npm install zod typescript

# 3. Use in your project
import { generateZodFromJSONSchema } from './scripts/schema-crawler';

const zodSchema = generateZodFromJSONSchema(myJsonSchema, "MyType");
```

**Use Cases**:
- MCP tool type safety
- API validation
- Form validation
- Configuration validation

**See**: [agent-generator/SCHEMA_CRAWLER_README.md](agent-generator/SCHEMA_CRAWLER_README.md)

---

### 5. GenAI Toolbox

**Location**: `genai-toolbox/tools.yaml`

**What It Does**: YAML-based tool registry for GenAI systems.

**Port to Another Project**:

```bash
# 1. Copy toolbox
cp genai-toolbox/tools.yaml /target/project/config/

# 2. Update tool definitions
vim /target/project/config/tools.yaml

# 3. Use with your GenAI framework
```

**Format**:
```yaml
tools:
  - name: my_tool
    description: Tool description
    parameters:
      - name: param1
        type: string
        required: true
```

---

### 6. ChromaDB Indexing

**Location**: `scripts/ingest_chunks.py`, `scripts/start_chroma_server.py`

**What It Does**: Semantic code indexing with Google Gemini embeddings + ChromaDB.

**Port to Another Codebase**:

```bash
# 1. Copy scripts
cp scripts/ingest_chunks.py /target/project/scripts/
cp scripts/start_chroma_server.py /target/project/scripts/

# 2. Install dependencies
pip install chromadb google-generativeai

# 3. Set API key
export GOOGLE_API_KEY="your-key"

# 4. Generate chunks (use pykomodo or similar)
# ... generate chunks.jsonl

# 5. Ingest
python scripts/ingest_chunks.py --mode persistent \
  --persist-dir ./chroma_data \
  --chunks-file chunks.jsonl
```

**Use Cases**:
- Semantic code search
- RAG for codebase Q&A
- Code recommendation systems

---

## 🔗 Integration Patterns

### Pattern 1: Standalone Knowledge Base

**Target**: Any GitHub repo with issues

**Steps**:
1. Copy `scripts/knowledge-management/` directory
2. Update `KNOWLEDGE_BASE` constant with repo-specific concepts
3. Add workflow step to `.github/workflows/`
4. Create test cases for repo-specific concepts
5. Deploy

**No Dependencies On**: GenUI, agent runtime, CopilotKit

---

### Pattern 2: Component Registry + Custom Backend

**Target**: React app with custom state management (Redux, MobX, etc.)

**Steps**:
1. Copy `src/components/registry/` directory
2. Adapt props interfaces to your state shape
3. Remove CopilotKit-specific props if not using
4. Use components with your state management

**Example**:
```typescript
// Original (CopilotKit)
const { state } = useCoAgent<AgentState>({ name: "WorkbenchAgent" });

// Your app (Redux)
const elements = useSelector(state => state.canvas.elements);
```

---

### Pattern 3: Toolset Management for MCP Servers

**Target**: MCP server project with multiple tools

**Steps**:
1. Copy `agent/toolsets.json` structure
2. Define your MCP tools as toolsets
3. Use validation scripts for CI/CD
4. Generate documentation with sync scripts

**Example Toolset**:
```json
{
  "id": "weather_tools",
  "name": "Weather Tools",
  "tools": ["get_weather", "get_forecast"],
  "metadata": {
    "category": "external_apis",
    "requires": ["OPENWEATHER_API_KEY"]
  }
}
```

---

### Pattern 4: Schema Crawler for API Clients

**Target**: TypeScript API client with runtime validation

**Steps**:
1. Copy `schema-crawler.ts`
2. Generate Zod schemas from OpenAPI/JSON Schema
3. Use in API client for request/response validation
4. Export TypeScript types for consumers

**Example**:
```typescript
// 1. Generate schema
const weatherSchema = generateZodFromJSONSchema(openApiSchema, "WeatherResponse");

// 2. Use in API client
async function getWeather(city: string): Promise<WeatherResponse> {
  const response = await fetch(`/api/weather?city=${city}`);
  const data = await response.json();
  
  // Runtime validation
  return weatherSchema.zodCode.parse(data);
}
```

---

## 📊 Dependency Map

### Knowledge Base System

```
scripts/knowledge-management/
├── issue-context-mapper.ts ───┐
├── test-kb-mapper.js          │
├── package.json               │
└── tsconfig.json              │
                               │
    Zero External Dependencies │
    (only Node.js built-ins)   │
                               │
    Required:                  │
    - Node.js 22+             │
    - TypeScript 5.3+         │
```

### Component Registry

```
src/components/registry/
├── StatCard.tsx ───────────┐
├── DataTable.tsx           │
└── ChartCard.tsx           │
                            │
    Peer Dependencies:      │
    - React 19+            │
    - Zod 3.23+            │
    - (Optional) MUI 5+    │
                            │
    Couples to:             │
    - src/lib/types.ts     │
```

### Toolset Management

```
agent/
├── toolsets.json ──────────┐
├── toolset_aliases.json    │
└── toolset_manager.py      │
                            │
scripts/toolset-management/ │
├── validate-toolsets.js    │
├── sync-docs.js           │
└── generate-diagram.js     │
                            │
    Dependencies:           │
    - ajv (JSON validation)│
    - (Optional) Python 3+ │
```

### ChromaDB Indexing

```
scripts/
├── ingest_chunks.py ───────┐
└── start_chroma_server.py  │
                            │
    Dependencies:           │
    - chromadb             │
    - google-generativeai  │
    - Python 3.12+         │
                            │
    External Services:      │
    - Google Gemini API    │
    - (Optional) ChromaDB  │
      HTTP server          │
```

---

## ✅ Migration Checklist

### Pre-Migration

- [ ] Identify target components (KB, Registry, Toolsets, etc.)
- [ ] Review dependencies for target project compatibility
- [ ] Check Node.js/Python versions
- [ ] Review API keys needed (Google Gemini, etc.)
- [ ] Plan integration points

### During Migration

- [ ] Copy relevant directories
- [ ] Update file paths in configuration
- [ ] Update import statements
- [ ] Customize constants (KNOWLEDGE_BASE, toolsets, etc.)
- [ ] Install dependencies
- [ ] Run validation scripts
- [ ] Update documentation

### Post-Migration

- [ ] Run tests
- [ ] Verify GitHub Actions workflows (if applicable)
- [ ] Test ChromaDB ingestion (if applicable)
- [ ] Generate documentation
- [ ] Create PR with changes
- [ ] Monitor first production run

---

## 🎯 Common Porting Scenarios

### Scenario 1: Port KB to Enterprise Monorepo

**Challenge**: Large codebase with many concepts, custom CI/CD

**Solution**:
1. Expand `KNOWLEDGE_BASE` to 20+ concepts
2. Create hierarchical concept structure (parent/child relationships)
3. Integrate with existing CI/CD (Jenkins, GitLab CI, etc.)
4. Use KB JSON output for external systems (Jira, Slack, etc.)

**Customizations**:
```typescript
// Add hierarchical concepts
const KNOWLEDGE_BASE = {
  "Backend": {
    keywords: ["api", "server", "backend"],
    relatedConcepts: ["API Routes", "Database", "Authentication"]
  },
  "API Routes": {
    keywords: ["endpoint", "route", "/api/"],
    parentConcept: "Backend"
  }
};
```

---

### Scenario 2: Port Component Registry to Design System

**Challenge**: Need branded components with Storybook integration

**Solution**:
1. Copy registry components
2. Wrap with design system theme provider
3. Add Storybook stories
4. Export as NPM package

**Example**:
```typescript
// packages/design-system/src/StatCard.tsx
import { StatCard as BaseStatCard } from './registry/StatCard';
import { ThemeProvider } from '@company/theme';

export const StatCard = (props) => (
  <ThemeProvider>
    <BaseStatCard {...props} />
  </ThemeProvider>
);
```

---

### Scenario 3: Port ChromaDB Indexing to Data Pipeline

**Challenge**: Batch processing, scheduled updates, multiple collections

**Solution**:
1. Copy `ingest_chunks.py`
2. Add batch processing logic
3. Integrate with Airflow/Prefect
4. Create multiple collections for different purposes

**Example**:
```python
# airflow_dag.py
from airflow import DAG
from airflow.operators.python import PythonOperator

def ingest_code_chunks():
    from ingest_chunks import main
    main(mode="http", host="chromadb.internal", port=8001)

dag = DAG("code_indexing", schedule_interval="@daily")
ingest_task = PythonOperator(task_id="ingest", python_callable=ingest_code_chunks, dag=dag)
```

---

### Scenario 4: Port Toolset Management to MCP Server

**Challenge**: Multiple MCP tools, versioning, backward compatibility

**Solution**:
1. Copy toolset management system
2. Map MCP tools to toolsets
3. Use aliases for deprecated tools
4. Generate MCP-compatible JSON from toolsets

**Example**:
```python
# mcp_server.py
from toolset_manager import initialize_toolsets, get_toolset

initialize_toolsets()

@mcp.tool()
def my_tool(params):
    toolset = get_toolset("my_toolset")  # Handles aliases automatically
    # ... tool implementation
```

---

## 🔧 Configuration Templates

### Minimal KB Configuration

```typescript
// issue-context-mapper.ts
const KNOWLEDGE_BASE: Record<string, ConceptMapping> = {
  "Bug": {
    keywords: ["bug", "error", "crash", "broken"],
    files: [{ path: "src/", description: "Source code" }],
    documentation: ["docs/TROUBLESHOOTING.md"],
    relatedConcepts: []
  },
  "Feature": {
    keywords: ["feature", "enhancement", "new"],
    files: [{ path: "docs/FEATURES.md", description: "Feature docs" }],
    documentation: ["docs/CONTRIBUTING.md"],
    relatedConcepts: []
  }
};
```

### Minimal Toolset Configuration

```json
{
  "$schema": "./toolset-schema.json",
  "version": "1.0.0",
  "toolsets": [
    {
      "id": "core",
      "name": "Core Tools",
      "tools": ["tool_1", "tool_2"],
      "default": true
    }
  ]
}
```

---

## 📚 Additional Resources

- **[CODEBASE_INDEX.md](CODEBASE_INDEX.md)** - Complete searchable index
- **[COMPONENT_MANIFEST.json](COMPONENT_MANIFEST.json)** - Machine-readable component registry
- **[docs/KNOWLEDGE_BASE_INTEGRATION.md](docs/KNOWLEDGE_BASE_INTEGRATION.md)** - KB implementation details
- **[docs/TOOLSET_MANAGEMENT.md](docs/TOOLSET_MANAGEMENT.md)** - Toolset system docs
- **[agent-generator/SCHEMA_CRAWLER_README.md](agent-generator/SCHEMA_CRAWLER_README.md)** - Schema crawler guide

---

## 🆘 Support

For porting questions:
1. Check [CODEBASE_INDEX.md](CODEBASE_INDEX.md) for component details
2. Review component-specific README files
3. See [docs/](docs/) for architecture documentation
4. File issue with `porting` label

---

## 📄 License

All portable components maintain original project license (see [LICENSE](LICENSE)).

When porting:
- ✅ Copy license file
- ✅ Preserve copyright notices
- ✅ Attribute original authors
- ✅ Follow license terms

---

*This guide enables modular porting of ModMe GenUI Workbench components into other projects. Each component is designed for independence and reusability.*

**Version**: 1.0.0 | **Last Updated**: January 3, 2026
