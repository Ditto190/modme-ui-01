# ModMe GenUI Workbench - Complete Codebase Index

> **Searchable inventory of all code, components, and documentation**

**Generated**: January 3, 2026  
**Repository**: modme-ui-01  
**Purpose**: Enable navigation, chunking, and porting

---

## 📚 Table of Contents

1. [Quick Navigation](#quick-navigation)
2. [Directory Structure](#directory-structure)
3. [Entry Points](#entry-points)
4. [Component Catalog](#component-catalog)
5. [Module Dependencies](#module-dependencies)
6. [API Contracts](#api-contracts)
7. [Configuration Files](#configuration-files)
8. [Documentation Index](#documentation-index)

---

## 🚀 Quick Navigation

### By Category

| Category                       | Directory            | File Count | Lines of Code |
| ------------------------------ | -------------------- | ---------- | ------------- |
| **Python Agent**               | `agent/`             | 5          | ~1,200        |
| **TypeScript Agent Generator** | `agent-generator/`   | 15+        | ~2,500        |
| **React Frontend**             | `src/`               | 12+        | ~1,800        |
| **Scripts & Utilities**        | `scripts/`           | 20+        | ~3,500        |
| **Documentation**              | `docs/`              | 12+        | ~8,000        |
| **GitHub Workflows**           | `.github/workflows/` | 8+         | ~1,200        |
| **Configuration**              | Root                 | 10+        | ~800          |

### By Technology

| Technology     | Primary Directories                                         | Purpose                              |
| -------------- | ----------------------------------------------------------- | ------------------------------------ |
| **Python**     | `agent/`, `scripts/`                                        | ADK agent, ChromaDB ingestion, tools |
| **TypeScript** | `agent-generator/`, `src/`, `scripts/knowledge-management/` | Code generation, frontend, KB system |
| **React**      | `src/app/`, `src/components/`                               | GenUI interface, component registry  |
| **Next.js**    | `src/app/`                                                  | App router, API routes               |
| **JSON/YAML**  | `agent/`, `genai-toolbox/`                                  | Configuration, toolsets, GenAI tools |

---

## 📁 Directory Structure

### Root Level

```
modme-ui-01/
├── .copilot/                   # Copilot templates and configurations
│   └── templates/
│       └── component-template.tsx    # React component scaffold
│
├── .github/                    # GitHub Actions workflows
│   ├── ISSUE_TEMPLATE/        # Issue templates (4 files)
│   └── workflows/             # CI/CD workflows (8+ files)
│
├── .config/                                  # NEW
│   ├── README.md                             # Shell integration comprehensive guide
│   ├── QUICKSTART.md                         # Quick reference guide
│   ├── powershell/                           # PowerShell project profile
│   │   └── Microsoft.PowerShell_profile.ps1  # Project PowerShell profile
│   └── bash/                                 # Bash project profile
│       └── bashrc                            # Project bashrc
│
├── .vscode/                                  # VS Code folder settings
│   └── settings.json                         # VS Code workspace settings (shell integration)
│
├── agent/                      # Python ADK agent runtime
│   ├── main.py                # Main agent entry point (420 lines)
│   ├── toolset_manager.py     # Toolset lifecycle manager (350 lines)
│   ├── toolsets.json          # Tool registry (100 lines)
│   ├── toolset_aliases.json   # Deprecation aliases (50 lines)
│   ├── toolset-schema.json    # JSON schema for toolsets (280 lines)
│   ├── pyproject.toml         # Python dependencies
│   └── tools/                 # Tool modules
│       └── schema_crawler_tool.py  # JSON Schema → Zod converter (270 lines)
│
├── agent-generator/            # TypeScript code generation system
│   ├── package.json
│   ├── tsconfig.json
│   ├── SCHEMA_CRAWLER_README.md  # (3,800 lines)
│   ├── output/                # Generated code output
│   │   ├── agent_prompt.md
│   │   └── tools_schema.json
│   └── src/
│       ├── mcp-registry/      # MCP integration layer
│       │   ├── schema-crawler.ts        # (600 lines)
│       │   ├── molecule-generator.ts    # (450 lines)
│       │   ├── registry-fetcher.ts      # (320 lines)
│       │   ├── ARCHITECTURE_DIAGRAM.md
│       │   ├── INTEGRATION_QUICKSTART.md
│       │   └── MCP_INTEGRATION_PLAN.md
│       ├── scripts/
│       │   └── generate.ts    # Code generation script
│       ├── skills/            # 13+ skill directories
│       │   ├── algorithmic-art/
│       │   ├── brand-guidelines/
│       │   ├── docx/
│       │   ├── internal-comms/
│       │   ├── mcp-builder/
│       │   ├── pdf/
│       │   ├── pptx/
│       │   ├── skill-creator/
│       │   ├── theme-factory/
│       │   ├── weather/
│       │   ├── web-artifacts-builder/
│       │   └── xlsx/
│       └── tools/
│           └── weather.ts
│
├── docs/                       # Comprehensive documentation
│   ├── KNOWLEDGE_BASE_INTEGRATION.md     # (750 lines)
│   ├── KB_IMPLEMENTATION_SUMMARY.md      # (450 lines)
│   ├── KB_QUICK_REFERENCE.md             # (200 lines)
│   ├── KB_TEST_FIX.md                    # (80 lines)
│   ├── KB_MEMORY_GRAPH.md                # (3,000 lines)
│   ├── KNOWLEDGE_MANAGEMENT.md           # (800 lines)
│   ├── KNOWLEDGE_QUICKSTART.md           # (400 lines)
│   ├── MCP_EVERYTHING_SERVER.md          # (650 lines)
│   ├── REFACTORING_PATTERNS.md           # (1,200 lines)
│   ├── TOOLSET_MANAGEMENT.md             # (900 lines)
│   ├── TOOLSET_QUICKSTART.md             # (600 lines)
│   └── toolsets/              # Toolset documentation
│       ├── README.md
│       ├── theme.md
│       ├── toolset-relationships.mmd
│       └── ui_elements.md
│
├── genai-toolbox/             # GenAI tools configuration
│   └── tools.yaml             # (150 lines)
│
├── prompts/                   # AI agent prompts
│   └── copilot/
│       ├── 01_molecules.md
│       └── 02_tools_and_routes.md
│
├── public/                    # Static assets
│
├── scripts/                   # Utility scripts
│   ├── knowledge-management/  # KB system scripts
│   │   ├── issue-context-mapper.ts    # (420 lines)
│   │   ├── test-kb-mapper.js          # (140 lines)
│   │   ├── sync-docs.js               # (200 lines)
│   │   ├── generate-diagram.js        # (180 lines)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md                  # (550 lines)
│   │
│   ├── toolset-management/    # Toolset lifecycle scripts
│   │   ├── detect-toolset-changes.js  # (250 lines)
│   │   ├── validate-toolsets.js       # (320 lines)
│   │   ├── create-alias.js            # (180 lines)
│   │   ├── generate-migration-guide.js # (200 lines)
│   │   └── README.md
│   │
│   ├── ingest_chunks.py       # ChromaDB ingestion (490 lines)
│   ├── start_chroma_server.py # ChromaDB HTTP server
│   ├── local_vault.py         # Secret management
│   ├── add_github_mcp.ps1
│   ├── check_github_mcp_alignment.ps1
│   ├── health-check.sh
│   ├── print_mcp_servers.ps1
│   ├── remove_mcp_entries.ps1
│   ├── run-agent.bat
│   ├── run-agent.sh
│   ├── setup-agent.bat
│   ├── setup-agent.sh
│   ├── setup.ps1
│   ├── setup.sh
│   ├── start-dev.sh
│   ├── start-mcp-servers.ps1
│   ├── start-mcp-servers.sh
│   ├── sync-env-to-claude-settings.ps1
│   └── verify_github_mcp.ps1
│
├── src/                       # React/Next.js frontend
│   ├── app/                   # Next.js app router
│   │   ├── page.tsx           # Main canvas page (180 lines)
│   │   ├── layout.tsx         # Root layout (60 lines)
│   │   ├── globals.css        # Global styles (120 lines)
│   │   ├── api/
│   │   │   └── copilotkit/
│   │   │       └── route.ts   # CopilotKit API route (30 lines)
│   │   └── canvas/
│   │       └── GenerativeCanvas.tsx  # Chat+ canvas (80 lines)
│   │
│   ├── components/
│   │   ├── proverbs.tsx
│   │   ├── weather.tsx
│   │   └── registry/          # Component registry
│   │       ├── StatCard.tsx   # (120 lines)
│   │       ├── DataTable.tsx  # (180 lines)
│   │       └── ChartCard.tsx  # (150 lines)
│   │
│   ├── lib/
│   │   └── types.ts           # Type definitions (50 lines)
│   │
│   └── prompts/
│       └── copilot/
│
├── templates/                 # Documentation templates
│   ├── toolset-full.md.hbs
│   └── toolset-single.md.hbs
│
└── test-mcp-validation/       # MCP validation tests
    └── test-file.txt

# Configuration Files (Root)
├── CONTRIBUTING.md
├── DEVCONTAINER_SETUP.md
├── eslint.config.mjs
├── GITHUB_MCP_INSTALL.md
├── IMPLEMENTATION_SUMMARY.md
├── INSTALLATION_CHECKLIST.md
├── LICENSE
├── next-env.d.ts
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── Project_Overview.md
├── README.md
├── REFACTORING_APPLIED_2026-01-03.md
├── SESSION_SUMMARY_2026-01-03.md
├── SETUP_RECORD.md
├── TOOLSET_README.md
├── tsconfig.json
└── workspace.code-workspace
```

---

## 🎯 Entry Points

### 1. Frontend Application

**Main Entry**: `src/app/page.tsx`

```typescript
// Primary export
export default function CopilotKitPage() {
  // CopilotSidebar + GenerativeCanvas
  // Reads state from Python agent via useCoAgent
}
```

**Key Functions**:

- `YourMainContent()` - Renders canvas with elements
- `renderElement(el: UIElement)` - Component registry router
- `useFrontendTool()` - Theme color management

**Imports**:

- `@copilotkit/react-core` - Agent orchestration
- `@copilotkit/react-ui` - CopilotSidebar
- `@/lib/types` - TypeScript types
- `@/components/registry/*` - UI components

**API Route**: `src/app/api/copilotkit/route.ts`

- Bridges CopilotKit runtime ← → Python agent (localhost:8000)
- Uses `HttpAgent` from `@ag-ui/client`

---

### 2. Python Agent

**Main Entry**: `agent/main.py`

```python
# Primary exports
workbench_agent = LlmAgent(...)  # Google ADK agent
adk_agent = ADKAgent(...)        # AG-UI wrapper
app = FastAPI(...)               # FastAPI app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**Key Functions**:

- `upsert_ui_element()` - Add/update UI element
- `remove_ui_element()` - Remove UI element
- `clear_canvas()` - Clear all elements
- `before_model_modifier()` - Inject canvas state into prompt
- `after_model_modifier()` - Stop consecutive tool calls
- `health_check()` - Liveness probe
- `readiness_check()` - Readiness probe with toolset info

**Tools Available**:

```python
ALLOWED_TYPES = {"StatCard", "DataTable", "ChartCard"}
```

**State Contract**:

```python
tool_context.state["elements"] = [
    {"id": str, "type": str, "props": dict}
]
```

---

### 3. Knowledge Base System

**Main Entry**: `scripts/knowledge-management/issue-context-mapper.ts`

```typescript
// Primary exports
export interface KnowledgeBaseAnalysis { ... }
export function analyzeIssue(issueText: string): KnowledgeBaseAnalysis
```

**CLI Usage**:

```bash
node issue-context-mapper.js "issue text here"
# Outputs JSON with concepts, labels, files, docs
```

**Workflow Integration**:

- `.github/workflows/issue-labeler.yml` calls script
- Parses stdout JSON
- Posts comment to issue with KB analysis

---

### 4. Toolset Management

**Main Entry**: `agent/toolset_manager.py`

```python
# Primary exports
def initialize_toolsets()
def list_available_toolsets()
def get_toolset(name: str)
def is_deprecated(name: str)
```

**Validation**: `scripts/toolset-management/validate-toolsets.js`

```bash
node scripts/toolset-management/validate-toolsets.js
# Validates agent/toolsets.json against schema
```

---

### 5. ChromaDB Indexing

**Main Entry**: `scripts/ingest_chunks.py`

```bash
python scripts/ingest_chunks.py \
  --mode persistent \
  --persist-dir ./chroma_data \
  --chunks-file chunks.jsonl \
  --embedding-dim 768
```

**Key Functions**:

- `configure_genai()` - Setup Google Gemini API
- `get_chroma_client()` - Initialize ChromaDB client
- `embed_texts()` - Generate embeddings (single)
- `embed_texts_batch()` - Generate embeddings (batch)
- `ingest_to_collection()` - Ingest chunks into collection

**Collections Created**:

- `code_index` - Source code chunks
- `agent_tools` - Agent tool definitions
- `documentation` - Markdown docs
- `workflows` - GitHub Actions YAML

---

### 6. Schema Crawler

**Main Entry**: `agent-generator/src/mcp-registry/schema-crawler.ts`

```typescript
// Primary exports
export function generateZodFromJSONSchema(schema, typeName);
export function generateZodModule(toolName, inputSchema, outputSchema);
export function generateZodModulesBatch(tools);
export function generateSchemaFileStructure(serverName, tools);
```

**Usage**:

```typescript
import { generateZodModule } from "./schema-crawler";

const module = generateZodModule("getWeather", inputSchema, outputSchema);
fs.writeFileSync("schemas/getWeather.schema.ts", module);
```

---

## 📦 Component Catalog

### React Components

#### 1. StatCard

**Location**: `src/components/registry/StatCard.tsx` (120 lines)

**Purpose**: Metric display card with trends

**Props**:

```typescript
interface StatCardProps {
  title: string; // Card title
  value: string | number; // Main metric value
  trend?: string; // Trend indicator (e.g., "+12%")
  trendDirection?: "up" | "down"; // Trend direction
}
```

**Dependencies**:

- `zod` - Runtime validation
- (Optional) `@mui/material` - Styling

**Example**:

```typescript
<StatCard
  title="Revenue"
  value={120000}
  trend="+12%"
  trendDirection="up"
/>
```

---

#### 2. DataTable

**Location**: `src/components/registry/DataTable.tsx` (180 lines)

**Purpose**: Data grid / table component

**Props**:

```typescript
interface DataTableProps {
  columns: string[]; // Column headers
  data: object[]; // Row data
  pageSize?: number; // Rows per page (default: 10)
  sortable?: boolean; // Enable sorting (default: true)
}
```

**Features**:

- Sorting
- Pagination
- Column filtering
- Responsive design

**Example**:

```typescript
<DataTable
  columns={["Name", "Email", "Plan"]}
  data={[
    { name: "Alice", email: "alice@example.com", plan: "Pro" },
    { name: "Bob", email: "bob@example.com", plan: "Free" }
  ]}
/>
```

---

#### 3. ChartCard

**Location**: `src/components/registry/ChartCard.tsx` (150 lines)

**Purpose**: Chart wrapper component

**Props**:

```typescript
interface ChartCardProps {
  title: string; // Chart title
  chartType: "line" | "bar" | "pie"; // Chart type
  data: object[]; // Chart data
  xKey?: string; // X-axis key (default: "x")
  yKey?: string; // Y-axis key (default: "y")
}
```

**Dependencies**:

- (Optional) `recharts` or `chart.js`

**Example**:

```typescript
<ChartCard
  title="Weekly Growth"
  chartType="line"
  data={[
    { week: "W1", revenue: 1000 },
    { week: "W2", revenue: 1200 }
  ]}
  xKey="week"
  yKey="revenue"
/>
```

---

#### 4. GenerativeCanvas

**Location**: `src/app/canvas/GenerativeCanvas.tsx` (80 lines)

**Purpose**: Chat+ style persistent canvas for GenUI

**Props**:

```typescript
interface GenerativeCanvasProps {
  children: React.ReactNode; // Rendered elements
}
```

**Features**:

- Scrollable canvas
- Responsive layout
- Integrates with CopilotSidebar

---

### Python Agent Tools

#### 1. upsert_ui_element

**Location**: `agent/main.py:40-75`

**Purpose**: Add or update UI element on canvas

**Parameters**:

```python
def upsert_ui_element(
    tool_context: ToolContext,
    id: str,                    # Unique element ID
    type: str,                  # Component type (StatCard, DataTable, ChartCard)
    props: Dict[str, Any]       # Component props (JSON-serializable)
) -> Dict[str, str]
```

**Returns**:

```python
{"status": "success", "message": "Element 'X' of type 'Y' added/updated.", "element_count": N}
```

**Validation**:

- ID must be non-empty string
- Type must be in `ALLOWED_TYPES`
- Props must be dict

---

#### 2. remove_ui_element

**Location**: `agent/main.py:77-100`

**Purpose**: Remove UI element from canvas

**Parameters**:

```python
def remove_ui_element(
    tool_context: ToolContext,
    id: str                     # Element ID to remove
) -> Dict[str, str]
```

**Returns**:

```python
{"status": "success", "message": "Element 'X' removed.", "element_count": N}
```

---

#### 3. clear_canvas

**Location**: `agent/main.py:102-105`

**Purpose**: Remove all elements from canvas

**Parameters**:

```python
def clear_canvas(
    tool_context: ToolContext
) -> Dict[str, str]
```

**Returns**:

```python
{"status": "success", "message": "Canvas cleared."}
```

---

### TypeScript Utilities

#### 1. issue-context-mapper

**Location**: `scripts/knowledge-management/issue-context-mapper.ts`

**Purpose**: Analyze GitHub issue text for semantic enrichment

**Exports**:

```typescript
export interface KnowledgeBaseAnalysis {
  concepts: string[];
  labels: string[];
  relatedFiles: Array<{ path: string; description: string }>;
  relatedDocs: string[];
}

export function analyzeIssue(issueText: string): KnowledgeBaseAnalysis;
```

**Usage**:

```typescript
const analysis = analyzeIssue("Agent fails to render ChartCard");
// concepts: ["Agent Tools"]
// labels: ["agent", "tools", "enhancement"]
// relatedFiles: ["agent/main.py", "src/components/registry/ChartCard.tsx"]
```

---

#### 2. schema-crawler

**Location**: `agent-generator/src/mcp-registry/schema-crawler.ts`

**Purpose**: Convert JSON Schema → Zod + TypeScript

**Exports**:

```typescript
export interface ZodSchemaOutput {
  zodCode: string; // Zod schema code
  typeDefinition: string; // TypeScript interface
  validatorCode: string; // Validator functions
}

export function generateZodFromJSONSchema(schema: JSONSchema, typeName: string): ZodSchemaOutput;
```

**Usage**:

```typescript
const result = generateZodFromJSONSchema(
  {
    type: "object",
    properties: {
      city: { type: "string", minLength: 2 },
    },
  },
  "WeatherInput"
);

console.log(result.zodCode);
// z.object({ city: z.string().min(2) })
```

---

## 🔗 Module Dependencies

### Dependency Graph

```
Frontend (src/app/page.tsx)
    ├── @copilotkit/react-core      (Agent orchestration)
    ├── @copilotkit/react-ui        (CopilotSidebar)
    ├── @/lib/types                 (Type definitions)
    └── @/components/registry/*     (UI components)
            ├── StatCard.tsx
            ├── DataTable.tsx
            └── ChartCard.tsx
                    └── zod         (Runtime validation)

Python Agent (agent/main.py)
    ├── google.adk.agents           (LlmAgent, ToolContext)
    ├── ag_ui_adk                   (ADKAgent)
    ├── fastapi                     (FastAPI, JSONResponse)
    └── toolset_manager             (Toolset lifecycle)

Knowledge Base (scripts/knowledge-management/)
    └── Node.js built-ins only
        (fs, path)

Toolset Management (scripts/toolset-management/)
    ├── ajv                         (JSON validation)
    └── ajv-formats                 (JSON Schema formats)

ChromaDB Indexing (scripts/ingest_chunks.py)
    ├── chromadb                    (Vector database)
    ├── google.generativeai         (Gemini embeddings)
    └── pykomodo (optional)         (Code chunking)
```

### Internal Dependencies

```
src/app/page.tsx
    └── imports src/lib/types.ts
    └── imports src/components/registry/*.tsx

src/app/api/copilotkit/route.ts
    └── connects to agent/main.py (HTTP)

agent/main.py
    └── imports agent/toolset_manager.py

scripts/knowledge-management/issue-context-mapper.ts
    └── standalone (no internal deps)

agent-generator/src/mcp-registry/schema-crawler.ts
    └── standalone (no internal deps)
```

---

## 📜 API Contracts

### 1. Agent ↔ Frontend State Contract

**Python Side** (`agent/main.py`):

```python
tool_context.state["elements"] = [
    {"id": "revenue", "type": "StatCard", "props": {"title": "MRR", "value": 120000}},
    {"id": "users", "type": "DataTable", "props": {"columns": [...], "data": [...]}}
]
```

**TypeScript Side** (`src/lib/types.ts`):

```typescript
export type UIElement = {
  id: string; // Must match Python "id" key
  type: string; // Must match Python "type" key
  props: any; // Must match Python "props" key
};

export type AgentState = {
  elements: UIElement[]; // Must match Python "elements" key
};
```

**Critical**: Keys must match exactly. Python uses snake_case internally but exports match TypeScript camelCase.

---

### 2. Tool Response Format

**All agent tools return**:

```python
{
    "status": "success" | "error" | "warning",
    "message": str,
    "element_count": int (optional),
    # Additional context as needed
}
```

**Example Success**:

```python
{"status": "success", "message": "Element 'card1' of type 'StatCard' added.", "element_count": 3}
```

**Example Error**:

```python
{"status": "error", "message": "Invalid type 'InvalidCard'. Allowed: StatCard, DataTable, ChartCard"}
```

---

### 3. Knowledge Base Analysis Format

**Output** (`issue-context-mapper.ts`):

```json
{
  "concepts": ["Agent Tools", "State Sync"],
  "labels": ["agent", "tools", "state-management"],
  "relatedFiles": [
    { "path": "agent/main.py", "description": "Python ADK agent" },
    { "path": "src/lib/types.ts", "description": "State contract" }
  ],
  "relatedDocs": ["docs/REFACTORING_PATTERNS.md", ".github/copilot-instructions.md"]
}
```

---

### 4. Toolset JSON Schema

**Format** (`agent/toolsets.json`):

```json
{
  "$schema": "./toolset-schema.json",
  "version": "1.0.0",
  "updated": "ISO-8601 timestamp",
  "toolsets": [
    {
      "id": "ui_elements",
      "name": "UI Elements",
      "description": "Manage canvas UI components",
      "default": true,
      "icon": "paintbrush",
      "tools": ["upsert_ui_element", "remove_ui_element", "clear_canvas"],
      "metadata": {
        "status": "active" | "deprecated",
        "category": "generative_ui",
        "version": "1.0.0",
        "requires": [],
        "related_toolsets": []
      }
    }
  ]
}
```

---

### 5. ChromaDB Chunks Format

**Input** (`chunks.jsonl`):

```json
{"id": "chunk_001", "text": "function upsert_ui_element...", "metadata": {"file": "agent/main.py", "type": "function", "name": "upsert_ui_element"}}
{"id": "chunk_002", "text": "export function StatCard...", "metadata": {"file": "src/components/registry/StatCard.tsx", "type": "component", "name": "StatCard"}}
```

**Metadata Schema**:

```typescript
{
  file: string;               // Source file path
  type: "function" | "class" | "component" | "doc";
  name: string;               // Symbol name
  line_start?: number;
  line_end?: number;
  imports?: string[];
  exports?: string[];
}
```

---

## ⚙️ Configuration Files

### 1. package.json (Root)

**Location**: `package.json`

**Key Scripts**:

```json
{
  "dev": "next dev",
  "dev:agent": "cd agent && uv run uvicorn main:app --reload",
  "build": "next build",
  "lint": "next lint && cd agent && uv run ruff check .",
  "validate:toolsets": "node scripts/toolset-management/validate-toolsets.js",
  "docs:all": "node scripts/knowledge-management/generate-diagram.js && node scripts/knowledge-management/sync-docs.js"
}
```

**Dependencies**:

- `next`: 16.0.0
- `react`: 19.0.0
- `@copilotkit/react-core`: 1.50.0
- `@copilotkit/react-ui`: 1.50.0
- `zod`: 3.23.0

---

### 2. tsconfig.json (Root)

**Location**: `tsconfig.json`

**Target**: ES2022, Module: ESNext

**Path Aliases**:

```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

---

### 3. next.config.ts

**Location**: `next.config.ts`

**Key Config**:

```typescript
const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
};
```

---

### 4. pyproject.toml (Agent)

**Location**: `agent/pyproject.toml`

**Dependencies**:

```toml
[project]
dependencies = [
    "google-adk>=0.1.0",
    "ag-ui-adk>=0.1.0",
    "fastapi>=0.115.0",
    "uvicorn>=0.32.0",
    "python-dotenv>=1.0.0",
]
```

---

### 5. toolsets.json

**Location**: `agent/toolsets.json`

**Purpose**: Tool registry for Python agent

**Schema**: `agent/toolset-schema.json`

**Current Toolsets**:

- `ui_elements` - StatCard, DataTable, ChartCard
- `theme` - setThemeColor

---

### 6. .env.example

**Location**: `.env.example`

**Required Secrets**:

```bash
GOOGLE_API_KEY="your-gemini-api-key"
COPILOT_CLOUD_API_KEY=""  # Optional
```

---

## 📚 Documentation Index

### By Topic

| Topic                  | File                                                       | Lines | Purpose                |
| ---------------------- | ---------------------------------------------------------- | ----- | ---------------------- |
| **Knowledge Base**     | `docs/KNOWLEDGE_BASE_INTEGRATION.md`                       | 750   | Integration guide      |
|                        | `docs/KB_IMPLEMENTATION_SUMMARY.md`                        | 450   | Implementation details |
|                        | `docs/KB_QUICK_REFERENCE.md`                               | 200   | Quick reference        |
|                        | `docs/KB_MEMORY_GRAPH.md`                                  | 3,000 | Memory graph structure |
|                        | `docs/KNOWLEDGE_MANAGEMENT.md`                             | 800   | System overview        |
|                        | `docs/KNOWLEDGE_QUICKSTART.md`                             | 400   | Quick start guide      |
| **Toolset Management** | `docs/TOOLSET_MANAGEMENT.md`                               | 900   | Complete reference     |
|                        | `docs/TOOLSET_QUICKSTART.md`                               | 600   | Quick start            |
|                        | `TOOLSET_README.md`                                        | 450   | System overview        |
| **Refactoring**        | `docs/REFACTORING_PATTERNS.md`                             | 1,200 | Refactoring guide      |
| **Schema Crawler**     | `agent-generator/SCHEMA_CRAWLER_README.md`                 | 3,800 | Complete guide         |
| **MCP Integration**    | `docs/MCP_EVERYTHING_SERVER.md`                            | 650   | MCP server docs        |
|                        | `agent-generator/src/mcp-registry/MCP_INTEGRATION_PLAN.md` | 400   | Integration plan       |
| **Setup**              | `DEVCONTAINER_SETUP.md`                                    | 300   | Devcontainer guide     |
|                        | `INSTALLATION_CHECKLIST.md`                                | 250   | Installation steps     |
|                        | `SETUP_RECORD.md`                                          | 200   | Setup log              |
|                        | `GITHUB_MCP_INSTALL.md`                                    | 180   | GitHub MCP setup       |
| **Project**            | `Project_Overview.md`                                      | 1,500 | High-level vision      |
|                        | `README.md`                                                | 400   | Getting started        |
|                        | `CONTRIBUTING.md`                                          | 350   | Contribution guide     |

### Documentation Categories

#### 1. Getting Started

- `README.md` - Quick start
- `INSTALLATION_CHECKLIST.md` - Setup steps
- `DEVCONTAINER_SETUP.md` - Devcontainer guide

#### 2. Knowledge Base System

- `docs/KNOWLEDGE_BASE_INTEGRATION.md` - How to integrate
- `docs/KB_IMPLEMENTATION_SUMMARY.md` - Implementation decisions
- `docs/KB_QUICK_REFERENCE.md` - Cheat sheet
- `docs/KNOWLEDGE_MANAGEMENT.md` - System design
- `docs/KNOWLEDGE_QUICKSTART.md` - 5-minute start

#### 3. Toolset Management

- `docs/TOOLSET_MANAGEMENT.md` - Complete guide
- `docs/TOOLSET_QUICKSTART.md` - Quick start
- `TOOLSET_README.md` - Overview
- `docs/toolsets/` - Individual toolset docs

#### 4. Development

- `docs/REFACTORING_PATTERNS.md` - Refactoring guide
- `.github/copilot-instructions.md` - AI agent instructions
- `prompts/copilot/` - AI prompts

#### 5. Architecture

- `Project_Overview.md` - Vision and architecture
- `agent-generator/src/mcp-registry/ARCHITECTURE_DIAGRAM.md` - MCP architecture
- `docs/KB_MEMORY_GRAPH.md` - Knowledge graph structure

#### 6. Tools & Utilities

- `agent-generator/SCHEMA_CRAWLER_README.md` - Schema crawler
- `scripts/knowledge-management/README.md` - KB scripts
- `scripts/toolset-management/README.md` - Toolset scripts

---

## 🔍 Search Index

### By Keyword

| Keyword                | Relevant Files                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| **Agent**              | `agent/main.py`, `agent/toolset_manager.py`, `.github/copilot-instructions.md`                   |
| **Component Registry** | `src/components/registry/*.tsx`, `src/app/page.tsx`                                              |
| **Knowledge Base**     | `scripts/knowledge-management/`, `docs/KNOWLEDGE_*.md`                                           |
| **Toolset**            | `agent/toolsets.json`, `scripts/toolset-management/`, `docs/TOOLSET_*.md`                        |
| **Schema Crawler**     | `agent-generator/src/mcp-registry/schema-crawler.ts`, `agent-generator/SCHEMA_CRAWLER_README.md` |
| **ChromaDB**           | `scripts/ingest_chunks.py`, `scripts/start_chroma_server.py`                                     |
| **State Sync**         | `agent/main.py:before_model_modifier`, `src/lib/types.ts`, `src/app/page.tsx`                    |
| **Validation**         | `src/components/registry/*.tsx` (Zod), `scripts/toolset-management/validate-toolsets.js`         |
| **Testing**            | `scripts/knowledge-management/test-kb-mapper.js`, `docs/KB_TEST_FIX.md`                          |
| **Workflows**          | `.github/workflows/`, `docs/TOOLSET_MANAGEMENT.md`                                               |

### By File Extension

| Extension        | Count | Purpose                 | Primary Directories                                            |
| ---------------- | ----- | ----------------------- | -------------------------------------------------------------- |
| `.ts`            | 15+   | TypeScript source       | `agent-generator/src/`, `scripts/knowledge-management/`        |
| `.tsx`           | 12+   | React components        | `src/app/`, `src/components/`                                  |
| `.py`            | 10+   | Python source           | `agent/`, `scripts/`                                           |
| `.md`            | 25+   | Documentation           | `docs/`, root, subdirectories                                  |
| `.json`          | 15+   | Configuration           | `agent/`, root                                                 |
| `.yaml` / `.yml` | 10+   | Workflows, GenAI config | `.github/workflows/`, `genai-toolbox/`                         |
| `.js`            | 8+    | Scripts                 | `scripts/knowledge-management/`, `scripts/toolset-management/` |

---

## 🚀 Development Workflows

### 1. Start Development Environment

```bash
# Terminal 1: Python agent
cd agent
uv run uvicorn main:app --reload --port 8000

# Terminal 2: Next.js frontend
npm run dev
# http://localhost:3000
```

### 2. Run Tests

```bash
# Knowledge Base tests
cd scripts/knowledge-management
npm test

# TypeScript type checking
npx tsc --noEmit

# Python linting
cd agent
uv run ruff check .
```

### 3. Validate Toolsets

```bash
npm run validate:toolsets
# or
node scripts/toolset-management/validate-toolsets.js
```

### 4. Generate Documentation

```bash
npm run docs:all
# Generates:
# - Toolset docs (docs/toolsets/)
# - Relationship diagram (docs/toolsets/toolset-relationships.mmd)
```

### 5. Index Codebase

```bash
# 1. Generate chunks (using pykomodo or similar)
# ... create chunks.jsonl

# 2. Start ChromaDB server (optional)
python scripts/start_chroma_server.py --port 8001

# 3. Ingest chunks
python scripts/ingest_chunks.py \
  --mode persistent \
  --persist-dir ./chroma_data \
  --chunks-file chunks.jsonl \
  --embedding-dim 768
```

---

## 📊 Code Metrics

### Lines of Code Summary

| Category                       | Files    | Approx. LoC | Languages                 |
| ------------------------------ | -------- | ----------- | ------------------------- |
| **Python Agent**               | 5        | ~1,200      | Python                    |
| **TypeScript Agent Generator** | 15+      | ~2,500      | TypeScript                |
| **React Frontend**             | 12+      | ~1,800      | TypeScript/TSX            |
| **Scripts**                    | 20+      | ~3,500      | TypeScript, Python, Shell |
| **Documentation**              | 25+      | ~15,000     | Markdown                  |
| **Configuration**              | 15+      | ~1,500      | JSON, YAML, TOML          |
| **GitHub Actions**             | 8+       | ~1,200      | YAML                      |
| **Total**                      | **100+** | **~26,700** | Multi-language            |

### File Type Distribution

```
TypeScript/TSX:  ~30 files  (~4,300 LoC)
Python:          ~15 files  (~3,000 LoC)
Markdown:        ~25 files  (~15,000 LoC)
JSON/YAML:       ~23 files  (~2,700 LoC)
Shell Scripts:   ~15 files  (~1,700 LoC)
```

---

## 🎯 Porting Checklist

When porting components to another project:

### Pre-Port

- [ ] Identify target components (see [PORTING_GUIDE.md](PORTING_GUIDE.md))
- [ ] Review dependencies in this index
- [ ] Check API contracts section
- [ ] Verify Node.js/Python versions

### During Port

- [ ] Copy relevant directories from directory structure
- [ ] Update file paths in configuration files
- [ ] Update import statements (use path aliases)
- [ ] Customize constants (KNOWLEDGE_BASE, ALLOWED_TYPES, etc.)
- [ ] Install dependencies from package.json / pyproject.toml
- [ ] Run validation scripts

### Post-Port

- [ ] Run tests
- [ ] Verify workflows (if applicable)
- [ ] Generate documentation
- [ ] Create PR with changes

---

## 🔗 External References

- **CopilotKit**: <https://docs.copilotkit.ai/>
- **Google ADK**: <https://ai.google.dev/adk/docs>
- **AG-UI Client**: <https://www.npmjs.com/package/@ag-ui/client>
- **ChromaDB**: <https://docs.trychroma.com/>
- **Zod**: <https://zod.dev/>

---

## 📞 Support

For questions about this codebase:

1. **Search this index** for relevant files
2. **Check documentation** in `docs/` directory
3. **Review component README** in subdirectories
4. **File issue** with appropriate labels

---

**This index is automatically maintainable. Update as codebase evolves.**

**Version**: 1.0.0 | **Generated**: January 3, 2026 | **Maintainer**: ModMe GenUI Team
